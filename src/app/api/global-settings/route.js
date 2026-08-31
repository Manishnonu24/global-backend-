import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSiteId } from "@/lib/siteGuard";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


export async function GET(request) {
  try {
    let siteId;
    try {
      siteId = getSiteId(request);
    } catch (e) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      return NextResponse.json(
        { error: e.message || "Missing siteId" },
        { status: 400 },
      );
    }

    const settings = await prisma.globalSettings.findFirst({
      where: { siteId },
      select: {
        id: true,
        header: true,
        footer: true,
        analytics: true,
        scripts: true,
        websiteSettings: true,
        navigation: true,
        contactDetails: true,
        compliance: true,
        ctaConfig: true,
        performanceConfig: true,
        updatedAt: true,
      },
    });

    if (!settings) {
      return NextResponse.json({
        ok: true,
        settings: {
          header: null,
          footer: null,
          analytics: null,
          scripts: null,
        },
      });
    }

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "GET /api/global-settings error:");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
