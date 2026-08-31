import { emailService } from "@/services/email.service";
import { logEmailEvent } from "@/lib/emailLog";

export { emailService, logEmailEvent };

export async function sendEmail({
  siteId,
  to,
  subject,
  html,
  text,
  category = "transactional",
  triggerKey = null,
  meta = {},
}) {
  const resolvedSiteId = siteId || process.env.NEXT_PUBLIC_SITE_ID || "AHP";
  let fromEmail = null;
  let provider = null;

  try {
    const transporterInfo = await emailService.getTransporterForSite(resolvedSiteId);
    fromEmail = transporterInfo.fromEmail;
    provider = transporterInfo.provider || null;

    const result = await transporterInfo.transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    });

    await logEmailEvent({
      siteId: resolvedSiteId,
      category,
      triggerKey,
      toEmail: to,
      fromEmail,
      subject,
      provider,
      status: "sent",
      html: html || text,
      meta,
    });

    return result;
  } catch (err) {
    await logEmailEvent({
      siteId: resolvedSiteId,
      category,
      triggerKey,
      toEmail: to,
      fromEmail,
      subject,
      provider,
      status: "failed",
      errorMessage: err.message,
      html: html || text,
      meta,
    });
    throw err;
  }
}

