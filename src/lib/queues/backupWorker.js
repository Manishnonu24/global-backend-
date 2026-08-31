import { Worker } from "bullmq";
import { getRedisClient } from "../redis";
import { backupService } from "../../services/backup.service";
import { getS3Client, isS3Configured } from "../../../utils/s3Utility";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import prisma from "../prisma";
import { reportUnexpectedError } from "../observability/reportError";
import { logger } from "../logger";

let worker = null;
let loggedDisabled = false;

/**
 * Uploads a JSON backup to the configured S3/Backblaze B2 bucket.
 * Path: backups/<siteId>/<type>/<YYYY-MM-DD_HH-mm-ss>.json
 */
async function uploadBackupToS3(siteId, type, backupData) {
  const bucket = process.env.S3_BUCKET || process.env.BUCKET || process.env.AWS_BUCKET_NAME;
  const endpoint = process.env.S3_ENDPOINT || process.env.ENDPOINT;

  if (!bucket) throw new Error("S3_BUCKET is not configured in environment variables.");

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19); // e.g. 2026-07-20_02-00-00
  const key = `backups/${siteId}/${type}/${timestamp}.json`;

  const json = JSON.stringify(backupData, null, 2);
  const body = Buffer.from(json, "utf-8");

  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
    })
  );

  // Build the public URL for the uploaded file
  const region = process.env.S3_REGION || process.env.REGION || "us-east-1";
  const fileUrl = endpoint
    ? `${endpoint}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { key, fileUrl, sizeBytes: body.length };
}

export function startBackupWorker() {
  if (worker) return worker; // idempotent guard
  const connection = getRedisClient({ queue: true, name: "db-backup-worker" });
  if (!connection || !isS3Configured()) {
    if (!loggedDisabled) {
      loggedDisabled = true;
      logger.info("[BackupWorker] Redis or S3 is not configured. Worker disabled.");
    }
    return null;
  }

  worker = new Worker(
    "db-backup",
    async (job) => {
      const { siteId, type } = job.data;
      console.log(`🔄 [BackupWorker] Starting ${type} backup for site: ${siteId}`);

      // Dedupe automated backups to prevent duplicate runs on restarts
      if (type === "daily" || type === "weekly") {
        const lastTs = await backupService.getLastBackupTimestamp(siteId, type);
        if (lastTs) {
          const hoursSinceLast = (Date.now() - new Date(lastTs).getTime()) / (1000 * 60 * 60);
          
          const isSkippingDaily = type === "daily" && hoursSinceLast < 20;
          const isSkippingWeekly = type === "weekly" && hoursSinceLast < (24 * 6);
          
          if (isSkippingDaily || isSkippingWeekly) {
            console.log(`⏭️ [BackupWorker] Skipping ${type} backup for site ${siteId} — one already completed at ${lastTs}`);
            return { skipped: true, reason: "Recently completed", lastBackupAt: lastTs };
          }
        }
      }

      // 1. Create the Prisma snapshot
      const backupData = await backupService.createBackup(siteId);

      // 2. Upload JSON to S3 / Backblaze B2
      const { key, fileUrl, sizeBytes } = await uploadBackupToS3(siteId, type, backupData);
      console.log(`📦 [BackupWorker] Uploaded to S3: ${key}`);

      // 3. Log the backup to history (stores the S3 URL for download)
      const backupId = await backupService.logBackupHistory(siteId, type, sizeBytes, fileUrl);

      // 4. Create a dashboard notification alert
      try {
        await prisma.notificationAlert.create({
          data: {
            siteId,
            title: `Automated ${type === "weekly" ? "Weekly" : "Daily"} Backup Completed`,
            message: `Backup saved to S3 — Size: ${(sizeBytes / 1024).toFixed(1)} KB — ID: ${backupId}`,
            type: "BLOG_ALERT",
          },
        });
      } catch (notifErr) {
        logger.error({ err: notifErr }, "[BackupWorker] Failed to create notification alert");
      }

      logger.info(`✅ [BackupWorker] ${type} backup complete — ID: ${backupId} | URL: ${fileUrl}`);
      return { backupId, sizeBytes, fileUrl };
    },
    { connection, concurrency: 1 }
  );

  worker.on("completed", (job, result) => {
    logger.info(`[BackupWorker] Job ${job.id} done. File: ${result.fileUrl}`);
  });

  worker.on("failed", (job, err) => {
    reportUnexpectedError(err, { jobName: "db-backup", jobId: job?.id });
  });

  return worker;
}

