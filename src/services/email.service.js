import nodemailer from "nodemailer";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { BaseService } from "@/core/service";
import { getDefaultSiteId } from "@/lib/siteResolver";
import { IntegrationUnavailableError } from "@/core/errors";
import { resolveHtmlMediaUrls } from "@/utils/mediaUtils";
import { logEmailEvent } from "@/lib/emailLog";
import { logAction } from "@/lib/audit";
import {
  redactSensitiveVariables,
  getLogSafeHtml,
} from "@/lib/emailLogRedaction";

export class EmailService extends BaseService {
  constructor() {
    super({ modelName: "globalsettings" });
  }

  async getTransporterForSite(siteId) {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { emailSettings: true },
    });

    const emailConfig = settings?.emailSettings || {};
    let provider = emailConfig.provider || process.env.EMAIL_PROVIDER || "resend";

    const hasSmtpConfig = emailConfig.host && emailConfig.port && emailConfig.username && emailConfig.password;
    const resendKey = emailConfig.resendApiKey || process.env.RESEND_API_KEY;

    if (provider === "smtp" && !hasSmtpConfig && resendKey) {
      provider = "resend";
    }

    // Resend provider
    if (provider === "resend") {
      const apiKey = emailConfig.resendApiKey || process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new IntegrationUnavailableError("email", `Resend API key is not configured for site: ${siteId}. Configure in CRM or set RESEND_API_KEY in environment variables.`);
      }
      const defaultFromEmail = emailConfig.formEmail || process.env.RESEND_FROM_EMAIL || process.env.SENDER_EMAIL || process.env.FROM_EMAIL || "no-reply@ahealthplace.com";
      const resend = new Resend(apiKey);
      return {
        transporter: {
          sendMail: async ({ from, to, subject, text, html }) => {
            const payload = {
              from: from || defaultFromEmail,
              to,
              subject,
              ...(html ? { html } : { text }),
            };
            const { error } = await resend.emails.send(payload);
            if (error) throw new Error(error.message);
          },
        },
        fromEmail: defaultFromEmail,
        config: emailConfig,
        provider: "resend",
      };
    }

    // SendGrid provider
    if (provider === "sendgrid") {
      const apiKey = emailConfig.sendgridApiKey;
      if (!apiKey) {
        throw new IntegrationUnavailableError("email", `SendGrid API key is not configured for site: ${siteId}`);
      }
      return {
        transporter: {
          sendMail: async ({ from, to, subject, text, html }) => {
            const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                personalizations: [
                  {
                    to: [{ email: to }],
                  },
                ],
                from: {
                  email: from || emailConfig.formEmail || "noreply@yourdomain.com",
                },
                subject,
                content: [
                  ...(text ? [{ type: "text/plain", value: text }] : []),
                  ...(html ? [{ type: "text/html", value: html }] : []),
                ],
              }),
            });
            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              const errMsg = errData.errors
                ? errData.errors.map((e) => e.message).join(", ")
                : `SendGrid returned status ${response.status}`;
              throw new Error(errMsg);
            }
          },
        },
        fromEmail: emailConfig.formEmail || "",
        config: emailConfig,
        provider: "sendgrid",
      };
    }

    // SMTP provider (default)
    const { host, port, username, password } = emailConfig;

    if (host && port && username && password) {
      return {
        transporter: nodemailer.createTransport({
          host,
          port: parseInt(port, 10),
          secure: parseInt(port, 10) === 465,
          auth: { user: username, pass: password },
          connectionTimeout: 10000,
        }),
        fromEmail: emailConfig.formEmail || username,
        config: emailConfig,
        provider: "smtp",
      };
    }

    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const fallbackUser = process.env.SMTP_USER;
      return {
        transporter: nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587", 10),
          secure: (process.env.SMTP_PORT || "587") === "465",
          auth: { user: fallbackUser, pass: process.env.SMTP_PASS },
          connectionTimeout: 10000,
        }),
        fromEmail: process.env.FORM_EMAIL || fallbackUser,
        config: {
          adminAlerts: { enabled: true, email: fallbackUser },
          autoReplyTemplate: { enabled: true },
        },
        provider: "smtp",
      };
    }

    throw new IntegrationUnavailableError(
      "email",
      `Email is not configured for site: ${siteId}. Configure SMTP or Resend in Email Settings.`,
    );
  }

  async sendPasswordResetEmail(email, token, siteId = "AHP") {
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    return this.sendByTrigger(siteId, "password_reset", email, { resetUrl, token });
  }

  async sendPasswordChangedEmail(email, name = "User", siteId = "AHP") {
    const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/login`;
    return this.sendByTrigger(siteId, "password_changed", email, { name, email, loginUrl });
  }

  async sendContactFormAlerts(submission, lead, site) {
    const siteId = site?.id || submission?.siteId || "AHP";
    const { config, fromEmail } = await this.getTransporterForSite(siteId);
    const { adminAlerts } = config;

    if (adminAlerts?.enabled !== false) {
      const adminEmail = config.recipientOverride || adminAlerts?.email || fromEmail;
      return this.sendByTrigger(
        siteId,
        "admin_lead_notification",
        adminEmail,
        {
          name: submission.name || "there",
          email: submission.email || "",
          phone: submission.phone || "N/A",
          message: submission.message || "",
          query: submission.message || "",
          serviceInterest: lead?.serviceInterest || "General Inquiry",
        },
        { replyTo: submission.email }
      );
    }
  }

  async testConnection(siteId) {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { emailSettings: true },
    });

    const emailConfig = settings?.emailSettings || {};
    const provider = emailConfig.provider || process.env.EMAIL_PROVIDER || "resend";

    if (provider === "resend") {
      const apiKey = emailConfig.resendApiKey || process.env.RESEND_API_KEY;
      if (!apiKey) throw new IntegrationUnavailableError("email", "Resend API key is not configured (checked CRM settings & RESEND_API_KEY env).");
      const resend = new Resend(apiKey);
      const { data, error } = await resend.apiKeys.list();
      if (error) throw new Error(`Resend connection failed: ${error.message}`);
      return { success: true, message: "Resend API key is valid." };
    }

    if (provider === "sendgrid") {
      const apiKey = emailConfig.sendgridApiKey;
      if (!apiKey) throw new IntegrationUnavailableError("email", "SendGrid API key is not configured.");
      const response = await fetch("https://api.sendgrid.com/v3/scopes", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) {
        throw new Error(`SendGrid connection failed with status: ${response.status}`);
      }
      return { success: true, message: "SendGrid API key is valid." };
    }

    const { host, port, username, password } = emailConfig;
    if (!host || !port || !username || !password) {
      throw new IntegrationUnavailableError("email", "SMTP is not fully configured.");
    }
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: { user: username, pass: password },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
    await transporter.verify();
    return { success: true, message: "SMTP connection verified." };
  }

  async sendTestEmail(siteId, recipientEmail) {
    const { transporter, fromEmail, provider } = await this.getTransporterForSite(siteId);
    const subject = "Test Email - Global Backend";
    const html = "<p>This is a test email to verify your email configuration is working correctly.</p>";
    try {
      await transporter.sendMail({
        from: fromEmail,
        to: recipientEmail,
        subject,
        text: "This is a test email to verify your email configuration is working correctly.",
        html,
      });

      await logEmailEvent({
        siteId,
        category: "system",
        triggerKey: "test_email",
        toEmail: recipientEmail,
        fromEmail,
        subject,
        provider,
        status: "sent",
        html,
        meta: { test: true },
      });

      return {
        success: true,
        message: `Test email sent successfully to ${recipientEmail}`,
      };
    } catch (err) {
      await logEmailEvent({
        siteId,
        category: "system",
        triggerKey: "test_email",
        toEmail: recipientEmail,
        fromEmail,
        subject,
        provider,
        status: "failed",
        errorMessage: err.message,
        html,
        meta: { test: true },
      });
      throw err;
    }
  }

  async logEmailFailure(siteId, errorMessage, context = {}) {
    try {
      const settings = await prisma.globalSettings.findUnique({
        where: { siteId },
        select: { emailSettings: true },
      });

      const emailConfig = settings?.emailSettings || {};
      const failedLogs = emailConfig.failedLogs || [];

      failedLogs.unshift({
        error: errorMessage,
        timestamp: new Date().toISOString(),
        ...context,
      });

      await prisma.globalSettings.update({
        where: { siteId },
        data: {
          emailSettings: {
            ...emailConfig,
            failedLogs: failedLogs.slice(0, 50),
          },
        },
      });
    } catch (e) {
      console.error("Failed to write failed email log to DB:", e);
    }
  }

  /**
   * Universal Trigger-based Email Sender
   * Deterministically finds the active template for a site + triggerKey,
   * interpolates variables, resolves media URLs, and dispatches via configured transporter.
   */
  async sendByTrigger(siteId, triggerKey, to, variables = {}, { replyTo } = {}) {
    let subject = "";
    let rawHtml = "";
    let template = null;
    let fromEmail = null;
    let provider = null;

    try {
      const site = await prisma.site.findUnique({ where: { id: siteId } });
      const siteName = site?.name || "A Health Place";
      const baseUrl = process.env.NEXT_PUBLIC_CMS_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || (site?.domain ? `https://${site.domain}` : "");

      // 1. Exact match lookup by triggerKey and isActive=true
      template = await prisma.emailTemplate.findFirst({
        where: { siteId, triggerKey, isActive: true },
      });

      // 2. Fallback fuzzy name matching if template has no triggerKey assigned yet
      if (!template) {
        let nameKeyword = triggerKey.replace(/_/g, " ");
        if (triggerKey.includes("newsletter")) nameKeyword = "newsletter";
        else if (triggerKey.includes("admin")) nameKeyword = "admin";
        else if (triggerKey.includes("lead")) nameKeyword = "lead";

        template = await prisma.emailTemplate.findFirst({
          where: {
            siteId,
            name: { contains: nameKeyword },
            isActive: true,
          },
        });
      }

      const mergedVars = { siteName, baseUrl, ...variables };

      // Interpolate both {key} and [Key] / [Key Name] variable syntaxes
      const interpolate = (str = "") => {
        if (!str) return "";
        let result = str;
        Object.entries(mergedVars).forEach(([key, val]) => {
          const stringVal = val !== undefined && val !== null ? String(val) : "";
          result = result.replaceAll(`{${key}}`, stringVal);
          const bracketKey = key.replace(/([A-Z])/g, " $1").trim();
          result = result.replaceAll(`[${key}]`, stringVal);
          result = result.replaceAll(`[${bracketKey}]`, stringVal);
          // Common explicit alias replacements
          if (key === "name") {
            result = result.replaceAll("{firstName}", stringVal);
            result = result.replaceAll("[First Name]", stringVal);
          }
          if (key === "email") {
            result = result.replaceAll("{userEmail}", stringVal);
            result = result.replaceAll("[User Email]", stringVal);
          }
        });
        return result;
      };

      if (template) {
        subject = interpolate(template.subject || "");
        rawHtml = interpolate(template.htmlContent || "");
      } else {
        // Fallback default HTML templates if no DB template exists yet
        if (triggerKey === "user_verification" || triggerKey === "otp_verification") {
          const otpCode = variables.otpCode || "123456";
          subject = `Your Account Verification Code: ${otpCode}`;
          rawHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
              <div style="background-color: #0f7c85; padding: 24px; text-align: center; border-top-left-radius: 16px; border-top-right-radius: 16px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Verify Your Account</h1>
              </div>
              <div style="padding: 32px; background-color: #ffffff; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Hi ${variables.name || "there"},</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for registering on <strong>${siteName}</strong>. Please use the 6-digit verification code below to complete your registration:</p>
                <div style="margin: 28px 0; text-align: center;">
                  <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #0f7c85; padding: 16px 36px; border-radius: 12px; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0f7c85;">
                    ${otpCode}
                  </div>
                </div>
                <p style="font-size: 13px; color: #64748b; text-align: center;">This verification code will expire in <strong>10 minutes</strong>.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">If you did not request this code, please ignore this email.</p>
              </div>
            </div>
          `;
        } else if (triggerKey === "newsletter_welcome") {
          subject = `Welcome to ${siteName}! 🎉`;
          rawHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px;">
              <div style="background-color: #0f7c85; padding: 24px; text-align: center; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Welcome to ${siteName}! 🎉</h1>
              </div>
              <div style="padding: 30px; background-color: #ffffff; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px; line-height: 1.6; color: #0f172a; margin-top: 0;">Thank you for subscribing to our wellness newsletter!</p>
                <p style="font-size: 14px; line-height: 1.6; color: #475569;">You'll now receive our latest health tips, nutrition guidance, expert advice, and wellness insights directly in your inbox.</p>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${baseUrl || '#'}" style="background-color: #0f7c85; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 14px;">Explore Our Articles</a>
                </div>
                <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; pt: 20px; margin-top: 30px; margin-bottom: 0;">
                  Sent with care from ${siteName}.
                </p>
              </div>
            </div>
          `;
        } else if (triggerKey === "lead_auto_reply") {
          subject = `Thanks for contacting ${siteName}! 👋`;
          rawHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px;">
              <div style="background-color: #0f7c85; padding: 24px; text-align: center; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Thanks for reaching out, ${variables.name || "there"}! 👋</h1>
              </div>
              <div style="padding: 30px; background-color: #ffffff; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px; line-height: 1.6; color: #0f172a; margin-top: 0;">We have received your message regarding <strong>${variables.serviceInterest || "General Inquiry"}</strong>.</p>
                <p style="font-size: 14px; line-height: 1.6; color: #475569;">Our team is reviewing your inquiry and will get back to you shortly.</p>
                <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; pt: 20px; margin-top: 30px; margin-bottom: 0;">
                  Sent with care from ${siteName}.
                </p>
              </div>
            </div>
          `;
        } else if (triggerKey === "admin_lead_notification") {
          subject = `New Lead Submission: ${variables.name || "Inquiry"} (${variables.serviceInterest || "General"})`;
          rawHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #f8fafc; border-radius: 12px;">
              <div style="background-color: #0f7c85; padding: 20px; text-align: center; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                <h2 style="color: #ffffff; margin: 0; font-size: 20px;">🔔 New Lead Submission</h2>
              </div>
              <div style="padding: 24px; background-color: #ffffff; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 14px; margin-top: 0;">You received a new inquiry on <strong>${siteName}</strong>:</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 20px 0;">
                  <tr><td style="padding: 8px 0; color: #64748b; width: 120px;"><strong>Name:</strong></td><td style="padding: 8px 0; color: #0f172a;">${variables.name || "N/A"}</td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;"><strong>Email:</strong></td><td style="padding: 8px 0; color: #0f172a;"><a href="mailto:${variables.email || "#"}">${variables.email || "N/A"}</a></td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;"><strong>Phone:</strong></td><td style="padding: 8px 0; color: #0f172a;">${variables.phone || "N/A"}</td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;"><strong>Interest:</strong></td><td style="padding: 8px 0; color: #0f172a;">${variables.serviceInterest || "General Inquiry"}</td></tr>
                  ${variables.message ? `<tr><td style="padding: 8px 0; color: #64748b; vertical-align: top;"><strong>Message:</strong></td><td style="padding: 8px 0; color: #0f172a;">${variables.message}</td></tr>` : ''}
                </table>
              </div>
            </div>
          `;
        } else {
          subject = interpolate(triggerKey.replace(/_/g, " ").toUpperCase());
          rawHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f7c85; margin-top: 0;">${subject}</h2>
              <p style="font-size: 14px; color: #475569;">${variables.message || variables.description || "Notification update from " + siteName}</p>
            </div>
          `;
        }
      }

      const html = resolveHtmlMediaUrls(rawHtml, baseUrl);
      const transporterInfo = await this.getTransporterForSite(siteId);
      fromEmail = transporterInfo.fromEmail;
      provider = transporterInfo.provider || null;

      await transporterInfo.transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      });

      console.log(`[EmailService] Event "${triggerKey}" email sent successfully to ${to}`);

      // Log successful email dispatch to durable emaillog table
      await logEmailEvent({
        siteId,
        category: "transactional",
        triggerKey,
        templateId: template?.id || null,
        toEmail: to,
        toName: variables?.name || null,
        fromEmail,
        subject,
        provider,
        status: "sent",
        html: getLogSafeHtml(triggerKey, html),
        meta: { variables: redactSensitiveVariables(triggerKey, variables), replyTo },
      });

      // Sensitive transactional actions mirrored into Security Audit Logs
      if (triggerKey === "password_reset" || triggerKey === "password_changed") {
        try {
          await logAction(siteId, variables?.userId || null, "EMAIL_SENT", { triggerKey, to });
        } catch (auditErr) {
          // Dual-logging error should never fail the main request
          console.warn("[EmailService] Audit log mirror failed:", auditErr?.message);
        }
      }

      return { success: true };
    } catch (err) {
      console.error(`[EmailService] Failed to send "${triggerKey}" email to ${to}:`, err);

      // Log failure to durable emaillog table
      await logEmailEvent({
        siteId,
        category: "transactional",
        triggerKey,
        templateId: template?.id || null,
        toEmail: to,
        toName: variables?.name || null,
        fromEmail: fromEmail || null,
        subject: subject || triggerKey,
        provider: provider || null,
        status: "failed",
        errorMessage: err.message,
        html: getLogSafeHtml(triggerKey, rawHtml),
        meta: { variables: redactSensitiveVariables(triggerKey, variables), replyTo },
      });

      // Backward compatibility with legacy settings failedLogs array
      await this.logEmailFailure(siteId, err.message, { context: triggerKey, to });
      throw err;
    }
  }

  async sendOtpVerificationEmail(siteId, email, name, otpCode) {
    return this.sendByTrigger(siteId, "user_verification", email, { name, email, otpCode });
  }

  async sendNewsletterWelcomeEmail(siteId, email) {
    return this.sendByTrigger(siteId, "newsletter_welcome", email, { email });
  }

  async sendLeadWelcomeEmail(siteId, lead) {
    return this.sendByTrigger(siteId, "lead_auto_reply", lead.email, {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      serviceInterest: lead.serviceInterest,
    });
  }
}

export const emailService = new EmailService();
