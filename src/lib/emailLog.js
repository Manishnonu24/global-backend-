import prisma from "./prisma.js";

/**
 * Universal Email Event Logger
 * Durable, queryable logging for every outgoing email (transactional, campaign, system).
 * Defensive try/catch: NEVER throws, blocks, or interrupts email delivery.
 */
export async function logEmailEvent({
  siteId,
  category = "transactional", // "transactional" | "campaign" | "system"
  triggerKey = null,
  campaignId = null,
  templateId = null,
  toEmail,
  toName = null,
  fromEmail = null,
  subject = null,
  provider = null,
  status = "sent", // "sent" | "failed" | "queued" | "sending"
  errorMessage = null,
  html = null,
  text = null,
  bodyPreview = null,
  meta = {},
  sentAt = null,
}) {
  try {
    if (!toEmail) return null;
    const resolvedSiteId = siteId || process.env.NEXT_PUBLIC_SITE_ID || "AHP";

    // Generate clean text snippet for bodyPreview (~500 chars max, never store massive raw HTML)
    let preview = bodyPreview;
    if (!preview) {
      const raw = html || text || "";
      preview = String(raw)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
    }

    const resolvedSentAt = sentAt || (status === "sent" ? new Date() : null);

    return await prisma.emailLog.create({
      data: {
        siteId: resolvedSiteId,
        category,
        triggerKey: triggerKey ? String(triggerKey) : null,
        campaignId: campaignId ? String(campaignId) : null,
        templateId: templateId ? String(templateId) : null,
        toEmail: String(toEmail),
        toName: toName ? String(toName) : null,
        fromEmail: fromEmail ? String(fromEmail) : null,
        subject: subject ? String(subject) : null,
        provider: provider ? String(provider) : null,
        status: status || "queued",
        errorMessage: errorMessage ? String(errorMessage) : null,
        bodyPreview: preview || null,
        meta: meta && typeof meta === "object" ? meta : {},
        sentAt: resolvedSentAt,
      },
    });
  } catch (err) {
    console.error("[EmailLog] Failed to log email event:", err?.message || err);
    return null;
  }
}
