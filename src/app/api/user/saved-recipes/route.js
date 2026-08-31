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

    const savedRecipes = await prisma.savedrecipe.findMany({
      where: {
        userId: user.id
      },
      include: {
        recipe: {
          include: {
            tags: true,
            allergens: true,
            contributor: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const recipes = savedRecipes.map(sr => sr.recipe).filter(Boolean);

    return NextResponse.json(apiSuccess({ recipes }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { recipeId, recipeData } = body;

    if (!recipeId) {
      return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 });
    }

    let recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      const siteId = getSiteId(req) || 'AHP';
      let contributorId = user.id;
      const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
      if (!userRecord) {
        const fallbackUser = await prisma.user.findFirst();
        if (fallbackUser) contributorId = fallbackUser.id;
      }

      recipe = await prisma.recipe.create({
        data: {
          id: recipeId,
          siteId,
          title: recipeData?.title || 'Saved Recipe',
          description: recipeData?.description || '',
          imageUrl: recipeData?.imageUrl || '',
          cookingTime: recipeData?.cookingTime || null,
          difficulty: recipeData?.difficulty || 'Medium',
          status: 'APPROVED',
          ingredients: [],
          steps: [],
          contributorId
        }
      });
    }

    const existing = await prisma.savedrecipe.findFirst({
      where: { userId: user.id, recipeId: recipe.id }
    });

    if (!existing) {
      await prisma.savedrecipe.create({
        data: { userId: user.id, recipeId: recipe.id }
      });
    }

    return NextResponse.json(apiSuccess({ message: "Recipe saved" }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const recipeId = searchParams.get("recipeId");

    if (!recipeId) {
      return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 });
    }

    await prisma.savedrecipe.deleteMany({
      where: {
        userId: user.id,
        recipeId: recipeId
      }
    });

    return NextResponse.json(apiSuccess({ message: "Recipe removed" }));
  } catch (err) {
    return handleApiError(err);
  }
}
