import { EventBus } from "./events";
import { emailService } from "@/services/email.service";
import { notificationService } from "@/services/notification.service";
import { webhookService } from "@/services/webhook.service";
import prisma from "@/lib/prisma";
import { queueUpsertContent, queueDeleteContent } from "@/lib/queues/searchQueue";

const globalForListeners = globalThis;
if (!globalForListeners.listenersInitialized) {
  globalForListeners.listenersInitialized = true;
  console.log("🔔 Application event listeners initialized!");

// ---------------------------------------------------------------------------
// AUTH EVENTS
// ---------------------------------------------------------------------------
EventBus.on("auth.password_reset_requested", async ({ email, token }) => {
  try {
    await emailService.sendPasswordResetEmail(email, token);
  } catch (err) {
    console.error("Failed to send password reset email via listener:", err);
  }
});

const handlePasswordChanged = async ({ userId }) => {
  try {
    if (!userId) return;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.email) {
      await emailService.sendPasswordChangedEmail(user.email, user.name || user.username || "User");
    }
  } catch (err) {
    console.error("Failed to send password changed notification email via listener:", err);
  }
};

EventBus.on("auth.password_reset_completed", handlePasswordChanged);
EventBus.on("auth.password_changed", handlePasswordChanged);

EventBus.on("contact_form.submitted", async ({ submission, lead, site }) => {
  console.log("🔥 [EventBus] contact_form.submitted received for site:", submission.siteId);

  // ── Email alerts ────────────────────────────────────────────────────────
  try {
    await emailService.sendContactFormAlerts(submission, lead, site);
    console.log("✅ [EventBus] Contact form email alerts sent.");
  } catch (err) {
    console.error("❌ [EventBus] Failed to send contact form alerts via listener:", err);
  }

  // ── Dashboard notification (always — admin + CRM bell) ───────────────────
  try {
    const isLead = !!lead;
    const title = isLead ? "New Lead from Contact Form" : "New Contact Form Submission";
    const msg = isLead
      ? `Lead: ${lead.name} (${lead.email}) — Interest: ${lead.serviceInterest || "N/A"}`
      : `From: ${submission.name} (${submission.email}) — ${submission.message.substring(0, 120)}${submission.message.length > 120 ? "..." : ""}`;

    await prisma.notificationAlert.create({
      data: {
        siteId: submission.siteId,
        title,
        message: msg,
        type: "NEW_LEAD",
      },
    });
    console.log("✅ [EventBus] NotificationAlert created in DB.");
  } catch (err) {
    console.error("❌ [EventBus] Failed to create dashboard NotificationAlert:", err);
  }
});

EventBus.on("lead.created", async ({ siteId, data }) => {
  console.log("🔥 [EventBus] lead.created received for site:", siteId);
  try {
    await notificationService.notifyNewLead(siteId, data);
    console.log("✅ [EventBus] notifyNewLead completed.");
  } catch (err) {
    console.error("❌ [EventBus] Failed to notify new lead:", err);
  }

  // Automatically send welcome confirmation email to lead
  try {
    await emailService.sendLeadWelcomeEmail(siteId, data);
    console.log("✅ [EventBus] Lead welcome email triggered successfully.");
  } catch (err) {
    console.error("❌ [EventBus] Failed to send welcome email to lead:", err);
  }
});

EventBus.on("form.failed", async ({ siteId, data }) => {
  try {
    await notificationService.notifyFailedForm(siteId, data);
  } catch (err) {
    console.error("Failed to notify failed form submission:", err);
  }
});

EventBus.on("newsletter.subscribed", async ({ siteId, data }) => {
  console.log("🔥 [EventBus] newsletter.subscribed received for site:", siteId);
  try {
    const email = data.email || "Unknown Email";
    await prisma.notificationAlert.create({
      data: {
        siteId,
        title: "New Newsletter Subscriber",
        message: `A new user subscribed to the newsletter: ${email}`,
        type: "NEW_LEAD",
      },
    });
    console.log("✅ [EventBus] NotificationAlert created in DB for newsletter.");
  } catch (err) {
    console.error("❌ [EventBus] Failed to create dashboard NotificationAlert for newsletter:", err);
  }

  // Automatically send welcome email to newsletter subscriber
  try {
    await emailService.sendNewsletterWelcomeEmail(siteId, data.email);
    console.log("✅ [EventBus] Newsletter welcome email triggered successfully.");
  } catch (err) {
    console.error("❌ [EventBus] Failed to send welcome email to newsletter subscriber:", err);
  }
});

