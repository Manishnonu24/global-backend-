import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, handleApiError } from "@/core/errors";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: recipeId } = await params;

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

    const existing = await prisma.savedrecipe.findUnique({
      where: { recipeId_userId: { recipeId, userId: user.id } },
    });

    if (existing) {
      await prisma.savedrecipe.delete({ where: { id: existing.id } });
      return NextResponse.json(apiSuccess({ saved: false }));
    } else {
      await prisma.savedrecipe.create({ data: { recipeId, userId: user.id } });
      return NextResponse.json(apiSuccess({ saved: true }));
    }
  } catch (err) {
    return handleApiError(err);
  }
}
