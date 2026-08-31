import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { getRedisStatus, isRedisConfigured } from "@/lib/redis";
import { apiSuccess, handleApiError } from "@/core/errors";

const TIMEOUT_MS = 2000;

function withTimeout(promise, ms, failureMsg) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(failureMsg));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function sanitizeExternalUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return null;
  const trimmed = urlStr.trim();
  if (!trimmed || trimmed === "#") return null;
  try {
    const parsed = new URL(trimmed);
    // Allow https in all envs; allow http only in dev
    if (parsed.protocol === "https:" || (process.env.NODE_ENV === "development" && parsed.protocol === "http:")) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const isSuperAdmin = auth.user?.globalRole === "SUPERADMIN";

    // Application health checks
    let dbStatus = "error";
    let redisStatus = "disabled";

    try {
      await withTimeout(prisma.$queryRaw`SELECT 1`, TIMEOUT_MS, "DB check timed out");
      dbStatus = "ok";
    } catch {
      dbStatus = "error";
    }

    const redis = await getRedisStatus(TIMEOUT_MS);
    redisStatus = redis.status;

    // Site-scoped error logs count
    let siteErrorLogsCount = 0;
    try {
      siteErrorLogsCount = await prisma.systemErrorLog.count({
        where: { siteId: auth.siteId },
      });
    } catch {
      // Non-fatal
    }

    const appStatus =
      dbStatus === "ok" && (!isRedisConfigured() || redisStatus === "ok")
        ? "healthy"
        : "degraded";

    // If not SUPERADMIN, return only site-scoped application health (no global configs)
    if (!isSuperAdmin) {
      return NextResponse.json(
        apiSuccess({
          isSuperAdmin: false,
          application: {
            status: appStatus,
            database: dbStatus,
            redis: redisStatus,
            siteErrorLogsCount,
            lastChecked: new Date().toISOString(),
          },
        })
      );
    }

    // Global configuration status for SUPERADMIN
    const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    const sentryBrowserDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
    const sentryProjectUrl = sanitizeExternalUrl(process.env.SENTRY_PROJECT_URL);

    const lokiHost = process.env.GRAFANA_LOKI_HOST || process.env.GRAFANA_LOKI_URL;
    const lokiUser = process.env.GRAFANA_LOKI_USER;
    const lokiKey = process.env.GRAFANA_LOKI_API_KEY;
    const lokiDashboardUrl = sanitizeExternalUrl(process.env.GRAFANA_DASHBOARD_URL);

    const syntheticUrl = sanitizeExternalUrl(process.env.GRAFANA_SYNTHETIC_CHECK_URL);

    const environment =
      process.env.OBSERVABILITY_ENV ||
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "development";

    const testEnabled = process.env.OBSERVABILITY_TEST_ENABLED === "true";

    return NextResponse.json(
      apiSuccess({
        isSuperAdmin: true,
        sentry: {
          runtimeConfigured: Boolean(sentryDsn),
          browserConfigured: Boolean(sentryBrowserDsn),
          sourceMapsConfigured: Boolean(sentryAuthToken),
          environment,
          release: process.env.SENTRY_RELEASE || null,
          projectLinkConfigured: Boolean(sentryProjectUrl),
          projectUrl: sentryProjectUrl,
          testEnabled,
        },
        loki: {
          writeTransportConfigured: Boolean(lokiHost && lokiUser && lokiKey),
          hostConfigured: Boolean(lokiHost),
          credentialsConfigured: Boolean(lokiUser && lokiKey),
          appLabel: "ahp-reimagined",
          environment,
          dashboardLinkConfigured: Boolean(lokiDashboardUrl),
          dashboardUrl: lokiDashboardUrl,
          testEnabled,
        },
        syntheticMonitoring: {
          healthEndpoint: "/api/health",
          linkConfigured: Boolean(syntheticUrl),
          syntheticUrl,
        },
        application: {
          status: appStatus,
          database: dbStatus,
          redis: redisStatus,
          siteErrorLogsCount,
          lastChecked: new Date().toISOString(),
        },
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
