import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = { siteId: auth.siteId };
    if (status) {
      where.status = status;
    }

    const subscribers = await prisma.newsletter.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(apiSuccess({ subscribers }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if already subscribed in legacy table
    const existing = await prisma.newsletter.findFirst({
      where: { siteId: auth.siteId, email: cleanEmail },
    });

    let legacySubscriber;

    if (existing) {
      // If unsubscribed, re-activate
      if (existing.status !== "active") {
        legacySubscriber = await prisma.newsletter.update({
          where: { id: existing.id },
          data: { status: "active" },
        });
      } else {
        return NextResponse.json({ error: "Email already subscribed" }, { status: 409 });
      }
    } else {
      legacySubscriber = await prisma.newsletter.create({
        data: {
          siteId: auth.siteId,
          email: cleanEmail,
          status: "active",
        },
      });
    }

    // Sync to CRM subscriber list
    try {
      const { subscriberService } = await import("@/services/subscriber.service");
      await subscriberService.createSubscriber(auth.siteId, {
        email: cleanEmail,
        status: "active",
        tags: "admin-created",
        metadata: { source: "admin-dashboard" }
      });
    } catch (e) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(e, { tags: { requestId: _reqId } });
    logger.error({ err: e, requestId: _reqId }, "Failed to sync admin-created subscriber to CRM:");
    }

    return NextResponse.json(apiSuccess({ subscriber: legacySubscriber }), { status: 201 });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
