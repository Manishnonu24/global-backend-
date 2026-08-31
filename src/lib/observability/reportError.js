// src/lib/observability/reportError.js
import * as Sentry from "@sentry/nextjs";
import { logger } from "../logger";

const reportedErrors = new WeakSet();

/**
 * Shared helper for reporting unexpected errors.
 * Logs through Pino and captures through Sentry with sanitized context.
 * Avoids double-capturing the exact same Error object.
 *
 * @param {Error} error 
 * @param {Object} context 
 * @param {string} [context.requestId]
 * @param {string} [context.route]
 * @param {string} [context.siteId]
 * @param {string} [context.pageId]
 * @param {string} [context.jobId]
 * @param {string} [context.jobName]
 * @param {number} [context.attemptsMade]
 */
export function reportUnexpectedError(error, context = {}) {
  if (!error) return;

  // Filter expected business/validation errors
  if (['ValidationError', 'AuthError'].includes(error.name) || error.status === 400 || error.status === 401 || error.status === 403 || error.status === 404) {
    return;
  }

  // Prevent double capturing
  if (typeof error === 'object' && error !== null) {
    if (reportedErrors.has(error)) {
      return;
    }
    reportedErrors.add(error);
  }

  // 1. Log through Pino
  logger.error({
    err: error,
    ...context
  }, "Unexpected error occurred");

  // 2. Capture through Sentry
  Sentry.captureException(error, {
    tags: {
      requestId: context.requestId,
      route: context.route,
      siteId: context.siteId,
      pageId: context.pageId,
      jobId: context.jobId,
      jobName: context.jobName,
    },
    extra: {
      attemptsMade: context.attemptsMade,
    }
  });
}
