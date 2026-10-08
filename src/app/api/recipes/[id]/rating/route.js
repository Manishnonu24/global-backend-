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
    const body = await req.json();
    const { rating } = body;

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 });
    }

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

    const result = await prisma.reciperating.upsert({
      where: { recipeId_userId: { recipeId, userId: user.id } },
      update: { rating },
      create: { recipeId, userId: user.id, rating },
    });

    return NextResponse.json(apiSuccess({ rating: result }));
  } catch (err) {
    return handleApiError(err);
  }
}
