import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { z } from "zod";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";

const EditAdSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["banner", "adsense"]).optional(),
  code: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  targetUrl: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ctaText: z.string().nullable().optional(),
  ctaColor: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["draft", "active", "scheduled", "expired"]).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  advertiserId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  priority: z.number().optional(),
  targeting: z.string().nullable().optional(),
  scheduling: z.string().nullable().optional(),
  maxClicks: z.number().nullable().optional(),
});

export async function PUT(req, { params }) {
  const { id } = await params;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await req.json();
    const data = EditAdSchema.parse(body);
    const existing = await prisma.ad.findFirst({
      where: { id, zone: { siteId: auth.siteId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ad record not found" }, { status: 404 });
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.targetUrl !== undefined) updateData.targetUrl = data.targetUrl;
    if (data.headline !== undefined) updateData.headline = data.headline;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
    if (data.ctaColor !== undefined) updateData.ctaColor = data.ctaColor || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    if (data.advertiserId !== undefined) updateData.advertiserId = data.advertiserId || null;
    if (data.campaignId !== undefined) updateData.campaignId = data.campaignId || null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.targeting !== undefined) updateData.targeting = data.targeting || null;
    if (data.scheduling !== undefined) updateData.scheduling = data.scheduling || null;
    if (data.maxClicks !== undefined) updateData.maxClicks = data.maxClicks ?? null;

    const ad = await prisma.ad.update({
      where: { id },
      data: updateData,
      include: {
        zone: true,
        advertiser: true,
        campaign: true,
      },
    });
    return NextResponse.json(apiSuccess({ ad }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Update ad error:");
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const existing = await prisma.ad.findFirst({
      where: { id, zone: { siteId: auth.siteId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ad record not found" }, { status: 404 });
    }
    await prisma.ad.delete({ where: { id } });
    return NextResponse.json(apiSuccess({ message: "Ad deleted successfully" }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Delete ad error:");
    return NextResponse.json({ error: "Failed to delete ad" }, { status: 500 });
  }
}
