# Monitoring and Observability

## Uptime Monitoring

Uptime and synthetic checks for this application are configured externally via **Grafana Cloud Synthetic Monitoring**. 

Grafana Cloud should be configured (via the web UI under Testing & Synthetics) to ping the following endpoint:

- **Endpoint**: `GET /api/health`
- **Expected Status Code**: `200 OK`
- **Expected Response**:
  ```json
  {
    "status": "ok",
    "checks": {
      "db": "ok",
      "redis": "ok"
    },
    "timestamp": "2026-07-28T00:00:00.000Z"
  }
  ```

If a critical infrastructure component (e.g., Database or Redis) is unreachable, the endpoint returns a `503 Service Unavailable` with `status: "error"`. 

**Note**: This endpoint is public and does not require authentication. To prevent data leakage, stack traces and internal paths are explicitly omitted from the response.

## Centralized Logging

Structured logging is implemented using `pino`. Logs are printed to `stdout` in JSON format.

Grafana Loki log shipping is supported natively via the `pino-loki` transport and redacts sensitive information like authorization headers and API keys.

To enable Grafana Loki log shipment, ensure the following environment variables are set:
- `GRAFANA_LOKI_HOST`: The host for Loki (e.g. `https://logs-prod-us-central1.grafana.net`)
- `GRAFANA_LOKI_ENDPOINT`: The Loki push endpoint (defaults to `/loki/api/v1/push`)
- `GRAFANA_LOKI_USER`: Your Grafana Cloud numeric User ID
- `GRAFANA_LOKI_API_KEY`: Your Grafana API Key
- `GRAFANA_LOKI_URL`: Legacy combined URL fallback (stripped to host)

These credentials can be found in the Grafana Cloud portal under **Connections > Data Sources > Loki**.

### Smoke Testing Loki

To verify logs are reaching Grafana Loki, ensure `OBSERVABILITY_TEST_ENABLED=true` is set, and as a SUPERADMIN, run:
```bash
curl -X POST "http://localhost:3000/api/debug/log" -H "Cookie: dashboard-session-token=..."
```
This returns a `probeId` and a `lokiQuery`. 
Copy the `lokiQuery` (e.g., `{app="ahp-reimagined"} |= "probe-id"`) and run it in Grafana Cloud Explore to verify the log was ingested.

## Error Tracking

Error tracking is implemented using **Sentry** (`@sentry/nextjs`). Unhandled exceptions and API route errors are automatically captured and sent to Sentry. The `requestId` is included as a tag to allow cross-referencing between Sentry events and Grafana Loki logs.

Required Sentry environment variables:
- `NEXT_PUBLIC_SENTRY_DSN`: Public DSN for browser errors
- `SENTRY_DSN`: Private DSN for server-side errors
- `SENTRY_ENVIRONMENT`: The environment (e.g., `production`, `staging`)
- `SENTRY_AUTH_TOKEN`: For source-map uploads during builds
- `SENTRY_ORG`: Sentry organization slug
- `SENTRY_PROJECT`: Sentry project slug

### Smoke Testing Sentry

To verify Sentry captures unhandled errors, ensure `OBSERVABILITY_TEST_ENABLED=true` is set, and as a SUPERADMIN, run:
```bash
curl -X POST "http://localhost:3000/api/debug/sentry" -H "Cookie: dashboard-session-token=..."
```
This returns an `eventId`. Go to your Sentry dashboard and search for the event ID to confirm successful integration.

## Internal Status Page

A minimal status dashboard is available at `/dashboard/status` for **SUPERADMIN** users only. This dashboard provides a quick, high-level overview of infrastructure health, verifies if Sentry and Loki SDK configurations are present via environment variables, and links directly to the external observability platforms.
