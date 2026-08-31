import { NextResponse } from 'next/server';

/**
 * LEGACY ROUTE — Previously queried prisma.legacyAd (not in current Prisma schema).
 * Kept as a stub to prevent 500s if called.
 * Use /api/dashboard/ads/[id] for ad management.
 */

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/dashboard/ads/[id] instead.', deprecated: true },
    { status: 410 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/dashboard/ads/[id] instead.', deprecated: true },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/dashboard/ads/[id] instead.', deprecated: true },
    { status: 410 }
  );
}
