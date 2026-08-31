import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // In a real app, verify user.globalRole === 'ADMIN' or SiteRole is ADMIN/EDITOR
    // For now we assume requireAuth handles dashboard access correctly.

    const siteId = getSiteId(req);

    const recipes = await prisma.recipe.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      include: {
        tags: true,
        allergens: true,
        contributor: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(apiSuccess({ recipes }));
  } catch (err) {
    return handleApiError(err);
  }
}
