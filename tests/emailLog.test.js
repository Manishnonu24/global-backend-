import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { logEmailEvent } from "@/lib/emailLog";
import {
  redactSensitiveVariables,
  getLogSafeHtml,
  SENSITIVE_TRIGGER_FIELDS,
  SENSITIVE_TRIGGERS,
} from "@/lib/emailLogRedaction";

describe("Unified Email Logging (logEmailEvent)", () => {
  afterAll(async () => {
    try {
      await prisma.emaillog.deleteMany({
        where: {
          toEmail: {
            in: [
              "unit-test@example.com",
              "failed-user@example.com",
              "minimal@example.com",
              "sensitive-otp@example.com",
              "sensitive-reset@example.com",
              "safe-welcome@example.com",
            ],
          },
        },
      });
    } catch (_) {}
  });

  it("creates a durable email log record for transactional email", async () => {
    const log = await logEmailEvent({
      siteId: "AHP",
      category: "transactional",
      triggerKey: "general_notification",
      toEmail: "unit-test@example.com",
      toName: "Unit Tester",
      fromEmail: "noreply@ahealthplace.com",
      subject: "Unit Test Notification",
      provider: "resend",
      status: "sent",
      html: "<p>Please click here to view your notification.</p>",
      meta: { source: "vitest" },
    });

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
    expect(log.category).toBe("transactional");
    expect(log.triggerKey).toBe("general_notification");
    expect(log.toEmail).toBe("unit-test@example.com");
    expect(log.toName).toBe("Unit Tester");
    expect(log.subject).toBe("Unit Test Notification");
    expect(log.provider).toBe("resend");
    expect(log.status).toBe("sent");
    expect(log.bodyPreview).toContain("Please click here to view your notification.");
  });

  it("handles failure events and records error messages", async () => {
    const log = await logEmailEvent({
      siteId: "AHP",
      category: "transactional",
      triggerKey: "otp_verification",
      toEmail: "failed-user@example.com",
      provider: "resend",
      status: "failed",
      errorMessage: "Resend API key is invalid",
    });

    expect(log).toBeDefined();
    expect(log.status).toBe("failed");
    expect(log.errorMessage).toBe("Resend API key is invalid");
  });

  it("safely handles null/missing optional fields without throwing", async () => {
    const log = await logEmailEvent({
      toEmail: "minimal@example.com",
    });

    expect(log).toBeDefined();
    expect(log.siteId).toBeDefined();
    expect(log.category).toBe("transactional");
    expect(log.status).toBe("sent");
  });

  it("returns null if toEmail is missing without throwing", async () => {
    const log = await logEmailEvent({});
    expect(log).toBeNull();
  });
});

describe("Sensitive Credential Redaction (emailLogRedaction)", () => {
  it("redacts otpCode for otp_verification and user_verification", () => {
    const otpVars = { name: "Alice", email: "alice@example.com", otpCode: "849201" };
    const redactedOtp = redactSensitiveVariables("otp_verification", otpVars);
    expect(redactedOtp.otpCode).toBe("[REDACTED]");
    expect(redactedOtp.name).toBe("Alice");

    const redactedUser = redactSensitiveVariables("user_verification", otpVars);
    expect(redactedUser.otpCode).toBe("[REDACTED]");
    expect(redactedUser.email).toBe("alice@example.com");
  });

  it("redacts token and resetUrl for password_reset", () => {
    const resetVars = {
      userId: "u123",
      token: "secret_live_token_abc123",
      resetUrl: "https://ahealthplace.com/reset-password?token=secret_live_token_abc123",
    };
    const redacted = redactSensitiveVariables("password_reset", resetVars);
    expect(redacted.token).toBe("[REDACTED]");
    expect(redacted.resetUrl).toBe("[REDACTED]");
    expect(redacted.userId).toBe("u123");
  });

  it("preserves variables for non-sensitive triggers", () => {
    const welcomeVars = { email: "sub@example.com", source: "footer" };
    const leadVars = { name: "Bob", email: "bob@example.com", serviceInterest: "Nutrition", phone: "1234567890" };

    expect(redactSensitiveVariables("newsletter_welcome", welcomeVars)).toEqual(welcomeVars);
    expect(redactSensitiveVariables("lead_auto_reply", leadVars)).toEqual(leadVars);
  });

  it("suppresses bodyPreview via getLogSafeHtml for sensitive triggers and preserves non-sensitive HTML", () => {
    const sensitiveHtml = "<div>Your verification code is <strong>123456</strong></div>";
    const nonSensitiveHtml = "<div>Welcome to the newsletter!</div>";

    expect(getLogSafeHtml("otp_verification", sensitiveHtml)).toBeNull();
    expect(getLogSafeHtml("user_verification", sensitiveHtml)).toBeNull();
    expect(getLogSafeHtml("password_reset", sensitiveHtml)).toBeNull();

    expect(getLogSafeHtml("newsletter_welcome", nonSensitiveHtml)).toBe(nonSensitiveHtml);
    expect(getLogSafeHtml("lead_auto_reply", nonSensitiveHtml)).toBe(nonSensitiveHtml);
  });

  it("persists redacted meta and null bodyPreview in logEmailEvent for sensitive triggers", async () => {
    const otpVars = { name: "Eve", otpCode: "998877" };
    const rawOtpBody = "<div>Your OTP is 998877</div>";

    const log = await logEmailEvent({
      siteId: "AHP",
      category: "transactional",
      triggerKey: "otp_verification",
      toEmail: "sensitive-otp@example.com",
      status: "sent",
      html: getLogSafeHtml("otp_verification", rawOtpBody),
      meta: { variables: redactSensitiveVariables("otp_verification", otpVars) },
    });

    expect(log).toBeDefined();
    expect(log.bodyPreview).toBeNull();
    expect(log.meta.variables.otpCode).toBe("[REDACTED]");
    expect(log.meta.variables.name).toBe("Eve");
  });
});

