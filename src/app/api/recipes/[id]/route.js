import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess, handleApiError } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const recipe = await prisma.recipe.findFirst({
      where: { id },
      include: {
        tags: true,
        allergens: true,
        contributor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(apiSuccess({ recipe }));
  } catch (err) {
    return handleApiError(err);
  }
}
