import { Worker } from "bullmq";
import { getRedisClient } from "../redis";
import { emailService } from "../../services/email.service";
import prisma from "../prisma";
import { reportUnexpectedError } from "../observability/reportError";
import { logEmailEvent } from "../emailLog";

let worker = null;
let loggedDisabled = false;

export function startSystemEmailWorker() {
  if (worker) return worker; // idempotent guard
  const connection = getRedisClient({ queue: true, name: "system-email-worker" });
  if (!connection) {
    if (!loggedDisabled) {
      loggedDisabled = true;
      console.info("[SystemEmailWorker] Redis is not configured. Worker disabled.");
    }
    return null;
  }

  worker = new Worker(
    "system-email",
    async (job) => {
      const { siteId, to, subject, text, html } = job.data;
      const resolvedSiteId = siteId || process.env.NEXT_PUBLIC_SITE_ID || "AHP";
      
      const { transporter, fromEmail, provider } = await emailService.getTransporterForSite(resolvedSiteId);

      try {
        await transporter.sendMail({
          from: `"System Alerts" <${fromEmail}>`,
          to,
          subject,
          text,
          html,
        });

        await logEmailEvent({
          siteId: resolvedSiteId,
          category: "system",
          triggerKey: "system_alert",
          toEmail: to,
          fromEmail,
          subject,
          provider,
          status: "sent",
          html: html || text,
          meta: { jobId: job?.id },
        });
      } catch (err) {
        await logEmailEvent({
          siteId: resolvedSiteId,
          category: "system",
          triggerKey: "system_alert",
          toEmail: to,
          fromEmail,
          subject,
          provider,
          status: "failed",
          errorMessage: err.message,
          html: html || text,
          meta: { jobId: job?.id },
        });
        throw err;
      }
    },
    { connection, concurrency: 5 } // Lower concurrency for system emails
  );

  worker.on("failed", (job, err) => {
    reportUnexpectedError(err, { jobName: "system-email", jobId: job?.id });
  });

  return worker;
}
