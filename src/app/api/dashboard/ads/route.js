import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { z } from "zod";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";

const CreateAdSchema = z.object({
  zoneId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["banner", "adsense"]),
  code: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  targetUrl: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ctaText: z.string().nullable().optional(),
  ctaColor: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  status: z.enum(["draft", "active", "scheduled", "expired"]).default("active"),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  advertiserId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  priority: z.number().default(50),
  targeting: z.string().nullable().optional(),
  scheduling: z.string().nullable().optional(),
  maxClicks: z.number().nullable().optional(),
});

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const ads = await prisma.ad.findMany({
      where: {
        zone: { siteId: auth.siteId },
      },
      include: {
        zone: true,
        advertiser: true,
        campaign: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(apiSuccess({ ads }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Fetch ads error:");
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await req.json();
    const data = CreateAdSchema.parse(body);
    const zone = await prisma.adZone.findFirst({
      where: {
        id: data.zoneId,
        siteId: auth.siteId,
      },
    });
    if (!zone) {
      return NextResponse.json({ error: "Selected zone not found for this site" }, { status: 404 });
    }
    const ad = await prisma.ad.create({
      data: {
        zoneId: data.zoneId,
        name: data.name,
        type: data.type,
        code: data.code || null,
        imageUrl: data.imageUrl || null,
        targetUrl: data.targetUrl || null,
        headline: data.headline || null,
        description: data.description || null,
        ctaText: data.ctaText || null,
        ctaColor: data.ctaColor || null,
        isActive: data.isActive,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        advertiserId: data.advertiserId || null,
        campaignId: data.campaignId || null,
        priority: data.priority,
        targeting: data.targeting || null,
        scheduling: data.scheduling || null,
        maxClicks: data.maxClicks ?? null,
      },
      include: {
        zone: true,
        advertiser: true,
        campaign: true,
      },
    });
    return NextResponse.json(apiSuccess({ ad }), { status: 201 });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Create ad error:");
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}
