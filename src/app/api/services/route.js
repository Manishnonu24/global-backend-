import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const services = await prisma.service.findMany({
      where: {
        siteId,
        status: "ACTIVE",
        visible: true,
        deletedAt: null,
      },
      orderBy: { sortOrder: "asc" },
      include: { featuredImage: true },
    });
    return NextResponse.json(apiSuccess({ services }));
  } catch (err) {
    return handleApiError(err);
  }
}
