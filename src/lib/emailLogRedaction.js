/**
 * emailLogRedaction.js
 * Sanitizes and redacts sensitive credentials (OTPs, password-reset tokens)
 * before they reach durable email logs to prevent credential leakage in audit logs and CRM.
 */

// Trigger keys whose `variables` may contain live credentials, and the
// specific keys within `variables` that must never be persisted.
export const SENSITIVE_TRIGGER_FIELDS = {
  otp_verification: ["otpCode"],
  user_verification: ["otpCode"],
  password_reset: ["token", "resetUrl"],
};

export const SENSITIVE_TRIGGERS = new Set([
  "otp_verification",
  "user_verification",
  "password_reset",
]);

/**
 * Strips sensitive keys from the variables payload before logging.
 *
 * @param {string} triggerKey
 * @param {Record<string, any>} [variables={}]
 * @returns {Record<string, any>}
 */
export function redactSensitiveVariables(triggerKey, variables = {}) {
  if (!variables || typeof variables !== "object") return variables;

  const sensitiveKeys = SENSITIVE_TRIGGER_FIELDS[triggerKey];
  if (!sensitiveKeys) return variables;

  const redacted = { ...variables };
  for (const key of sensitiveKeys) {
    if (redacted[key] !== undefined) {
      redacted[key] = "[REDACTED]";
    }
  }
  return redacted;
}

/**
 * Returns a sanitized HTML body for email logging.
 * Suppresses bodyPreview generation for sensitive credential-bearing triggers.
 *
 * @param {string} triggerKey
 * @param {string|null} html
 * @returns {string|null}
 */
export function getLogSafeHtml(triggerKey, html) {
  if (SENSITIVE_TRIGGERS.has(triggerKey)) {
    return null;
  }
  return html || null;
}
