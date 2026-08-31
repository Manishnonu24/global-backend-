import { NextResponse } from 'next/server';
import { apiSuccess } from '@/core/errors';

/**
 * LEGACY ROUTE — Previously queried prisma.legacyAd (not in current Prisma schema).
 * Returns an empty ads array so any old caller gets a graceful response.
 * Active ad serving is handled by /api/ads/serve?zone=<slug>
 */
export async function GET() {
  const response = NextResponse.json(apiSuccess({ ads: [] }));
  response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=15');
  return response;
}
