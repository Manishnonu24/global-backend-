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

export async function POST(request, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(request);
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const updatedMedia = await mediaService.replaceMedia(siteId, id, buffer, file.name, file.type);

    return NextResponse.json(apiSuccess({ media: updatedMedia }));
  } catch (err) {
    return handleApiError(err);
  }
}
