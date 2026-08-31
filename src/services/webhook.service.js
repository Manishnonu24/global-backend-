/**
 * Webhook Delivery Service
 * ---------------------------------------------------------------------------
 * Delivers outbound HTTP webhook notifications to all registered subscriber
 * URLs whenever CMS content events are emitted.
 *
 * Flow:
 *   EventBus.emit("page.updated", { siteId, data }) 
 *     → listeners.js calls webhookService.deliver(siteId, "page.updated", payload)
 *     → fetch active WebhookSubscription records for siteId + event
 *     → POST to each URL with HMAC-signed payload
 *     → log result to WebhookEvent table
 *     → auto-disable subscription after 10 consecutive failures
 */

import crypto from "crypto";
import prisma from "@/lib/prisma";
import { isQueueAvailable } from "@/lib/queues/disabledQueue";

class WebhookService {
  /**
   * Deliver a webhook event to all active subscribers matching the event type.
   *
   * @param {string} siteId - The site that emitted the event
   * @param {string} eventType - e.g. "page.published", "post.published"
   * @param {object} payload - The event payload to deliver
   */
  async deliver(siteId, eventType, payload = {}) {
    if (!siteId || !eventType) return;

    let subscriptions;
    try {
      subscriptions = await prisma.webhookSubscription.findMany({
        where: {
          siteId,
          isActive: true,
          deletedAt: null,
          events: { array_contains: eventType },
        },
      });
    } catch (err) {
      console.error(`[Webhook] Failed to fetch subscriptions for ${eventType}:`, err.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) return;

    const body = JSON.stringify({
      event: eventType,
      siteId,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const { webhookQueue } = await import("../lib/queues/webhookQueue.js");
    if (!isQueueAvailable(webhookQueue)) {
      return {
        delivered: false,
        queued: false,
        reason: webhookQueue.unavailableReason,
        subscriptions: subscriptions.length,
      };
    }

    const jobs = subscriptions.map((sub) => ({
      name: "deliver-webhook",
      data: {
        subscriptionId: sub.id,
        body,
        eventType,
        siteId,
        url: sub.url
      },
      opts: {
        attempts: 4, // Initial + 3 retries
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    }));

    try {
      await webhookQueue.addBulk(jobs);
    } catch (err) {
      console.error("[Webhook] Failed to enqueue webhook jobs:", err);
    }
  }

  /**
   * Generate a random webhook secret for new subscriptions.
   */
  generateSecret() {
    return crypto.randomBytes(32).toString("hex");
  }
}

export const webhookService = new WebhookService();