// ---------------------------------------------------------------------------
// CONTENT EVENTS → Webhook Delivery (Automatic Website Synchronization)
// ---------------------------------------------------------------------------

/**
 * Helper: deliver a webhook event without blocking the main request.
 * Errors are caught and logged; they never propagate to the caller.
 */
async function deliverWebhook(siteId, eventType, data) {
  try {
    await webhookService.deliver(siteId, eventType, data);
  } catch (err) {
    console.error(
      `[Webhook Listener] Unhandled error for ${eventType}:`,
      err.message,
    );
  }
}

// Pages
EventBus.on("page.created", ({ siteId, data }) => {
  deliverWebhook(siteId, "page.created", data);
  queueUpsertContent("page", data.id);
});
EventBus.on("page.updated", ({ siteId, data }) => {
  deliverWebhook(siteId, "page.updated", data);
  queueUpsertContent("page", data.id);
});
EventBus.on("page.deleted", ({ siteId, data }) => {
  deliverWebhook(siteId, "page.deleted", data);
  queueDeleteContent("page", data.id);
});

// Posts / Blog
EventBus.on("post.published", async ({ siteId, data }) => {
  try {
    await notificationService.notifyNewBlogPost(siteId, data);
  } catch (err) {
    console.error("Failed to notify new blog post:", err);
  }
  await deliverWebhook(siteId, "post.published", data);
  queueUpsertContent("post", data.id);
});
EventBus.on("post.created", ({ siteId, data }) => {
  deliverWebhook(siteId, "post.created", data);
  queueUpsertContent("post", data.id);
});
EventBus.on("post.updated", ({ siteId, data }) => {
  deliverWebhook(siteId, "post.updated", data);
  queueUpsertContent("post", data.id);
});
EventBus.on("post.deleted", ({ siteId, data }) => {
  deliverWebhook(siteId, "post.deleted", data);
  queueDeleteContent("post", data.id);
});

// Services
EventBus.on("service.created", ({ siteId, data }) => {
  deliverWebhook(siteId, "service.created", data);
  queueUpsertContent("service", data.id);
});
EventBus.on("service.updated", ({ siteId, data }) => {
  deliverWebhook(siteId, "service.updated", data);
  queueUpsertContent("service", data.id);
});
EventBus.on("service.deleted", ({ siteId, data }) => {
  deliverWebhook(siteId, "service.deleted", data);
  queueDeleteContent("service", data.id);
});

// Global Settings (header, footer, navigation, branding, etc.)
EventBus.on("globalSettings.updated", ({ siteId, data }) =>
  deliverWebhook(siteId, "global_settings.updated", data),
);

// Navigation / Menus
EventBus.on("navigation.updated", ({ siteId, data }) =>
  deliverWebhook(siteId, "navigation.updated", data),
);

// Testimonials, FAQs, Team, Legal
EventBus.on("testimonial.created", ({ siteId, data }) =>
  deliverWebhook(siteId, "testimonial.created", data),
);
EventBus.on("testimonial.updated", ({ siteId, data }) =>
  deliverWebhook(siteId, "testimonial.updated", data),
);
EventBus.on("testimonial.deleted", ({ siteId, data }) =>
  deliverWebhook(siteId, "testimonial.deleted", data),
);
EventBus.on("faq.created", ({ siteId, data }) =>
  deliverWebhook(siteId, "faq.created", data),
);
EventBus.on("faq.updated", ({ siteId, data }) =>
  deliverWebhook(siteId, "faq.updated", data),
);
EventBus.on("faq.deleted", ({ siteId, data }) =>
  deliverWebhook(siteId, "faq.deleted", data),
);
EventBus.on("teamMember.created", ({ siteId, data }) =>
  deliverWebhook(siteId, "team_member.created", data),
);
EventBus.on("teamMember.updated", ({ siteId, data }) =>
  deliverWebhook(siteId, "team_member.updated", data),
);
EventBus.on("teamMember.deleted", ({ siteId, data }) =>
  deliverWebhook(siteId, "team_member.deleted", data),
);
EventBus.on("legalPage.updated", ({ siteId, data }) =>
  deliverWebhook(siteId, "legal_page.updated", data),
);

  // ── Auto-publish scheduled posts (every 2 minutes) ──
  setInterval(
    async () => {
      try {
        const { postService } = await import("@/services/post.service");
        await postService.checkScheduledPosts();
      } catch (err) {
        console.error("Scheduled posts check failed:", err.message);
      }
    },
    2 * 60 * 1000,
  );
}
