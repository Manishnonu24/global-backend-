import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, handleApiError } from "@/core/errors";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const { id: recipeId } = await params;

    const comments = await prisma.recipecomment.findMany({
      where: { recipeId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(apiSuccess({ comments }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req, { params }) {
  try {
    const user = await requireAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: recipeId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

    // Verify recipe exists to avoid FK orphans
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

    const comment = await prisma.recipecomment.create({
      data: { recipeId, userId: user.id, content },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(apiSuccess({ comment }));
  } catch (err) {
    return handleApiError(err);
  }
}
