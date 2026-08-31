// src/lib/observability/sentryOptions.js

/**
 * Shared safe Sentry initialization options factory.
 * Includes sanitization for sensitive data and environment mapping.
 */

const PIIRegex = /authorization|cookie|set-cookie|password|token|accessToken|refreshToken|apiKey|secret/i;

export function getSentryOptions() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    
    beforeSend(event, hint) {
      // Filter out known expected errors (e.g., 4xx validation or auth)
      const error = hint?.originalException;
      if (error && error.name) {
        if (['ValidationError', 'AuthError'].includes(error.name)) {
          return null; // Drop this event
        }
      }

      // Redact sensitive headers/data in the event
      if (event.request?.headers) {
        for (const key of Object.keys(event.request.headers)) {
          if (PIIRegex.test(key)) {
            event.request.headers[key] = "[REDACTED]";
          }
        }
      }

      if (event.request?.data) {
        if (typeof event.request.data === 'object' && event.request.data !== null) {
          const redactedData = { ...event.request.data };
          for (const key of Object.keys(redactedData)) {
            if (PIIRegex.test(key)) {
              redactedData[key] = "[REDACTED]";
            }
          }
          // specific endpoints like contact form body
          if (event.request.url?.includes('contact-form') || event.request.url?.includes('email')) {
             if (redactedData.body || redactedData.email || redactedData.phone) {
                 redactedData.body = "[REDACTED]";
                 redactedData.email = "[REDACTED]";
                 redactedData.phone = "[REDACTED]";
             }
          }
          // Do not send full request bodies or uploaded file contents
          if (redactedData.file || redactedData.files || redactedData.content) {
              redactedData.file = "[REDACTED]";
              redactedData.files = "[REDACTED]";
          }
          event.request.data = redactedData;
        } else if (typeof event.request.data === 'string') {
          // crude redaction for string bodies if they contain sensitive words
          if (PIIRegex.test(event.request.data)) {
            event.request.data = "[REDACTED_STRING_BODY]";
          }
        }
      }

      return event;
    },
  };
}
