import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { apiSuccess, handleApiError } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    
    // Fetch recent sent push notifications
    const notifications = await prisma.pushNotification.findMany({
      where: {
        siteId,
        status: "sent",
        sendToWebsite: true,
        sentAt: {
          not: null
        }
      },
      orderBy: {
        sentAt: "desc"
      },
      take: 5,
      select: {
        id: true,
        title: true,
        message: true,
        url: true,
        iconUrl: true,
        sentAt: true
      }
    });

    return NextResponse.json(apiSuccess({ notifications }));
  } catch (err) {
    return handleApiError(err);
  }
}
