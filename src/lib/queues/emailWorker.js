import { Worker } from "bullmq";
import { getRedisClient } from "../redis";
import prisma from "../prisma";
import { emailService } from "../../services/email.service";
import { reportUnexpectedError } from "../observability/reportError";
import { logger } from "../logger";
import { logEmailEvent } from "../emailLog";

let worker = null;
let loggedDisabled = false;

export function startEmailWorker() {
  if (worker) return worker; // idempotent guard
  const connection = getRedisClient({ queue: true, name: "email-campaign-worker" });
  if (!connection) {
    if (!loggedDisabled) {
      loggedDisabled = true;
      logger.info("[EmailWorker] Redis is not configured. Worker disabled.");
    }
    return null;
  }

  worker = new Worker(
    "email-campaign",
    async (job) => {
      const { campaignId, subscriberId, isTest, targetEmail } = job.data;
      
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId }
      });
      if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

      const { transporter, fromEmail } = await emailService.getTransporterForSite(campaign.siteId);

      if (isTest) {
        await transporter.sendMail({
          from: `"Global Backend" <${fromEmail}>`,
          to: targetEmail,
          subject: `[TEST] ${campaign.subject}`,
          html: campaign.body
        });

        await logEmailEvent({
          siteId: campaign.siteId,
          category: "campaign",
          campaignId,
          toEmail: targetEmail,
          fromEmail,
          subject: `[TEST] ${campaign.subject}`,
          status: "sent",
          html: campaign.body,
          meta: { isTest: true },
        });

        return; // Test emails don't create campaignLogs
      }

      const sub = await prisma.subscriber.findUnique({
        where: { id: subscriberId }
      });
      if (!sub) throw new Error(`Subscriber ${subscriberId} not found`);
      if (sub.status !== "active") return;

      const site = await prisma.site.findUnique({
        where: { id: campaign.siteId }
      });
      
      // Prioritize base tracking URL (with localhost fallback in dev mode)
      let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
      if (process.env.NODE_ENV === "development" && baseUrl.includes("ngrok")) {
        baseUrl = "http://localhost:3000";
      }
      baseUrl = baseUrl.replace(/\/$/, "");

      // 1. Pre-create/upsert the CampaignLog to get its ID
      const campaignLog = await prisma.campaignLog.upsert({
        where: {
          campaignId_subscriberId: {
            campaignId,
            subscriberId: sub.id,
          },
        },
        update: {
          status: "sending",
          errorMessage: null,
        },
        create: {
          campaignId,
          subscriberId: sub.id,
          status: "sending",
        },
      });

      const logId = campaignLog.id;

      // 2. Inject tracking pixel at top & bottom + preheader online view link + rewrite links
      let trackedBody = campaign.body || "";
      const trackingPixelHtml = `<img src="${baseUrl}/api/crm/track/open?logId=${logId}" width="1" height="1" style="display:none !important;" alt="" />`;
      
      const preheaderLink = `<div style="font-size:11px; font-family: sans-serif; color:#64748b; padding:8px 12px; background-color:#f8fafc; border-radius:6px; margin-bottom:14px; text-align:center;">
        Having trouble viewing this email? <a href="${baseUrl}/api/crm/track/click?logId=${logId}&url=${encodeURIComponent(baseUrl)}" target="_blank" style="color:#0f7c85; font-weight:bold; text-decoration:underline;">Click here to view online</a>
      </div>`;

      trackedBody = `${trackingPixelHtml}${preheaderLink}${trackedBody}${trackingPixelHtml}`;

      // Match href="...", href='...', and support spaces around '=': href  =  "..."
      trackedBody = trackedBody.replace(/href\s*=\s*["']([^"']+)["']/gi, (match, url) => {
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
          if (url.includes("/api/crm/track/")) return match;
          const absoluteUrl = url.startsWith("/") ? `${baseUrl}${url}` : url;
          const trackingClickUrl = `${baseUrl}/api/crm/track/click?logId=${logId}&url=${encodeURIComponent(absoluteUrl)}`;
          return `href="${trackingClickUrl}"`;
        }
        return match;
      });

      try {
        await transporter.sendMail({
          from: `"Global Backend" <${fromEmail}>`,
          to: sub.email,
          subject: campaign.subject,
          html: trackedBody
        });

        await prisma.campaignLog.update({
          where: { id: logId },
          data: {
            status: "sent",
            sentAt: new Date(),
          },
        });

        await logEmailEvent({
          siteId: campaign.siteId,
          category: "campaign",
          campaignId,
          toEmail: sub.email,
          toName: sub.name || null,
          fromEmail,
          subject: campaign.subject,
          status: "sent",
          html: campaign.body,
          meta: { subscriberId: sub.id, logId },
        });
      } catch (err) {
        await prisma.campaignLog.update({
          where: { id: logId },
          data: {
            status: "failed",
            errorMessage: err.message,
          },
        });

        await logEmailEvent({
          siteId: campaign.siteId,
          category: "campaign",
          campaignId,
          toEmail: sub.email,
          toName: sub.name || null,
          fromEmail,
          subject: campaign.subject,
          status: "failed",
          errorMessage: err.message,
          html: campaign.body,
          meta: { subscriberId: sub.id, logId },
        });

        throw err; // Ensure BullMQ registers failure
      }
    },
    { connection, concurrency: 10 }
  );

  worker.on("completed", async (job) => {
    try {
      const { campaignId, isTest } = job.data;
      if (isTest) return; // No status updates for test emails
      
      // Check if all active subscribers for this campaign have a log entry
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
        include: { list: { include: { subscribers: { include: { subscriber: true } } } } }
      });
      
      if (!campaign || !campaign.list) return;
      
      const activeMembers = campaign.list.subscribers.filter(m => m.subscriber.status === "active");
      const totalActive = activeMembers.length;
      
      const logCount = await prisma.campaignLog.count({
        where: { campaignId }
      });

      if (logCount >= totalActive && campaign.status !== "sent") {
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { status: "sent", sentAt: new Date() }
        });
      }
    } catch (err) {
      logger.error({ err, jobId: job.id }, `[EmailWorker] Error on job completed`);
    }
  });

  worker.on("failed", (job, err) => {
    reportUnexpectedError(err, { jobName: "email-campaign", jobId: job?.id });
  });

  return worker;
}
