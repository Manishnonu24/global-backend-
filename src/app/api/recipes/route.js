import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { apiSuccess, handleApiError } from "@/core/errors";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = getSiteId(req) || searchParams.get("siteId") || "AHP";
    const status = searchParams.get("status") || "APPROVED";

    const recipes = await prisma.recipe.findMany({
      where: { siteId, ...(status !== "all" ? { status } : {}) },
      include: {
        tags: true,
        allergens: true,
        contributor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(apiSuccess({ recipes }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, ingredients, steps, tags = [], allergens = [], ...rest } = body;

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const siteId = getSiteId(req) || "AHP";

    const recipe = await prisma.recipe.create({
      data: {
        siteId,
        title,
        description: description || "",
        ingredients: JSON.stringify(ingredients || []),
        steps: JSON.stringify(steps || []),
        status: "PENDING",
        contributorId: user.id,
        ...rest,
      },
    });

    return NextResponse.json(apiSuccess({ recipe }));
  } catch (err) {
    return handleApiError(err);
  }
}
