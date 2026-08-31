import { isRedisConfigured } from "@/lib/redis";
import { isS3Configured } from "../../../utils/s3Utility";
import { isStripeConfigured } from "@/lib/stripe";
import { isTypesenseConfigured } from "@/lib/typesense";
import { isNovuConfigured } from "@/lib/novu";

function configuredState(configured) {
  return configured ? "ok" : "disabled";
}

export function isLokiConfigured() {
  const lokiHost = process.env.GRAFANA_LOKI_HOST || process.env.GRAFANA_LOKI_URL;
  return Boolean(lokiHost && process.env.GRAFANA_LOKI_USER && process.env.GRAFANA_LOKI_API_KEY);
}

export function isSentryConfigured() {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Optional external platform integration for generating external flipbook links (MagCloudLink).
 * NOTE: Core in-app magazine viewer relies on primary S3 storage (isS3Configured), not this service.
 */
export function isFlipbookConfigured() {
  return Boolean(process.env.FLIPBOOK_API_URL || process.env.NEXT_PUBLIC_FLIPBOOK_API_URL);
}

export function isEmailConfiguredFromEnv() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getOptionalIntegrationStates() {
  return {
    redis: configuredState(isRedisConfigured()),
    sentry: configuredState(isSentryConfigured()),
    loki: configuredState(isLokiConfigured()),
    typesense: configuredState(isTypesenseConfigured()),
    s3: configuredState(isS3Configured()),
    stripe: configuredState(isStripeConfigured()),
    novu: configuredState(isNovuConfigured()),
    recaptcha: configuredState(Boolean(process.env.RECAPTCHA_SECRET_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY)),
    flipbook: configuredState(isFlipbookConfigured()),
    email: configuredState(isEmailConfiguredFromEnv()),
  };
}
