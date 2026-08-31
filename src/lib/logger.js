import pino from 'pino';

/**
 * Grafana Cloud Loki transport configuration.
 *
 * Environment variables required:
 *   GRAFANA_LOKI_HOST     – Full base URL of the Loki instance for your stack.
 *                           Example: https://logs-prod-eu-west-0.grafana.net
 *                           Must match the stack that owns the tenant/token below.
 *   GRAFANA_LOKI_URL      – (Legacy) Full push URL. Base host is extracted automatically.
 *                           Example: https://logs-prod-eu-west-0.grafana.net/loki/api/v1/push
 *   GRAFANA_LOKI_ENDPOINT – (Optional) Push path. Defaults to /loki/api/v1/push.
 *   GRAFANA_LOKI_USER     – Numeric Loki log tenant ID (shown as "User" in Grafana Cloud).
 *                           Must belong to the same stack as GRAFANA_LOKI_HOST.
 *   GRAFANA_LOKI_API_KEY  – Grafana Cloud access-policy token with logs:write scope.
 *                           Must belong to the same stack as GRAFANA_LOKI_HOST.
 *
 * Authentication failure checklist:
 *   1. Confirm Host, User (tenant ID) and API key all belong to the SAME Grafana Cloud stack.
 *   2. Confirm the access-policy token has the `logs:write` scope enabled.
 *   3. Confirm GRAFANA_LOKI_HOST does NOT include the /loki/api/v1/push path.
 *   4. Do NOT print or log credentials — they are redacted by the logger below.
 */

const lokiHostConfig   = process.env.GRAFANA_LOKI_HOST?.trim();
const lokiUrlConfig    = process.env.GRAFANA_LOKI_URL?.trim();
const lokiEndpointConfig =
  process.env.GRAFANA_LOKI_ENDPOINT?.trim() || '/loki/api/v1/push';

const lokiUser   = process.env.GRAFANA_LOKI_USER?.trim();
const lokiApiKey = process.env.GRAFANA_LOKI_API_KEY?.trim();

// Resolve the host from GRAFANA_LOKI_HOST first, then strip path from GRAFANA_LOKI_URL.
// Never fall back to any hardcoded Grafana Cloud stack — wrong stack = auth failure.
const lokiHost =
  lokiHostConfig ||
  (lokiUrlConfig
    ? lokiUrlConfig.replace(/\/loki\/api\/v1\/push\/?$/, '')
    : null);

const transports = [];

if (lokiHost && lokiUser && lokiApiKey) {
  let canUseLoki = false;
  try {
    if (typeof require !== 'undefined' && require.resolve) {
      require.resolve('pino-loki');
      canUseLoki = true;
    } else {
      canUseLoki = true;
    }
  } catch {
    canUseLoki = false;
  }

  if (canUseLoki || process.env.NODE_ENV === 'test') {
    transports.push({
      target: 'pino-loki',
      options: {
        batching: true,
        interval: 5,
        host: lokiHost,           // uses the resolved configured host — never hardcoded
        endpoint: lokiEndpointConfig,
        replaceTimestamp: true,
        basicAuth: {
          username: lokiUser,
          password: lokiApiKey,
        },
        labels: {
          service_name: 'ahp-reimagined',
          app: 'ahp-reimagined',
          env: process.env.OBSERVABILITY_ENV || process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        },
      },
    });
  }
}

// Ensure stdout is always available for local dev / generic logging
transports.push({
  target: 'pino/file',
  options: { destination: 1 }, // stdout
});

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'apiKey',
        'secret',
        '*.password',
        '*.token',
        '*.accessToken',
        '*.refreshToken',
        '*.apiKey',
        '*.secret',
        'err.config.headers.Authorization',
      ],
      censor: '[REDACTED]',
    },
  },
  pino.transport({ targets: transports }),
);
