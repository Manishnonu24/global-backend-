import prisma from "@/lib/prisma";
import { emailService } from "./email.service";
import { BaseService } from "@/core/service";

export class NotificationService extends BaseService {
  constructor() {
    super({ modelName: "globalsettings" });
  }

  async getNotificationConfig(siteId) {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { notifications: true }
    });
    return settings?.notifications || {
      newLead: { email: true, dashboard: true },
      failedForm: { email: true, dashboard: true },
      blogAlert: { email: true, dashboard: true }
    };
  }

  async updateNotificationConfig(siteId, config) {
    return prisma.globalSettings.upsert({
      where: { siteId },
      update: { notifications: config },
      create: { siteId, notifications: config }
    });
  }

  async notifyNewLead(siteId, lead) {
    const config = await this.getNotificationConfig(siteId);
    
    // 1. Email Channel
    if (config.newLead?.email) {
      if (process.env.NODE_ENV === "development") {
        console.log("ℹ️ [NotificationService] Skipped new lead email notification in development mode.");
      } else {
        const settings = await prisma.globalSettings.findUnique({
          where: { siteId },
          select: { emailSettings: true }
        });
        const adminEmail = settings?.emailSettings?.recipientOverride || settings?.emailSettings?.adminAlerts?.email || settings?.emailSettings?.username;
        if (adminEmail && !adminEmail.includes("resend.dev") && !adminEmail.includes("example.com")) {
          try {
            const { systemEmailQueue } = await import("../lib/queues/systemEmailQueue.js");
            await systemEmailQueue.add(
              "new-lead-alert",
              {
                siteId,
                to: adminEmail,
                subject: `[Lead Alert] New Lead Captured: ${lead.name}`,
                text: `A new lead has been recorded on the system:\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone || "N/A"}\nInterest: ${lead.serviceInterest || "N/A"}\n\nView in Lead CRM dashboard.`
              },
              { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
            );
          } catch (e) {
            console.error("Failed to queue new lead email alert:", e);
          }
        } else {
          console.log(`ℹ️ [NotificationService] Skipped new lead email to placeholder address: ${adminEmail}`);
        }
      }
    }

    // 2. Dashboard Channel
    if (config.newLead?.dashboard) {
      try {
        await prisma.notificationAlert.create({
          data: {
            siteId,
            title: "New Lead Captured",
            message: `Lead name: ${lead.name} (${lead.email}). Interest: ${lead.serviceInterest || "N/A"}`,
            type: "NEW_LEAD"
          }
        });
      } catch (e) {
        console.error("Failed to log new lead dashboard alert:", e);
      }
    }
  }

  async notifyFailedForm(siteId, errorDetails) {
    const config = await this.getNotificationConfig(siteId);
    
    // 1. Email Channel
    if (config.failedForm?.email) {
      if (process.env.NODE_ENV === "development") {
        console.log("ℹ️ [NotificationService] Skipped failed form email notification in development mode.");
      } else {
        const settings = await prisma.globalSettings.findUnique({
          where: { siteId },
          select: { emailSettings: true }
        });
        const adminEmail = settings?.emailSettings?.recipientOverride || settings?.emailSettings?.adminAlerts?.email || settings?.emailSettings?.username;
        if (adminEmail && !adminEmail.includes("resend.dev") && !adminEmail.includes("example.com")) {
          try {
            const { systemEmailQueue } = await import("../lib/queues/systemEmailQueue.js");
            await systemEmailQueue.add(
              "failed-form-alert",
              {
                siteId,
                to: adminEmail,
                subject: `[System Alert] Contact Form Submission Failure`,
                text: `A contact form submission failed on your site.\n\nError: ${errorDetails.message}\nPayload: ${JSON.stringify(errorDetails.payload)}\n\nPlease check system logs.`
              },
              { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
            );
          } catch (e) {
            console.error("Failed to queue failed form email alert:", e);
          }
        } else {
          console.log(`ℹ️ [NotificationService] Skipped failed form email to placeholder address: ${adminEmail}`);
        }
      }
    }

    // 2. Dashboard Channel
    if (config.failedForm?.dashboard) {
      try {
        await prisma.notificationAlert.create({
          data: {
            siteId,
            title: "Form Submission Failure",
            message: `Submission failed. Error: ${errorDetails.message}`,
            type: "FAILED_FORM"
          }
        });
      } catch (e) {
        console.error("Failed to log form failure dashboard alert:", e);
      }
    }
  }

  async notifyNewBlogPost(siteId, post) {
    const config = await this.getNotificationConfig(siteId);
    
    // 1. Email Channel
    if (config.blogAlert?.email) {
      if (process.env.NODE_ENV === "development") {
        console.log("ℹ️ [NotificationService] Skipped blog email notification in development mode.");
      } else {
        const settings = await prisma.globalSettings.findUnique({
          where: { siteId },
          select: { emailSettings: true }
        });
        const adminEmail = settings?.emailSettings?.recipientOverride || settings?.emailSettings?.adminAlerts?.email || settings?.emailSettings?.username;
        if (adminEmail && !adminEmail.includes("resend.dev") && !adminEmail.includes("example.com")) {
          try {
            const { systemEmailQueue } = await import("../lib/queues/systemEmailQueue.js");
            await systemEmailQueue.add(
              "new-blog-alert",
              {
                siteId,
                to: adminEmail,
                subject: `[Blog Alert] New Post Published: ${post.title}`,
                text: `A new blog post has been published:\n\nTitle: ${post.title}\nSlug: ${post.slug}\n\nCheck out the live post.`
              },
              { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
            );
          } catch (e) {
            console.error("Failed to queue blog email alert:", e);
          }
        } else {
          console.log(`ℹ️ [NotificationService] Skipped blog email to placeholder address: ${adminEmail}`);
        }
      }
    }

    // 2. Dashboard Channel
    if (config.blogAlert?.dashboard) {
      try {
        await prisma.notificationAlert.create({
          data: {
            siteId,
            title: "New Blog Post Published",
            message: `Published: "${post.title}" (/blog/${post.slug})`,
            type: "BLOG_ALERT"
          }
        });
      } catch (e) {
        console.error("Failed to log blog dashboard alert:", e);
      }
    }
  }
}

export const notificationService = new NotificationService();
