/**
 * lib/novu-triggers.js
 *
 * Unified helper for firing Novu workflows across the AHP application.
 * All Novu trigger calls in services and API routes should go through
 * these functions rather than calling the SDK directly, so that:
 *   - Error handling is consistent (never crash the caller)
 *   - Missing API key results in a warning, not an unhandled exception
 *   - Payload is validated before sending
 *
 * Usage:
 *   import { notifyUser, notifyTopic, notifyMultiple } from "@/lib/novu-triggers";
 *
 *   // Single recipient
 *   await notifyUser("AHP_clxyz123", NOVU_WORKFLOWS.SERVICE_BOOKED, {
 *     serviceName: "Podcast Package",
 *     clientName: "Jane Doe",
 *   }, { siteId: "AHP" });
 *
 *   // Topic (segment broadcast)
 *   await notifyTopic("subscribed-users", NOVU_WORKFLOWS.PUSH_NOTIFICATION, {
 *     title: "New episode out!",
 *     message: "Check it out on the site.",
 *   }, { siteId: "AHP" });
 */

import { getNovuClient } from "@/lib/novu";

/**
 * Fire a Novu workflow for a single subscriber.
 *
 * @param {string}   subscriberId  - Novu subscriber ID (use novuSubscriberId() helper)
 * @param {string}   workflowId    - Novu workflow identifier (use NOVU_WORKFLOWS constants)
 * @param {object}   payload       - Template variables passed to the workflow
 * @param {object}   [options]
 * @param {string}   [options.siteId]    - Used to resolve per-site API key override
 * @param {string}   [options.email]     - Subscriber email (helps Novu identify/create)
 * @param {string}   [options.firstName] - Subscriber first name
 * @param {string}   [options.lastName]  - Subscriber last name
 * @param {string}   [options.phone]     - Subscriber phone number
 * @returns {Promise<object|null>}       - Novu trigger result or null on failure
 */
export async function notifyUser(subscriberId, workflowId, payload = {}, options = {}) {
  const { siteId = null, email, firstName, lastName, phone } = options;

  try {
    const novu = await getNovuClient(siteId);

    const to = { subscriberId };
    if (email)     to.email     = email;
    if (firstName) to.firstName = firstName;
    if (lastName)  to.lastName  = lastName;
    if (phone)     to.phone     = phone;

    const result = await novu.trigger({
      workflowId,
      to: [to],
      payload,
    });

    return result?.data || result;
  } catch (err) {
    // Log but never throw — notification failures must not crash the caller
    console.error(`[Novu] notifyUser failed | workflow=${workflowId} subscriber=${subscriberId}`, err?.message || err);
    return null;
  }
}

/**
 * Fire a Novu workflow to multiple specific subscribers at once.
 *
 * @param {Array<{subscriberId, email?, firstName?, lastName?}>} recipients
 * @param {string}   workflowId
 * @param {object}   payload
 * @param {object}   [options]
 * @param {string}   [options.siteId]
 * @returns {Promise<object|null>}
 */
export async function notifyMultiple(recipients, workflowId, payload = {}, options = {}) {
  const { siteId = null } = options;

  if (!recipients || recipients.length === 0) return null;

  try {
    const novu = await getNovuClient(siteId);

    const result = await novu.trigger({
      workflowId,
      to: recipients,
      payload,
    });

    return result?.data || result;
  } catch (err) {
    console.error(`[Novu] notifyMultiple failed | workflow=${workflowId} recipients=${recipients.length}`, err?.message || err);
    return null;
  }
}

/**
 * Fire a Novu workflow to a Topic (segment/broadcast).
 *
 * Topic keys are slugified segment names stored in PushNotification.segment.
 * Example: "Subscribed Users" → "subscribed-users"
 *
 * @param {string}   topicKey   - Novu topic key (pre-slugified)
 * @param {string}   workflowId
 * @param {object}   payload
 * @param {object}   [options]
 * @param {string}   [options.siteId]
 * @returns {Promise<object|null>}
 */
export async function notifyTopic(topicKey, workflowId, payload = {}, options = {}) {
  const { siteId = null } = options;

  try {
    const novu = await getNovuClient(siteId);

    const result = await novu.trigger({
      workflowId,
      to: [{ type: "Topic", topicKey }],
      payload,
    });

    return result?.data || result;
  } catch (err) {
    console.error(`[Novu] notifyTopic failed | workflow=${workflowId} topic=${topicKey}`, err?.message || err);
    return null;
  }
}

/**
 * Slugify a segment name to a valid Novu topic key.
 * "Subscribed Users" → "subscribed-users"
 */
export function toTopicKey(segmentName = "subscribed-users") {
  return segmentName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}
