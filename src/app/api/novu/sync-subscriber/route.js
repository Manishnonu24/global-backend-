/**
 * POST /api/novu/sync-subscriber
 *
 * Reconciles all User records in Prisma against Novu subscribers.
 * Can be called:
 *   - Manually by a super-admin
 *   - From a Vercel cron job (add to vercel.json crons)
 *   - After a bulk user import
 *
 * Authorization: SUPERADMIN or ADMIN global role
 *
 * Request body (optional):
 *   { "userId": "clxyz123" }  — sync a single user instead of all users
 *
 * Response:
 *   { success: true, synced: 42, failed: 0, total: 42 }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  syncNovuSubscriber,
  bulkSyncNovuSubscribers,
} from "@/lib/novu-subscriber-sync";
import { handleApiError, apiSuccess } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // Auth check — only super-admin / admin can call this
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["SUPERADMIN", "ADMIN"].includes(session.user.globalRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "AHP";

    // Single-user sync
    if (body.userId) {
      const user = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true, email: true, name: true, globalRole: true, isActive: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const result = await syncNovuSubscriber(siteId, user);
      return NextResponse.json(
        apiSuccess({ synced: result ? 1 : 0, failed: result ? 0 : 1, total: 1 })
      );
    }

    // Bulk sync — all active users
    const users = await prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, email: true, name: true, globalRole: true },
    });

    const { synced, failed } = await bulkSyncNovuSubscribers(siteId, users);

    return NextResponse.json(
      apiSuccess({
        synced,
        failed,
        total: users.length,
        message: `Synced ${synced}/${users.length} users to Novu.`,
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * GET /api/novu/sync-subscriber
 * Returns subscriber sync status (how many users are in Prisma vs Novu).
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["SUPERADMIN", "ADMIN"].includes(session.user.globalRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const total = await prisma.user.count({
      where: { isActive: true, deletedAt: null },
    });

    return NextResponse.json(
      apiSuccess({
        totalUsers: total,
        message: `${total} active users in database. POST to this endpoint to sync all to Novu.`,
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
