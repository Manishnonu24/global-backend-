import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { getRequestId } from "@/lib/observability/requestContext";

export async function GET(request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalUsers, totalMedia, totalSites, recentMedia] = await Promise.all([
      prisma.user.count(),
      prisma.media.count(),
      prisma.site.count(),

      prisma.media.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalMedia,
        totalSites,
      },
      recentMedia,
    });
  } catch (error) {
    const _reqId = getRequestId(request);
    logger.error({ err: error, requestId: _reqId }, "Failed to load dashboard overview stats");

    return NextResponse.json(
      {
        error: "Failed to load dashboard",
      },
      {
        status: 500,
      }
    );
  }
}
