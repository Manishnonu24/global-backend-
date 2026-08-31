import { NextResponse } from "next/server";

/**
 * Validates CRON_SECRET from Bearer token, x-cron-secret header, or ?secret= query parameter.
 * Returns null if valid, or a NextResponse (401/403) if unauthorized.
 *
 * Supported authentication methods:
 * 1. Header: Authorization: Bearer <CRON_SECRET>
 * 2. Header: x-cron-secret: <CRON_SECRET>
 * 3. Query Param: ?secret=<CRON_SECRET>
 *
 * @param {Request} req
 * @returns {NextResponse|null}
 */
export function verifyCronSecret(req) {
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret");
  const authHeader = req.headers.get("authorization") || req.headers.get("x-cron-secret");
  const token = (authHeader ? authHeader.replace("Bearer ", "").trim() : null) || secretParam;

  if (cronSecret) {
    if (token !== cronSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing cron secret" },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === "production" || process.env.FORCE_CRON_SECRET === "true") {
    return NextResponse.json(
      { success: false, error: "Forbidden: CRON_SECRET is not configured in production environment" },
      { status: 403 }
    );
  }

  return null;
}
