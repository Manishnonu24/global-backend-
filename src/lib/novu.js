/**
 * lib/novu.js
 *
 * Central Novu client factory for the AHP application.
 *
 * Usage:
 *   import { getNovuClient, NOVU_WORKFLOWS, novuSubscriberId } from "@/lib/novu";
 *   const novu = await getNovuClient(siteId);
 *   await novu.trigger({ workflowId: NOVU_WORKFLOWS.SERVICE_BOOKED, to: [...], payload: {...} });
 */

import { Novu } from "@novu/api";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Workflow identifier constants — must match Novu dashboard workflow IDs
// ---------------------------------------------------------------------------
export const NOVU_WORKFLOWS = {
  /** General broadcast push (already in use by push.service.js) */
  PUSH_NOTIFICATION: process.env.NOVU_WORKFLOW_PUSH || "push-notification",

  /** Fired when a media package booking form is submitted */
  SERVICE_BOOKED: process.env.NOVU_WORKFLOW_SERVICE_BOOKED || "service-booked",

  /** Fired when a lead's status changes (new → confirmed → won / cancelled) */
  SERVICE_STATUS_CHANGED:
    process.env.NOVU_WORKFLOW_SERVICE_STATUS_CHANGED || "service-status-changed",

  /** Fired when an admin updates a service record that has active leads */
  SERVICE_UPDATED:
    process.env.NOVU_WORKFLOW_SERVICE_UPDATED || "service-updated",

  /** Fired by the cron job ~24 h before a scheduled appointment */
  SERVICE_REMINDER:
    process.env.NOVU_WORKFLOW_SERVICE_REMINDER || "service-reminder",

  /** Optional: fired during bulk email campaign execution via Novu */
  EMAIL_CAMPAIGN:
    process.env.NOVU_WORKFLOW_EMAIL_CAMPAIGN || "email-campaign",

  /** Fired when a new admin User account is created */
  WELCOME_USER: process.env.NOVU_WORKFLOW_WELCOME_USER || "welcome-user",
};

// ---------------------------------------------------------------------------
// Subscriber ID helper
//
// Novu subscriber IDs must be globally unique across all tenants that share
// the same Novu account. We prefix with siteId to avoid collision between
// sites managed by the same Novu API key.
//
// Format:  <siteId>_<userId>
// Example: AHP_clxyz123
// ---------------------------------------------------------------------------
export function novuSubscriberId(siteId, userId) {
  return `${siteId}_${userId}`;
}

// ---------------------------------------------------------------------------
// Singleton client cache (keyed by apiKey to support per-site overrides)
// ---------------------------------------------------------------------------
const _clientCache = new Map();

export function isNovuConfigured() {
  return Boolean(process.env.NOVU_API_KEY?.trim());
}

/**
 * Returns a configured Novu SDK instance.
 *
 * @param {string|null} siteId  - Optional. When provided, checks
 *   GlobalSettings.emailSettings.novuApiKey for a site-level override
 *   before falling back to process.env.NOVU_API_KEY.
 *
 * @returns {Promise<Novu>}     - Configured Novu client.
 * @throws  {Error}             - If no API key is available.
 */
export async function getNovuClient(siteId = null) {
  let apiKey = process.env.NOVU_API_KEY;

  // Per-site override stored in GlobalSettings.emailSettings.novuApiKey
  if (siteId) {
    try {
      const settings = await prisma.globalSettings.findUnique({
        where: { siteId },
        select: { emailSettings: true },
      });
      const override = settings?.emailSettings?.novuApiKey;
      if (override) apiKey = override;
    } catch {
      // DB unavailable — fall through to env key
    }
  }

  if (!apiKey) {
    throw new Error(
      "Novu API key is not configured. Set NOVU_API_KEY in .env or configure it in Email Settings → Novu API Key."
    );
  }

  if (!_clientCache.has(apiKey)) {
    _clientCache.set(apiKey, new Novu({ secretKey: apiKey }));
  }

  return _clientCache.get(apiKey);
}

/**
 * Returns a Novu client synchronously using only the env-level key.
 * Use this in contexts where you cannot await (e.g., module-level init).
 * Throws if NOVU_API_KEY is not set.
 */
export function getNovuClientSync() {
  const apiKey = process.env.NOVU_API_KEY;
  if (!apiKey) {
    throw new Error("NOVU_API_KEY environment variable is not set.");
  }
  if (!_clientCache.has(apiKey)) {
    _clientCache.set(apiKey, new Novu({ secretKey: apiKey }));
  }
  return _clientCache.get(apiKey);
}
