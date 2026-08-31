/**
 * lib/novu-subscriber-sync.js
 *
 * Wrappers for Novu subscriber management.
 *
 * In this app, "Novu subscribers" are the admin/CMS User accounts
 * (and occasionally leads/customers). They are distinct from the
 * app's own Subscriber model, which is the email marketing list.
 *
 * Subscriber ID convention:  <siteId>_<userId>
 * Example:                   AHP_clxyz1234
 *
 * Usage:
 *   import { syncNovuSubscriber, deleteNovuSubscriber } from "@/lib/novu-subscriber-sync";
 *
 *   // On user create / update
 *   await syncNovuSubscriber("AHP", { id: user.id, email: user.email, name: user.name });
 *
 *   // On user delete
 *   await deleteNovuSubscriber("AHP", user.id);
 */

import { getNovuClient } from "@/lib/novu";
import { novuSubscriberId } from "@/lib/novu";

/**
 * Upsert a Novu subscriber from a User record.
 *
 * Uses the Novu /subscribers endpoint. Safe to call repeatedly —
 * Novu will update existing subscribers rather than creating duplicates.
 *
 * @param {string} siteId
 * @param {{ id: string, email: string, name?: string|null, phone?: string|null }} user
 * @returns {Promise<object|null>}
 */
export async function syncNovuSubscriber(siteId, user) {
  try {
    const novu = await getNovuClient(siteId);
    const subId = novuSubscriberId(siteId, user.id);

    // Split the name into firstName / lastName for Novu's schema
    const nameParts = (user.name || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName  = nameParts.slice(1).join(" ") || "";

    const payload = {
      subscriberId: subId,
      email: user.email,
      ...(firstName && { firstName }),
      ...(lastName  && { lastName }),
      ...(user.phone && { phone: user.phone }),
      data: {
        siteId,
        userId: user.id,
        globalRole: user.globalRole || "VIEWER",
      },
    };

    // Novu v3 SDK — identify (upsert) a subscriber
    const result = await novu.subscribers.create(payload);
    return result?.data || result;
  } catch (err) {
    console.error(`[Novu] syncNovuSubscriber failed | siteId=${siteId} userId=${user.id}`, err?.message || err);
    return null;
  }
}

/**
 * Update specific fields on an existing Novu subscriber.
 * Call this when a user updates their profile.
 *
 * @param {string} siteId
 * @param {string} userId
 * @param {{ email?: string, name?: string, phone?: string }} updates
 * @returns {Promise<object|null>}
 */
export async function updateNovuSubscriber(siteId, userId, updates) {
  try {
    const novu = await getNovuClient(siteId);
    const subId = novuSubscriberId(siteId, userId);

    const payload = {};

    if (updates.email) payload.email = updates.email;

    if (updates.name) {
      const parts = updates.name.trim().split(" ");
      payload.firstName = parts[0] || "";
      payload.lastName  = parts.slice(1).join(" ") || "";
    }

    if (updates.phone !== undefined) {
      payload.phone = updates.phone || "";
    }

    if (Object.keys(payload).length === 0) return null;

    const result = await novu.subscribers.update(subId, payload);
    return result?.data || result;
  } catch (err) {
    console.error(`[Novu] updateNovuSubscriber failed | siteId=${siteId} userId=${userId}`, err?.message || err);
    return null;
  }
}

/**
 * Delete a Novu subscriber when a user deletes their account.
 *
 * @param {string} siteId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function deleteNovuSubscriber(siteId, userId) {
  try {
    const novu = await getNovuClient(siteId);
    const subId = novuSubscriberId(siteId, userId);

    const result = await novu.subscribers.delete(subId);
    return result?.data || result;
  } catch (err) {
    console.error(`[Novu] deleteNovuSubscriber failed | siteId=${siteId} userId=${userId}`, err?.message || err);
    return null;
  }
}

/**
 * Get Novu notification preferences for a subscriber.
 *
 * @param {string} siteId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getNovuPreferences(siteId, userId) {
  try {
    const novu = await getNovuClient(siteId);
    const subId = novuSubscriberId(siteId, userId);

    const result = await novu.subscribers.preferences.list(subId);
    return result?.data || result;
  } catch (err) {
    console.error(`[Novu] getNovuPreferences failed | siteId=${siteId} userId=${userId}`, err?.message || err);
    return null;
  }
}

/**
 * Update Novu notification preferences for a subscriber.
 *
 * @param {string} siteId
 * @param {string} userId
 * @param {string} workflowId      - Novu workflow identifier to update preferences for
 * @param {{ email?: boolean, push?: boolean, in_app?: boolean }} channels
 * @returns {Promise<object|null>}
 */
export async function updateNovuPreferences(siteId, userId, workflowId, channels) {
  try {
    const novu = await getNovuClient(siteId);
    const subId = novuSubscriberId(siteId, userId);

    const channelPreferences = Object.entries(channels).map(([type, enabled]) => ({
      type,   // "email" | "push" | "in_app"
      enabled,
    }));

    const result = await novu.subscribers.preferences.update(subId, workflowId, {
      channel: channelPreferences[0], // Novu API updates one channel at a time
    });
    return result?.data || result;
  } catch (err) {
    console.error(`[Novu] updateNovuPreferences failed | siteId=${siteId} userId=${userId}`, err?.message || err);
    return null;
  }
}

/**
 * Bulk-sync all users for a given siteId to Novu.
 * Used by the /api/novu/sync-subscriber reconciliation endpoint.
 *
 * @param {string} siteId
 * @param {Array<{id, email, name, globalRole}>} users
 * @returns {Promise<{synced: number, failed: number}>}
 */
export async function bulkSyncNovuSubscribers(siteId, users) {
  let synced = 0;
  let failed = 0;

  for (const user of users) {
    const result = await syncNovuSubscriber(siteId, user);
    if (result) {
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed };
}
