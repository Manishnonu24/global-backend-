import { Worker } from "bullmq";
import { getRedisClient } from "../redis";
import prisma from "../prisma";
import crypto from "crypto";
import { reportUnexpectedError } from "../observability/reportError";
import { logger } from "../logger";

let worker = null;
let loggedDisabled = false;

function signPayload(body, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

export function startWebhookWorker() {
  if (worker) return worker; // idempotent guard
  const connection = getRedisClient({ queue: true, name: "webhook-delivery-worker" });
  if (!connection) {
    if (!loggedDisabled) {
      loggedDisabled = true;
      logger.info("[WebhookWorker] Redis is not configured. Worker disabled.");
    }
    return null;
  }

  worker = new Worker(
    "webhook-delivery",
    async (job) => {
      const { subscriptionId, body, eventType, siteId } = job.data;

      const subscription = await prisma.webhookSubscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription || !subscription.isActive) {
        return; // Subscription no longer exists or is inactive
      }

      const signature = signPayload(body, subscription.secret);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const res = await fetch(subscription.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cms-event": eventType,
            "x-cms-signature": signature,
            "x-cms-site-id": siteId,
            "User-Agent": "GlobalBackend-CMS-Webhook/1.0",
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        // On success, track the event and reset failure count
        await prisma.webhookEvent.create({
          data: {
            siteId,
            type: eventType,
            payload: { subscriptionId: subscription.id, url: subscription.url, success: true, error: null },
          },
        });

        if (subscription.failCount > 0) {
          await prisma.webhookSubscription.update({
            where: { id: subscription.id },
            data: { failCount: 0, lastError: null },
          });
        }
      } catch (err) {
        clearTimeout(timeout);
        // Throw error to trigger BullMQ retry
        throw new Error(err.message || "Network error during webhook delivery");
      }
    },
    { connection, concurrency: 10 }
  );

  worker.on("failed", async (job, err) => {
    // Only handle permanent failure (when all attempts are exhausted)
    if (job.attemptsMade >= job.opts.attempts) {
      try {
        const { subscriptionId, eventType, siteId, url } = job.data;
        
        const subscription = await prisma.webhookSubscription.findUnique({
          where: { id: subscriptionId },
        });

        if (!subscription) return;

        const updated = await prisma.webhookSubscription.update({
          where: { id: subscriptionId },
          data: {
            failCount: { increment: 1 },
            lastError: err.message,
          },
        });

        await prisma.webhookEvent.create({
          data: {
            siteId,
            type: eventType,
            payload: { subscriptionId, url: subscription.url, success: false, error: err.message },
          },
        });

        if (updated.failCount >= 10) {
          await prisma.webhookSubscription.update({
            where: { id: subscriptionId },
            data: { isActive: false },
          });
          logger.warn(`[Webhook] Subscription ${subscriptionId} auto-disabled after 10 failures.`);
        }
      } catch (logErr) {
        logger.error({ err: logErr }, "[Webhook] Failed to log permanent failure");
      }
    }
    reportUnexpectedError(err, { jobName: "webhook-delivery", jobId: job?.id, attemptsMade: job?.attemptsMade });
  });

  return worker;
}
