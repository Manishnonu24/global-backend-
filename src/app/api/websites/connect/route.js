import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma.js";
import { getRequestId } from "@/lib/observability/requestContext";


export async function POST(request) {
  try {
    const body = await request.json();
    const { apiKey, domain, websiteId } = body;

    const dbKey = await prisma.apiKey.findFirst({
      where: {
        key: apiKey,
        isActive: true,
        deletedAt: null
      }
    });

    if (!dbKey) {
      return NextResponse.json({ success: false, error: "Invalid or inactive API Key" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      websiteId: websiteId || dbKey.siteId,
      syncToken: "sync_token_default",
      message: "Website connected and registered successfully."
    });

  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Website connect error:");
    return NextResponse.json({ success: false, error: "Internal server error: " + error.message }, { status: 500 });
  }
}
