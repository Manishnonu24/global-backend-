import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function PUT(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      await prisma.notificationAlert.updateMany({
        where: { id, siteId: auth.siteId },
        data: { isRead: true }
      });
    } else {
      await prisma.notificationAlert.updateMany({
        where: { siteId: auth.siteId, isRead: false },
        data: { isRead: true }
      });
    }

    return NextResponse.json(apiSuccess({ message: "Notifications marked as read" }));
  } catch (err) {
    return handleApiError(err);
  }
}
