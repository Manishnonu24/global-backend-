import prisma from "@/lib/prisma";
import { notifyMultiple } from "@/lib/novu-triggers";
import { NOVU_WORKFLOWS, novuSubscriberId } from "@/lib/novu";
import { isQueueAvailable } from "@/lib/queues/disabledQueue";

export const campaignService = {
  async getTemplates(siteId) {
    return prisma.emailTemplate.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" }
    });
  },

  async createTemplate(siteId, data) {
    const { name, triggerKey, subject, htmlContent, designJson, isActive = true } = data;
    
    // Single Active Guard: If setting a triggerKey as active, deactivate other templates for this triggerKey
    if (triggerKey && isActive) {
      await prisma.emailTemplate.updateMany({
        where: { siteId, triggerKey, isActive: true },
        data: { isActive: false },
      });
    }

    return prisma.emailTemplate.create({
      data: {
        siteId,
        name,
        triggerKey: triggerKey || null,
        subject,
        htmlContent,
        designJson,
        isActive: Boolean(isActive),
      }
    });
  },

  async updateTemplate(siteId, id, data) {
    const { name, triggerKey, subject, htmlContent, designJson, isActive } = data;
    const existing = await prisma.emailTemplate.findFirst({ where: { id, siteId } });
    if (!existing) throw new Error("Template not found");

    const newTriggerKey = triggerKey !== undefined ? triggerKey : existing.triggerKey;
    const newIsActive = isActive !== undefined ? Boolean(isActive) : existing.isActive;

    // Single Active Guard: If setting a triggerKey as active, deactivate other templates for this triggerKey
    if (newTriggerKey && newIsActive) {
      await prisma.emailTemplate.updateMany({
        where: {
          siteId,
          triggerKey: newTriggerKey,
          isActive: true,
          id: { not: id },
        },
        data: { isActive: false },
      });
    }

    return prisma.emailTemplate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        triggerKey: triggerKey !== undefined ? (triggerKey || null) : existing.triggerKey,
        subject: subject !== undefined ? subject : existing.subject,
        htmlContent: htmlContent !== undefined ? htmlContent : existing.htmlContent,
        designJson: designJson !== undefined ? designJson : existing.designJson,
        isActive: newIsActive,
      }
    });
  },

  async deleteTemplate(siteId, id) {
    // Verify ownership before deleting
    const existing = await prisma.emailTemplate.findFirst({ where: { id, siteId } });
    if (!existing) throw new Error("Template not found");
    return prisma.emailTemplate.delete({ where: { id } });
  },

  async getCampaigns(siteId) {
    return prisma.emailCampaign.findMany({
      where: { siteId },
      include: {
        list: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async createCampaign(siteId, data) {
    const { name, subject, body, listId, scheduledAt } = data;
    return prisma.emailCampaign.create({
      data: {
        siteId,
        name,
        subject,
        body,
        // Allow null listId for draft campaigns not yet assigned to a list
        listId: listId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? "scheduled" : "draft",
      }
    });
  },

  async deleteCampaign(siteId, id) {
    return prisma.emailCampaign.delete({
      where: { id, siteId }
    });
  },

  async sendTestEmail(siteId, campaignId, targetEmail) {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, siteId }
    });
    if (!campaign) throw new Error("Campaign not found");

    const { emailQueue } = await import("../lib/queues/emailQueue.js");
    if (!isQueueAvailable(emailQueue)) {
      return {
        success: false,
        queued: false,
        unavailable: true,
        reason: emailQueue.unavailableReason,
        message: "Email queue is unavailable because Redis is not configured.",
      };
    }

    try {
      await emailQueue.add(
        "send-campaign-email",
        { campaignId, isTest: true, targetEmail },
        { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
      );
    } catch (error) {
      return {
        success: false,
        queued: false,
        unavailable: true,
        reason: "queue_error",
        message: error.message,
      };
    }

    return { success: true };
  },

  async executeCampaign(siteId, campaignId) {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, siteId },
      include: {
        list: {
          include: {
            subscribers: {
              include: {
                subscriber: true
              }
            }
          }
        }
      }
    });
    if (!campaign) throw new Error("Campaign not found");
    if (!campaign.list) throw new Error("Campaign list not selected or empty");

    const activeMembers = campaign.list.subscribers.filter((m) => m.subscriber.status === "active");

    const { emailQueue } = await import("../lib/queues/emailQueue.js");
    if (!isQueueAvailable(emailQueue)) {
      // Fallback: Direct asynchronous send when Redis/BullMQ queue is unavailable
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "sending", sentAt: new Date() }
      });

      (async () => {
        try {
          const { emailService } = await import("./email.service.js");
          const { logEmailEvent } = await import("@/lib/emailLog.js");
          const { transporter, fromEmail } = await emailService.getTransporterForSite(siteId);
          let successCount = 0;

          for (const member of activeMembers) {
            const sub = member.subscriber;
            try {
              const log = await prisma.campaignLog.upsert({
                where: { campaignId_subscriberId: { campaignId, subscriberId: sub.id } },
                update: { status: "sending", errorMessage: null },
                create: { campaignId, subscriberId: sub.id, status: "sending" },
              });

              await transporter.sendMail({
                from: fromEmail,
                to: sub.email,
                subject: campaign.subject,
                html: campaign.body,
              });

              await prisma.campaignLog.update({
                where: { id: log.id },
                data: { status: "sent", sentAt: new Date() },
              });

              await logEmailEvent({
                siteId,
                category: "campaign",
                campaignId,
                toEmail: sub.email,
                toName: sub.name || null,
                fromEmail,
                subject: campaign.subject,
                status: "sent",
                html: campaign.body,
                meta: { subscriberId: sub.id, logId: log.id },
              });

              successCount++;
            } catch (err) {
              await prisma.campaignLog.update({
                where: { campaignId_subscriberId: { campaignId, subscriberId: sub.id } },
                data: { status: "failed", errorMessage: err.message },
              }).catch(() => {});

              await logEmailEvent({
                siteId,
                category: "campaign",
                campaignId,
                toEmail: sub.email,
                toName: sub.name || null,
                fromEmail,
                subject: campaign.subject,
                status: "failed",
                errorMessage: err.message,
                html: campaign.body,
                meta: { subscriberId: sub.id },
              });
            }
          }

          await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: { status: successCount > 0 ? "sent" : "failed" }
          });
        } catch (err) {
          console.error("[CampaignService] Direct send fallback error:", err);
          await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: { status: "failed" }
          });
        }
      })();

      return {
        success: true,
        queued: activeMembers.length,
        fallback: true,
        message: `Dispatched campaign directly to ${activeMembers.length} active subscriber(s).`,
      };
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: "sending" }
    });

    try {
      await emailQueue.addBulk(
        activeMembers.map((m) => ({
          name: "send-campaign-email",
          data: { campaignId, subscriberId: m.subscriber.id },
          opts: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
        }))
      );
    } catch (error) {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: campaign.scheduledAt ? "scheduled" : "draft" }
      });
      return {
        success: false,
        queued: 0,
        unavailable: true,
        reason: "queue_error",
        message: error.message,
      };
    }

    // Optional: also trigger via Novu email-campaign workflow.
    // This sends through your Novu email provider in addition to the BullMQ path.
    // Set NOVU_ENABLE_CAMPAIGN_TRIGGER=true in .env to activate.
    if (process.env.NOVU_ENABLE_CAMPAIGN_TRIGGER === "true") {
      try {
        const recipients = activeMembers
          .filter((m) => m.subscriber.status === "active")
          .map((m) => ({
            subscriberId: novuSubscriberId(campaign.siteId, m.subscriber.id),
            email: m.subscriber.email,
            firstName: (m.subscriber.name || "").split(" ")[0] || "",
            lastName: (m.subscriber.name || "").split(" ").slice(1).join(" ") || "",
          }));

        if (recipients.length > 0) {
          await notifyMultiple(
            recipients,
            NOVU_WORKFLOWS.EMAIL_CAMPAIGN,
            {
              campaignName: campaign.name,
              subject: campaign.subject,
              body: campaign.body,
              campaignId: campaign.id,
            },
            { siteId: campaign.siteId }
          );
        }
      } catch (novuErr) {
        // Never let Novu failure block campaign delivery via BullMQ
        console.error("[campaign.service] Novu campaign trigger failed:", novuErr?.message);
      }
    }

    return { success: true, queued: activeMembers.length };
  },

  async updateCampaign(siteId, id, data) {
    const existing = await prisma.emailCampaign.findFirst({ where: { id, siteId } });
    if (!existing) throw new Error("Campaign not found");

    const allowedFields = ["name", "subject", "body", "listId", "scheduledAt", "status"];
    const updateData = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        if (key === "scheduledAt") {
          updateData[key] = data[key] ? new Date(data[key]) : null;
        } else if (key === "listId") {
          updateData[key] = data[key] || null;
        } else {
          updateData[key] = data[key];
        }
      }
    }
    return prisma.emailCampaign.update({ where: { id }, data: updateData, include: { list: { select: { name: true } } } });
  },

  async getCampaignAnalytics(siteId, id) {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id, siteId },
      include: {
        list: { select: { name: true, _count: { select: { subscribers: true } } } },
        logs: {
          include: { subscriber: { select: { email: true, name: true } } },
          orderBy: { sentAt: "desc" },
          take: 50,
        },
      },
    });
    if (!campaign) throw new Error("Campaign not found");

    const logs = campaign.logs;
    const totalLogs = logs.length;
    const sent = logs.filter(l => ["sent", "opened", "clicked"].includes(l.status)).length;
    const failed = logs.filter(l => l.status === "failed").length;
    const opened = logs.filter(l => l.openedAt !== null || l.status === "opened" || l.status === "clicked").length;
    const clicked = logs.filter(l => l.clickedAt !== null || l.status === "clicked").length;

    const delivered = Math.max(sent, totalLogs - failed);
    const deliveryBase = delivered > 0 ? delivered : totalLogs;

    return {
      campaign,
      stats: {
        totalLogs,
        sent: delivered,
        failed,
        opened,
        clicked,
        deliveryRate: totalLogs > 0 ? Math.round((delivered / totalLogs) * 100) : 0,
        openRate: deliveryBase > 0 ? Math.round((opened / deliveryBase) * 100) : 0,
        clickRate: deliveryBase > 0 ? Math.round((clicked / deliveryBase) * 100) : 0,
      },
      recentLogs: logs.slice(0, 20),
    };
  },

  async duplicateCampaign(siteId, id) {
    const existing = await prisma.emailCampaign.findFirst({ where: { id, siteId } });
    if (!existing) throw new Error("Campaign not found");
    return prisma.emailCampaign.create({
      data: {
        siteId,
        name: `Copy of ${existing.name}`,
        subject: existing.subject,
        body: existing.body,
        listId: existing.listId,
        status: "draft",
      },
      include: { list: { select: { name: true } } },
    });
  },
};
