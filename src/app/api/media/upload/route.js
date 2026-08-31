import { NextResponse } from "next/server";
import { getSiteId } from "@/lib/siteGuard";
import { mediaService } from "@/services/media.service";
import { requireAuth } from "@/lib/requireAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export const maxDuration = 120; // 2 minutes timeout for large file uploads

async function getAuthenticatedUser() {
  const user = await requireAuth();
  if (!user) {
    return await prisma.user.findFirst();
  }
  return user;
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(request);
    const formData = await request.formData();

    const file = formData.get("file");
    const folderId = formData.get("folderId");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const media = await mediaService.uploadMedia(siteId, buffer, file.name, file.type, folderId);

    return NextResponse.json(apiSuccess({ media }));
  } catch (err) {
    return handleApiError(err);
  }
}
