import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { z } from 'zod';
import { apiSuccess } from '@/core/errors';
import { getRequestId } from "@/lib/observability/requestContext";

function slugify(text = '') {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

const CreateZoneSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

// The active frontend ad zones physically embedded on the live website
const ACTIVE_FRONTEND_ZONES = [
  { name: 'Homepage In-Grid Blog Card (300x250)', slug: 'homepage-blog-card', width: 300, height: 250 },
  { name: 'Homepage Articles Sidebar Skyscraper (300x600)', slug: 'homepage-articles-sidebar', width: 300, height: 600 },
  { name: 'Blog Article Body Top (728x90)', slug: 'article-body-top', width: 728, height: 90 },
  { name: 'Blog Article Body Inline (728x90)', slug: 'article-body-inline', width: 728, height: 90 },
  { name: 'Blog Article Body Bottom (728x90)', slug: 'article-body-bottom', width: 728, height: 90 },
  { name: 'Blog Sidebar Top (300x250)', slug: 'sidebar-top', width: 300, height: 250 },
  { name: 'Blog Sidebar Bottom (300x250)', slug: 'sidebar-bottom', width: 300, height: 250 },
  { name: 'Magazine Reader Hero Sidebar (300x600)', slug: 'publication-hero-sidebar', width: 300, height: 600 },
  { name: 'Magazine Reader Bottom Sidebar (300x250)', slug: 'publication-sidebar-ad', width: 300, height: 250 },
  { name: 'About Page Hero Bottom (728x90)', slug: 'about-hero-bottom', width: 728, height: 90 },
  { name: 'About Page Mission Bottom (970x90)', slug: 'about-mission-bottom', width: 970, height: 90 },
];

// Unused ghost zones that were not placed on frontend pages
const GHOST_ZONES = [
  'homepage-quiz-card',
  'homepage-hero-bottom',
  'homepage-articles-bottom',
  'homepage-about-bottom',
  'homepage-events-bottom',
  'hero-sidebar-bottom',
  'services-top',
];

export async function GET(req) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    // 1. Remove ghost zones that have 0 ads assigned to them
    try {
      const ghostRecords = await prisma.adZone.findMany({
        where: {
          siteId: auth.siteId,
          slug: { in: GHOST_ZONES },
        },
        include: { _count: { select: { ads: true } } },
      });

      const unusedGhostIds = ghostRecords
        .filter((z) => !z._count || z._count.ads === 0)
        .map((z) => z.id);

      if (unusedGhostIds.length > 0) {
        await prisma.adZone.deleteMany({
          where: { id: { in: unusedGhostIds } },
        });
      }
    } catch (cleanupErr) {
      logger.warn({ err: cleanupErr }, 'AdZone ghost cleanup non-critical warning');
    }

    // 2. Fetch existing zones
    let zones = await prisma.adZone.findMany({
      where: { siteId: auth.siteId },
      orderBy: { name: 'asc' },
    });

    // 3. Ensure all active frontend zones exist
    const existingSlugs = new Set(zones.map((z) => z.slug));
    const missingZones = ACTIVE_FRONTEND_ZONES.filter((rz) => !existingSlugs.has(rz.slug));

    if (missingZones.length > 0) {
      await prisma.adZone.createMany({
        data: missingZones.map((z) => ({
          siteId: auth.siteId,
          name: z.name,
          slug: z.slug,
          width: z.width,
          height: z.height,
        })),
        skipDuplicates: true,
      });

      zones = await prisma.adZone.findMany({
        where: { siteId: auth.siteId },
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json(apiSuccess({ zones }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, 'Fetch ad zones error:');
    return NextResponse.json({ error: 'Failed to fetch ad zones' }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await req.json();
    const data = CreateZoneSchema.parse(body);
    const baseSlug = data.slug ? slugify(data.slug) : slugify(data.name);

    const existing = await prisma.adZone.findFirst({
      where: { siteId: auth.siteId, slug: baseSlug },
    });

    if (existing) {
      return NextResponse.json({ error: 'A zone with this slug or name already exists' }, { status: 400 });
    }

    const zone = await prisma.adZone.create({
      data: {
        siteId: auth.siteId,
        name: data.name.trim(),
        slug: baseSlug,
        width: data.width || null,
        height: data.height || null,
      },
    });

    return NextResponse.json(apiSuccess({ zone }), { status: 201 });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, 'Create zone error:');
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create zone' }, { status: 500 });
  }
}
