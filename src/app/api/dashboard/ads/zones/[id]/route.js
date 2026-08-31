import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { z } from 'zod';
import { apiSuccess } from '@/core/errors';
import { getRequestId } from "@/lib/observability/requestContext";


const UpdateZoneSchema = z.object({
  name: z.string().min(1).optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

/**
 * PUT /api/dashboard/ads/zones/[id]
 * Update an existing AdZone's name and/or dimensions.
 * The slug is NOT changeable after creation (it is the stable frontend key).
 */
export async function PUT(req, { params }) {
  const { id } = await params;
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await req.json();
    const data = UpdateZoneSchema.parse(body);

    const existing = await prisma.adZone.findFirst({
      where: { id, siteId: auth.siteId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Zone not found for this site' }, { status: 404 });
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;

    const zone = await prisma.adZone.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(apiSuccess({ zone }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, 'Update zone error:');
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update zone' }, { status: 500 });
  }
}

/**
 * DELETE /api/dashboard/ads/zones/[id]
 * Delete an AdZone. Due to onDelete: Cascade in the schema, all ads assigned
 * to this zone will also be permanently deleted.
 */
export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const existing = await prisma.adZone.findFirst({
      where: { id, siteId: auth.siteId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Zone not found for this site' }, { status: 404 });
    }

    // Count linked ads so we can inform the caller (they will be cascade-deleted)
    const linkedCount = await prisma.ad.count({ where: { zoneId: id } });

    // Cascade: deleting the zone auto-deletes all linked ads via onDelete: Cascade
    await prisma.adZone.delete({ where: { id } });

    return NextResponse.json(apiSuccess({
      message: `Zone deleted.${linkedCount > 0 ? ` ${linkedCount} linked ad(s) were also removed.` : ''}`,
      deletedAds: linkedCount,
    }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, 'Delete zone error:');
    return NextResponse.json({ error: 'Failed to delete zone' }, { status: 500 });
  }
}

