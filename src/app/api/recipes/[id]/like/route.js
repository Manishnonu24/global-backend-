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

    const existing = await prisma.recipelike.findUnique({
      where: { recipeId_userId: { recipeId, userId: user.id } },
    });

    if (existing) {
      await prisma.recipelike.delete({ where: { id: existing.id } });
      return NextResponse.json(apiSuccess({ liked: false }));
    } else {
      await prisma.recipelike.create({ data: { recipeId, userId: user.id } });
      return NextResponse.json(apiSuccess({ liked: true }));
    }
  } catch (err) {
    return handleApiError(err);
  }
}
