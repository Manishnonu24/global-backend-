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

export async function GET(req, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(req);
    const { id } = await params;

    const media = await mediaService.getById(siteId, id);

    // Find usages of the media inside posts, services and team members scoped by siteId
    const postsUsing = await prisma.post.findMany({
      where: { featuredImageId: id, siteId },
      select: { id: true, title: true }
    });

    const servicesUsing = await prisma.service.findMany({
      where: { featuredImageId: id, siteId },
      select: { id: true, title: true }
    });

    const teamUsing = await prisma.teammember.findMany({
      where: {
        siteId,
        OR: [
          { photo: id },
          { photo: media.url }
        ]
      },
      select: { id: true, name: true }
    });

    const usages = [
      ...postsUsing.map(p => ({ id: p.id, title: p.title, type: "Post", link: `/dashboard/blogs/${p.id}/edit` })),
      ...servicesUsing.map(s => ({ id: s.id, title: s.title, type: "Service", link: `/dashboard/services/${s.id}/edit` })),
      ...teamUsing.map(t => ({ id: t.id, title: t.name, type: "TeamMember", link: `/dashboard/team` }))
    ];

    return NextResponse.json({ media, usages });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(req);
    const { id } = await params;
    const body = await req.json();
    const { altText, fileName, folderId } = body;

    const updatedMedia = await mediaService.renameMedia(siteId, id, fileName, altText, folderId);
    return NextResponse.json(apiSuccess({ media: updatedMedia }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = getSiteId(req);
    const { id } = await params;

    await mediaService.deleteMedia(siteId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
