import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const alerts = await prisma.notificationAlert.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const unreadCount = await prisma.notificationAlert.count({
      where: { siteId: auth.siteId, isRead: false }
    });

    return NextResponse.json(apiSuccess({ alerts, unreadCount }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // Check if notification exists and belongs to this site
      const notification = await prisma.notificationAlert.findFirst({
        where: { id, siteId: auth.siteId }
      });
      if (!notification) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
      await prisma.notificationAlert.delete({ where: { id } });
    } else {
      // Clear all notifications for the site
      await prisma.notificationAlert.deleteMany({
        where: { siteId: auth.siteId }
      });
    }

    return NextResponse.json(apiSuccess({ message: "Notifications cleared successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
