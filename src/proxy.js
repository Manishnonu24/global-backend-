import { NextResponse } from "next/server";
import { getDefaultSiteId } from "@/lib/siteResolver";
import prisma from "@/lib/prisma";

// In-memory cache for middleware settings and redirects (5 min TTL)
const middlewareCache = {
  settings: {},   // key: siteId, value: { data: ws, expiresAt: number }
  redirects: {},  // key: siteId_source, value: { data: rule, expiresAt: number }
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Path prefixes that should never be blocked by maintenance mode */
const SKIP_PREFIXES = [
  "/api/",
  "/_next",
  "/dashboard",
  "/crm",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/preview",
  "/images/",
  "/fonts/",
  "/icons/",
];

/** Static file extensions to skip checks for */
const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".json",
  ".txt",
  ".xml",
];

function shouldSkipMaintenanceCheck(pathname) {
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  return false;
}

export async function proxy(request) {
  const origin = request.headers.get("origin") || "*";
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Always inject x-pathname and x-request-id header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const reqId = requestHeaders.get("x-request-id") || crypto.randomUUID();
  requestHeaders.set("x-request-id", reqId);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", reqId);

  // --------------- Private Services SEO Guard ---------------
  if (pathname.startsWith("/services/private/")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  // --------------- CORS handling (API routes only) ---------------
  if (pathname.startsWith("/api/")) {
    const allowedOriginsStr = process.env.ALLOWED_CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "";
    const allowedOrigins = allowedOriginsStr.split(",").map(o => o.trim()).filter(Boolean);
    const isIpOrigin = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);
    const isLocalOrigin = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin === "null";
    const isAllowedOrigin = allowedOrigins.includes(origin) || allowedOrigins.includes("*") || isIpOrigin || isLocalOrigin || process.env.NODE_ENV !== "production";

    const corsOrigin = isAllowedOrigin ? origin : (allowedOrigins[0] || "");

    if (request.method === "OPTIONS") {
      const preflightHeaders = {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-site-id, x-integration-key, x-requested-with, ngrok-skip-browser-warning, x-request-id",
        "Access-Control-Max-Age": "86400",
      };
      if (isAllowedOrigin) {
        preflightHeaders["Access-Control-Allow-Credentials"] = "true";
      }
      return new NextResponse(null, {
        status: 204,
        headers: preflightHeaders,
      });
    }

    if (corsOrigin) {
      response.headers.set("Access-Control-Allow-Origin", corsOrigin);
    }
    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-site-id, x-integration-key, x-requested-with, ngrok-skip-browser-warning, x-request-id"
    );
    return response;
  }

  // Determine siteId from request, or fall back to environment variable configuration
  const siteId =
    request.headers.get("x-site-id") ||
    url.searchParams.get("siteId") ||
    getDefaultSiteId();

  // --------------- Admin/CRM Auth Guard ---------------
  const ADMIN_PATHS = ["/dashboard", "/crm", "/preview"];
  const isDashboardPath = ADMIN_PATHS.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/dashboard/login");
  if (isDashboardPath) {
    let token = null;
    try {
      const { getToken } = await import("next-auth/jwt");
      const { getDashboardSessionCookieName, isDashboardAuthCookieSecure } = await import("@/lib/dashboardAuthCookie");
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: getDashboardSessionCookieName(),
        secureCookie: isDashboardAuthCookieSecure()
      });
      if (!token) {
        token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: "dashboard-session-token",
          secureCookie: false
        });
      }
      if (!token) {
        token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: "__Secure-dashboard-session-token",
          secureCookie: true
        });
      }
    } catch (err) {
      console.error("[Middleware] JWT verification error:", err);
    }

    if (!token || token.globalRole === "USER" || token.globalRole === "VISITOR" || !token.globalRole) {
      const loginUrl = new URL("/dashboard/login", url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --------------- Parallelized Maintenance & Redirect Checks ---------------
  const checkMaintenance = !shouldSkipMaintenanceCheck(pathname);
  const checkRedirect = !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/maintenance") &&
    !isDashboardPath;

  if (checkMaintenance || checkRedirect) {
    const now = Date.now();
    const settingsCacheKey = siteId;
    const redirectCacheKey = `${siteId}_${pathname}`;

    // Determine if we need to fetch settings
    let settingsPromise = null;
    let cachedSettings = middlewareCache.settings[settingsCacheKey];
    if (checkMaintenance && (!cachedSettings || cachedSettings.expiresAt < now)) {
      settingsPromise = prisma.globalSettings
        .findUnique({
          where: { siteId },
          select: { websiteSettings: true },
        })
        .then((res) => res?.websiteSettings || null)
        .catch((err) => {
          console.error("Maintenance check failed:", err.message);
          return null;
        });
    }

    // Determine if we need to fetch redirect
    let redirectPromise = null;
    let cachedRedirect = middlewareCache.redirects[redirectCacheKey];
    if (checkRedirect && (!cachedRedirect || cachedRedirect.expiresAt < now)) {
      const formattedSource = pathname.trim().startsWith("/") ? pathname.trim() : `/${pathname.trim()}`;
      redirectPromise = prisma.redirect
        .findUnique({
          where: {
            siteId_source: { siteId, source: formattedSource },
          },
        })
        .catch((err) => {
          console.error("Redirect check failed:", err.message);
          return null;
        });
    }

    if (settingsPromise || redirectPromise) {
      console.log(`[Middleware] Fetching updates in parallel: settings=${!!settingsPromise}, redirect=${!!redirectPromise}`);
      try {
        const [settingsResult, redirectResult] = await Promise.all([settingsPromise, redirectPromise]);

        if (settingsPromise) {
          middlewareCache.settings[settingsCacheKey] = {
            data: settingsResult || null,
            expiresAt: now + CACHE_TTL_MS
          };
          cachedSettings = middlewareCache.settings[settingsCacheKey];
        }

        if (redirectPromise) {
          middlewareCache.redirects[redirectCacheKey] = {
            data: redirectResult || null,
            expiresAt: now + CACHE_TTL_MS
          };
          cachedRedirect = middlewareCache.redirects[redirectCacheKey];
        }
      } catch (err) {
        console.error("Parallel fetch failed in middleware:", err.message);
      }
    } else {
      console.log(`[Middleware] Cache hit for settings & redirect. Skipping fetch.`);
    }

    // Handle Maintenance Mode
    if (checkMaintenance && cachedSettings?.data) {
      const ws = cachedSettings.data;
      if (ws.maintenanceMode === true) {
        const maintenanceUrl = new URL("/maintenance", url);
        if (ws.maintenanceMessage) {
          maintenanceUrl.searchParams.set("message", ws.maintenanceMessage);
        }
        if (ws.maintenanceImage) {
          maintenanceUrl.searchParams.set("image", ws.maintenanceImage);
        }
        return NextResponse.redirect(maintenanceUrl);
      }
    }

    // Handle Redirects
    if (checkRedirect && cachedRedirect?.data) {
      const rule = cachedRedirect.data;
      console.log(`[Middleware] Evaluating redirect for ${pathname} -> target: ${rule.target}, type: ${rule.type}`);
      if (rule.target && rule.target !== pathname) {
        const redirectUrl = new URL(rule.target, url);
        const status = parseInt(rule.type) || 301;
        console.log(`[Middleware] Executing redirect to ${redirectUrl.toString()} with status ${status}`);
        return NextResponse.redirect(redirectUrl, status);
      }
    } else if (checkRedirect) {
      console.log(`[Middleware] No active redirect found for ${pathname}`);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // API routes (with CORS handling)
    "/api/:path*",
    // All page routes (for maintenance, redirects, auth guard)
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
