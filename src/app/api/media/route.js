import { getSiteId } from "@/lib/siteGuard";
import { mediaService } from "@/services/media.service";
import { handleApiError } from "@/core/errors";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const siteId = getSiteId(request);
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "60", 10);

    // Auto-cleanup any invalid text/html duplicate records created by past imports
    const prisma = (await import("@/lib/prisma")).default;
    await prisma.media.deleteMany({
      where: {
        siteId,
        OR: [
          { mimeType: { contains: "text/html" } },
          { mimeType: { contains: "text/plain" } },
          { url: { contains: "text/html" } },
        ],
      },
    }).catch(() => {});

    let media, total;
    if (!folderId || folderId === "all") {
      [media, total] = await Promise.all([
        mediaService.repository.findMany(siteId, { orderBy: { createdAt: "desc" }, take: limit, skip: (page - 1) * limit }),
        mediaService.repository.count(siteId, {}),
      ]);
    } else {
      [media, total] = await Promise.all([
        mediaService.repository.findByFolder(siteId, folderId, { take: limit, skip: (page - 1) * limit }),
        mediaService.repository.countByFolder(siteId, folderId),
      ]);
    }

    return NextResponse.json({ data: media, total, page, limit });
  } catch (err) {
    return handleApiError(err);
  }
}
