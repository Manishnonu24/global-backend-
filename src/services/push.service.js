import prisma from "@/lib/prisma";
import { AppError } from "@/core/errors";
import { getNovuClient, NOVU_WORKFLOWS } from "@/lib/novu";
import { toTopicKey } from "@/lib/novu-triggers";

export const pushService = {
  async getNotifications(siteId) {
    return prisma.pushNotification.findMany({
      where: { siteId },
      include: {
        emailCampaign: true
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async getNotification(siteId, id) {
    return prisma.pushNotification.findFirst({
      where: { id, siteId },
      include: {
        emailCampaign: true
      }
    });
  },

  async createNotification(siteId, data) {
    const {
      title,
      message,
      url,
      iconUrl,
      imageUrl,
      segment = "Subscribed Users",
      filters,
      scheduledAt,
      isRecurring = false,
      recurringRule,
      emailCampaignId,
      sendToWebsite = true,
      sendToDevice = true
    } = data;

    let status = "draft";
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      status = "scheduled";
    }

    return prisma.pushNotification.create({
      data: {
        siteId,
        title,
        message,
        url: url || null,
        iconUrl: iconUrl || null,
        imageUrl: imageUrl || null,
        segment,
        filters: filters ? JSON.stringify(filters) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isRecurring,
        recurringRule: recurringRule ? JSON.stringify(recurringRule) : null,
        sendToWebsite,
        sendToDevice,
        status,
        emailCampaignId: emailCampaignId || null
      },
      include: {
        emailCampaign: true
      }
    });
  },

  async updateNotification(siteId, id, data) {
    const existing = await prisma.pushNotification.findFirst({
      where: { id, siteId }
    });
    if (!existing) throw new Error("Notification not found");
    if (existing.status === "sent") throw new Error("Cannot edit a sent notification");

    const {
      title,
      message,
      url,
      iconUrl,
      imageUrl,
      segment,
      filters,
      scheduledAt,
      isRecurring,
      recurringRule,
      emailCampaignId,
      sendToWebsite,
      sendToDevice
    } = data;

    let status = existing.status;
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      status = "scheduled";
    } else if (status === "scheduled" && !scheduledAt) {
      status = "draft";
    }

    return prisma.pushNotification.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        message: message ?? existing.message,
        url: url !== undefined ? (url || null) : existing.url,
        iconUrl: iconUrl !== undefined ? (iconUrl || null) : existing.iconUrl,
        imageUrl: imageUrl !== undefined ? (imageUrl || null) : existing.imageUrl,
        segment: segment ?? existing.segment,
        filters: filters !== undefined ? (filters ? JSON.stringify(filters) : null) : existing.filters,
        scheduledAt: scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : existing.scheduledAt,
        isRecurring: isRecurring !== undefined ? isRecurring : existing.isRecurring,
        recurringRule: recurringRule !== undefined ? (recurringRule ? JSON.stringify(recurringRule) : null) : existing.recurringRule,
        sendToWebsite: sendToWebsite !== undefined ? sendToWebsite : existing.sendToWebsite,
        sendToDevice: sendToDevice !== undefined ? sendToDevice : existing.sendToDevice,
        status,
        emailCampaignId: emailCampaignId !== undefined ? (emailCampaignId || null) : existing.emailCampaignId
      },
      include: {
        emailCampaign: true
      }
    });
  },

  async duplicateNotification(siteId, id) {
    const original = await prisma.pushNotification.findFirst({
      where: { id, siteId }
    });
    if (!original) throw new Error("Notification not found");

    return prisma.pushNotification.create({
      data: {
        siteId,
        title: `${original.title} (Copy)`,
        message: original.message,
        url: original.url,
        iconUrl: original.iconUrl,
        imageUrl: original.imageUrl,
        segment: original.segment,
        filters: original.filters,
        isRecurring: original.isRecurring,
        recurringRule: original.recurringRule,
        sendToWebsite: original.sendToWebsite,
        sendToDevice: original.sendToDevice,
        status: "draft",
        emailCampaignId: original.emailCampaignId
      },
      include: {
        emailCampaign: true
      }
    });
  },

  async deleteNotification(siteId, id) {
    return prisma.pushNotification.delete({
      where: { id, siteId }
    });
  },

  async getNotificationStats(siteId, notificationId) {
    const notification = await prisma.pushNotification.findFirst({
      where: { id: notificationId, siteId }
    });
    if (!notification) throw new Error("Notification not found");
    if (!notification.oneSignalId) {
      return {
        sentCount: notification.sentCount,
        deliveredCount: notification.deliveredCount,
        clickedCount: notification.clickedCount,
        failedCount: notification.failedCount
      };
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { emailSettings: true }
    });
    const emailSettings = settings?.emailSettings || {};
    const novuApiKey = emailSettings.novuApiKey || process.env.NOVU_API_KEY;
    if (!novuApiKey) {
      return {
        sentCount: notification.sentCount,
        deliveredCount: notification.deliveredCount,
        clickedCount: notification.clickedCount,
        failedCount: notification.failedCount
      };
    }

    try {
      const response = await fetch(
        `https://api.novu.co/v1/messages?transactionId=${notification.oneSignalId}`,
        {
          headers: {
            "Authorization": `ApiKey ${novuApiKey}`
          }
        }
      );
      const data = await response.json();
      if (response.ok && data.data && Array.isArray(data.data)) {
        const messages = data.data;
        const novuClicks = messages.filter(
          m => m.status === 'clicked' || m.status === 'opened' || m.status === 'read' || m.read === true || m.seen === true || m.readAt || m.seenAt || m.clickedAt
        ).length;
        const clickedCount = Math.max(notification.clickedCount || 0, novuClicks);
        const sentCount = Math.max(notification.sentCount || 1, messages.length);
        const failedCount = messages.filter(m => m.status === 'failed').length;
        const deliveredCount = Math.max(0, sentCount - failedCount);

        await prisma.pushNotification.update({
          where: { id: notificationId },
          data: { sentCount, deliveredCount, clickedCount, failedCount }
        });

        return { sentCount, deliveredCount, clickedCount, failedCount };
      }
    } catch (e) {
      console.error("Failed to fetch Novu stats:", e);
    }

    return {
      sentCount: notification.sentCount,
      deliveredCount: notification.deliveredCount,
      clickedCount: notification.clickedCount,
      failedCount: notification.failedCount
    };
  },

  async getAnalytics(siteId) {
    // Auto-sync stats for sent notifications so analytics are always up-to-date
    try {
      const sentNotifs = await prisma.pushNotification.findMany({
        where: { siteId, status: "sent" },
        select: { id: true },
        take: 10
      });
      for (const n of sentNotifs) {
        await this.getNotificationStats(siteId, n.id).catch(() => {});
      }
    } catch (e) {
      // ignore sync errors
    }

    const notifications = await prisma.pushNotification.findMany({
      where: { siteId },
      select: {
        id: true,
        title: true,
        status: true,
        sentCount: true,
        deliveredCount: true,
        clickedCount: true,
        failedCount: true,
        sentAt: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const totals = notifications.reduce(
      (acc, n) => {
        acc.totalSent += n.sentCount;
        acc.totalDelivered += n.deliveredCount;
        acc.totalClicked += n.clickedCount;
        acc.totalFailed += n.failedCount;
        return acc;
      },
      { totalSent: 0, totalDelivered: 0, totalClicked: 0, totalFailed: 0 }
    );

    const ctr = totals.totalSent > 0
      ? ((totals.totalClicked / totals.totalSent) * 100).toFixed(1)
      : "0.0";

    const sentNotifications = notifications.filter(n => n.status === "sent");
    const topCampaigns = [...sentNotifications]
      .sort((a, b) => b.clickedCount - a.clickedCount)
      .slice(0, 5);

    return {
      totals: { ...totals, ctr },
      topCampaigns,
      recent: notifications.slice(0, 10)
    };
  },

  async sendPushNotification(siteId, notificationId) {
    const notification = await prisma.pushNotification.findFirst({
      where: { id: notificationId, siteId }
    });
    if (!notification) throw new Error("Notification not found");

    // If sendToDevice is disabled, bypass Novu
    if (!notification.sendToDevice) {
      const isFuture = notification.scheduledAt && new Date(notification.scheduledAt) > new Date();
      await prisma.pushNotification.update({
        where: { id: notificationId },
        data: {
          status: isFuture ? "scheduled" : "sent",
          sentAt: isFuture ? null : new Date()
        }
      });
      return {
        success: true,
        message: isFuture ? "Scheduled for website notifications" : "Published to website notifications",
        recipients: 0
      };
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { emailSettings: true }
    });

    const emailSettings = settings?.emailSettings || {};
    // Resolve workflow ID (per-site override → env constant → NOVU_WORKFLOWS default)
    const novuWorkflowId =
      emailSettings.novuWorkflowId ||
      process.env.NOVU_WORKFLOW_ID ||
      NOVU_WORKFLOWS.PUSH_NOTIFICATION;

    // Validate Novu is configured
    const novuApiKey = emailSettings.novuApiKey || process.env.NOVU_API_KEY;
    if (!novuApiKey) {
      console.warn("[push.service] Novu API key not configured — skipping device push, marking locally.");
      const isFuture = notification.scheduledAt && new Date(notification.scheduledAt) > new Date();
      await prisma.pushNotification.update({
        where: { id: notificationId },
        data: {
          status: isFuture ? "scheduled" : "sent",
          sentAt: isFuture ? null : new Date()
        }
      });
      return {
        success: true,
        warning: "Announcements posted to website, but device push was skipped (Novu API key missing)",
        recipients: 0
      };
    }

    // Update status to sending
    await prisma.pushNotification.update({
      where: { id: notificationId },
      data: { status: "sending" }
    });

    try {
      // Use the centralized Novu client (reads per-site key override automatically)
      const novu = await getNovuClient(siteId);

      // Target topic: slugify segment name using shared helper
      const topicKey = toTopicKey(notification.segment || "Subscribed Users");

      const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const targetUrl = notification.url || "/";
      const trackingUrl = `${appUrl}/api/crm/track/click?pushId=${notification.id}&url=${encodeURIComponent(targetUrl)}`;

      const payload = {
        title: notification.title,
        message: notification.message,
        url: trackingUrl,
      };

      if (notification.iconUrl)  payload.iconUrl  = notification.iconUrl;
      if (notification.imageUrl) payload.imageUrl = notification.imageUrl;

      // Candidate workflow IDs to try in order (prioritize slugs with hyphens over raw keys)
      const isSlug = novuWorkflowId && novuWorkflowId.includes("-");
      const candidates = isSlug
        ? Array.from(new Set([novuWorkflowId, "push-notificatuion", "push-notification", "onboarding-demo-workflow"]))
        : Array.from(new Set(["push-notificatuion", "push-notification", novuWorkflowId, "onboarding-demo-workflow"])).filter(Boolean);

      let triggerResult = null;
      let lastError = null;

      for (const wId of candidates) {
        try {
          triggerResult = await novu.trigger({
            workflowId: wId,
            to: [{ type: "Topic", topicKey }],
            payload
          });
          if (triggerResult) break;
        } catch (err) {
          lastError = err;
          const errMsg = err.body ? (typeof err.body === 'string' ? err.body : JSON.stringify(err.body)) : err.message;
          if (errMsg.includes("workflow_not_found")) {
            console.warn(`[push.service] Workflow '${wId}' not found in Novu, trying next candidate...`);
            continue;
          }
          throw err;
        }
      }

      if (!triggerResult && lastError) {
        throw lastError;
      }

      const transactionId = triggerResult?.data?.transactionId || triggerResult?.data?.eventId || "novu-triggered";

      await prisma.pushNotification.update({
        where: { id: notificationId },
        data: {
          status: notification.scheduledAt && new Date(notification.scheduledAt) > new Date()
            ? "scheduled"
            : "sent",
          oneSignalId: transactionId,
          sentCount: 1,
          sentAt: new Date()
        }
      });

      return { success: true, recipients: 1, oneSignalId: transactionId };
    } catch (error) {
      await prisma.pushNotification.update({
        where: { id: notificationId },
        data: { status: "failed" }
      });
      
      let cleanMessage = error.message;
      if (error.body) {
        try {
          const parsed = JSON.parse(error.body);
          if (parsed.message) {
            cleanMessage = `Novu API error: ${parsed.message}`;
          }
        } catch {}
      }
      throw new AppError(cleanMessage, "NOVU_API_ERROR", 400);
    }
  }
};
