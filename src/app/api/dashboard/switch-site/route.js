import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


export async function POST(req) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await req.json();
    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    // 1. Verify access
    const isSuper = user.globalRole === "SUPERADMIN" || user.globalRole === "ADMIN";
    const membership = isSuper
      ? true
      : await prisma.siteUser.findFirst({
          where: { userId: user.id, siteId },
        });

    if (!membership) {
      return NextResponse.json({ error: "Access Denied: You do not belong to this site workspace" }, { status: 403 });
    }

    // 2. Set cookie
    const cookieStore = await cookies();
    cookieStore.set("active_site_id", siteId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json(apiSuccess({ siteId }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "switch-site POST error:");
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
