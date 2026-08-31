import { PHASE_PRODUCTION_BUILD } from "next/constants";
import * as Sentry from '@sentry/nextjs';

/**
 * instrumentation.js
 *
 * NOTE ON DEPLOYMENT: This app is designed to run as ONE persistent Next.js
 * process (`next start`), not serverless functions. Both web serving and 
 * background email job processing happen in this same process, started here.
 * Optional workers require REDIS_URL and their integration-specific config.
 *
 * Next.js runs this file on server startup (both dev and prod cold 
 * starts). Route sync should run here on real runtime cold starts, but 
 * NOT during `next build` — the build's static-generation phase also 
 * bootstraps this file, and scripts/generate-routes.js already handles 
 * the build-time sync explicitly. Running both concurrently causes 
 * MySQL lock-wait-timeout collisions on the Page table.
 */
let workerStarted = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    require('../sentry.server.config.js');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    require('../sentry.edge.config.js');
  }

  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD
  ) {
    const initApp = async () => {
      const { logger } = await import("./lib/logger.js");

      try {
        const { ensureApplicationState } = await import("./lib/bootstrap/ensureApplicationState.js");
        const result = await ensureApplicationState();
        logger.info({ result }, "[Startup] Application state ensured.");
      } catch (err) {
        logger.error({ err }, "[Startup] Failed to ensure application state");
      }

      if (!workerStarted) {
        workerStarted = true;
        if (process.env.DISABLE_BULL_WORKERS !== "true") {
          try {
            const { getRedisStatus } = await import("./lib/redis.js");
            const redisStatus = await getRedisStatus(1000);
            if (redisStatus.status !== "ok") {
              const reason = redisStatus.status === "disabled"
                ? "not configured"
                : `unavailable (${redisStatus.message || "health check failed"})`;
              logger.info(`[Startup] Redis is ${reason}. Background queues are disabled.`);
              return;
            }
            const { startEmailWorker } = await import("./lib/queues/emailWorker.js");
            if (startEmailWorker()) logger.info("[Startup] Email campaign worker started in-process.");
            
            const { startWebhookWorker } = await import("./lib/queues/webhookWorker.js");
            if (startWebhookWorker()) logger.info("[Startup] Webhook worker started in-process.");
            
            const { startSystemEmailWorker } = await import("./lib/queues/systemEmailWorker.js");
            if (startSystemEmailWorker()) logger.info("[Startup] System email worker started in-process.");

            const { isS3Configured } = await import("../utils/s3Utility.js");
            if (isS3Configured()) {
              const { startBackupWorker } = await import("./lib/queues/backupWorker.js");
              if (startBackupWorker()) logger.info("[Startup] Backup worker started in-process.");
            } else {
              if (process.env.NODE_ENV === "production" || process.env.FORCE_S3 === "true") {
                logger.warn("[Startup WARNING] S3 is NOT configured in production! File uploads will fail fast to prevent ephemeral data loss.");
              } else {
                logger.info("[Startup] S3 is not configured. Local disk storage enabled for development fallback.");
              }
            }

            const { startSearchWorker } = await import("./lib/queues/searchWorker.js");
            if (startSearchWorker()) logger.info("[Startup] Search worker started in-process.");

            // Schedule automated daily + weekly backups for all active sites
            if (isS3Configured()) {
              const { scheduleAutomatedBackups } = await import("./lib/queues/backupQueue.js");
              const { default: prisma } = await import("./lib/prisma.js");
              const sites = await prisma.site.findMany({ select: { id: true } });
              for (const site of sites) {
                await scheduleAutomatedBackups(site.id);
              }
              logger.info(`[Startup] Automated backups scheduled for ${sites.length} site(s).`);
            }
          } catch (err) {
            logger.error({ err }, "[Startup] Failed to start background workers");
          }
        }
      }
    };

    if (process.env.NODE_ENV === "development") {
      // Run asynchronously in development so dev server responds immediately to incoming requests
      initApp().catch((err) => console.error("[Startup] Background init error:", err));
    } else {
      await initApp();
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
