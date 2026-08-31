import { Queue } from "bullmq";
import { getRedisClient } from "../redis";
import { createDisabledQueue, isQueueAvailable } from "./disabledQueue";

const connection = getRedisClient({ queue: true, name: "db-backup" });

export const backupQueue = connection
  ? new Queue("db-backup", { connection })
  : createDisabledQueue("db-backup");

/**
 * Schedule automated backups using BullMQ's repeatable jobs.
 * Safe to call multiple times — it only registers each job once.
 */
export async function scheduleAutomatedBackups(siteId) {
  if (!isQueueAvailable(backupQueue)) {
    return {
      scheduled: false,
      reason: backupQueue.unavailableReason,
      message: "Automated backups are disabled because Redis is not configured.",
    };
  }

  // Remove any stale repeatable jobs for this site before registering fresh ones
  const repeatable = await backupQueue.getRepeatableJobs();
  for (const job of repeatable) {
    if (job.key.startsWith(`daily-backup:${siteId}`) || job.key.startsWith(`weekly-backup:${siteId}`)) {
      await backupQueue.removeRepeatableByKey(job.key);
    }
  }

  // Daily backup — runs every day at 2:00 AM UTC
  await backupQueue.add(
    `daily-backup:${siteId}`,
    { siteId, type: "daily" },
    {
      repeat: { pattern: "0 2 * * *" }, // cron: every day at 02:00 UTC
      jobId: `daily-backup:${siteId}`,
    }
  );

  // Weekly backup — runs every Sunday at 3:00 AM UTC
  await backupQueue.add(
    `weekly-backup:${siteId}`,
    { siteId, type: "weekly" },
    {
      repeat: { pattern: "0 3 * * 0" }, // cron: every Sunday at 03:00 UTC
      jobId: `weekly-backup:${siteId}`,
    }
  );

  console.log(`✅ [BackupQueue] Scheduled daily & weekly backups for site: ${siteId}`);
}
