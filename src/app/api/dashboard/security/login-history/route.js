import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Get all user IDs that belong to this site (via SiteUser) or are global admins
    const siteUsers = await prisma.siteUser.findMany({
      where: { siteId: auth.siteId },
      select: { userId: true },
    });
    const siteUserIds = siteUsers.map((su) => su.userId);

    // Also include global SUPERADMIN and ADMIN users who may not have SiteUser records
    const globalAdmins = await prisma.user.findMany({
      where: {
        globalRole: { in: ["SUPERADMIN", "ADMIN"] },
        id: { notIn: siteUserIds },
      },
      select: { id: true },
    });
    const globalAdminIds = globalAdmins.map((u) => u.id);

    const userIds = [...siteUserIds, ...globalAdminIds];

    const history = await prisma.loginHistory.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            email: true,
            globalRole: true,
          },
        },
      },
    });

    return NextResponse.json(apiSuccess({ loginHistory: history }));
  } catch (error) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(error, { tags: { requestId: _reqId } });
    logger.error({ err: error, requestId: _reqId }, "Login History API Error:");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
