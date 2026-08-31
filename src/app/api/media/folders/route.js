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

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(request);
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId") || "root";

    const folders = await mediaService.getFolders(siteId, parentId);
    return NextResponse.json(apiSuccess({ folders }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(request);
    const body = await request.json();
    const { name, parentId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    // Check if folder name duplicate exists within parent for this site
    const parentIdVal = (parentId === "root" || parentId === "null" || !parentId) ? null : parentId;
    const existing = await prisma.mediafolder.findFirst({
      where: {
        siteId,
        name: name.trim(),
        parentId: parentIdVal,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "A folder with this name already exists in this directory." }, { status: 400 });
    }

    const folder = await mediaService.createFolder(siteId, name.trim(), parentIdVal);
    return NextResponse.json(apiSuccess({ folder }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
