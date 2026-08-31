import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiSuccess } from '@/core/errors';
import { getRequestId } from "@/lib/observability/requestContext";


/**
 * POST /api/ads/analytics
 * Public endpoint called by AdSlot.js to record impressions and clicks.
 * Body: { adId: string, type: 'impression' | 'click' }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { adId, type } = body;

    if (!adId || !['impression', 'click'].includes(type)) {
      return NextResponse.json({ error: 'Invalid adId or tracking type' }, { status: 400 });
    }

    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) {
      // Silently succeed — don't leak ad existence to public
      return NextResponse.json(apiSuccess({ success: true }));
    }

    const ipAddress = req.headers.get('x-forwarded-for') || null;
    const userAgent = req.headers.get('user-agent') || null;

    const willExceedClicks =
      type === 'click' &&
      ad.maxClicks !== null &&
      ad.maxClicks !== undefined &&
      ad.clicks + 1 >= ad.maxClicks;

    await prisma.$transaction([
      prisma.ad.update({
        where: { id: adId },
        data: {
          impressions: type === 'impression' ? { increment: 1 } : undefined,
          clicks: type === 'click' ? { increment: 1 } : undefined,
          isActive: willExceedClicks ? false : undefined,
          status: willExceedClicks ? 'expired' : undefined,
        },
      }),
      prisma.adAnalytic.create({
        data: { adId, type, ipAddress, userAgent },
      }),
    ]);

    return NextResponse.json(apiSuccess({ success: true, autoDeactivated: willExceedClicks }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, 'Ad analytics tracking error:');
    // Always return 200 to avoid breaking page load for a tracking failure
    return NextResponse.json(apiSuccess({ success: false }));
  }
}
