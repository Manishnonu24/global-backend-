import { NextResponse } from 'next/server';

/**
 * LEGACY ROUTES — These endpoints previously queried prisma.legacyAd / prisma.legacyAdEvent,
 * which are not part of the current Prisma schema.
 *
 * The current ad system uses prisma.ad + prisma.adZone, managed via:
 *   GET/POST /api/dashboard/ads
 *   GET/PUT/DELETE /api/dashboard/ads/[id]
 *   GET /api/ads/serve   (public ad serving)
 *   POST /api/ads/analytics  (impression/click tracking)
 *
 * These legacy routes are kept as stubs to avoid 404s if any old client calls them.
 */

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/dashboard/ads instead.', deprecated: true },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/dashboard/ads instead.', deprecated: true },
    { status: 410 }
  );
}
