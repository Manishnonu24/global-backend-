import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";
import { requireFrontendAuth } from "@/lib/requireFrontendAuth";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser() {
  return await requireFrontendAuth();
}

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const siteId = getSiteId(req);

    const recipes = await prisma.recipe.findMany({
      where: {
        siteId,
        contributorId: user.id
      },
      orderBy: { createdAt: "desc" },
      include: {
        tags: true,
        allergens: true,
      }
    });

    return NextResponse.json(apiSuccess({ recipes }));
  } catch (err) {
    return handleApiError(err);
  }
}
