import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const logs = await prisma.cookieConsentLog.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return NextResponse.json(apiSuccess({ logs }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const siteId = getSiteId(req);
    const body = await req.json();
    const { visitorId, accepted, analytics, marketing, ip } = body;

    if (!visitorId) {
      return NextResponse.json({ success: false, error: "Visitor ID is required" }, { status: 400 });
    }

    const ipHash = ip ? Buffer.from(ip).toString("base64") : null;

    const log = await prisma.cookieConsentLog.create({
      data: {
        siteId,
        visitorId,
        accepted: !!accepted,
        analytics: !!analytics,
        marketing: !!marketing,
        ipHash
      }
    });

    return NextResponse.json(apiSuccess({ log }));
  } catch (err) {
    return handleApiError(err);
  }
}
