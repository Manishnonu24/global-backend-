import { NextResponse } from "next/server";
import { getSiteId } from "@/lib/siteGuard";
import { mediaService } from "@/services/media.service";
import { requireAuth } from "@/lib/requireAuth";
import { prisma } from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

async function getAuthenticatedUser() {
  const user = await requireAuth();
  if (!user && process.env.NODE_ENV === "development") {
    return await prisma.user.findFirst();
  }
  return user;
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(request);
    const { folderId } = await params;

    await mediaService.deleteFolder(siteId, folderId);
    return NextResponse.json(apiSuccess({ message: "Folder deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
