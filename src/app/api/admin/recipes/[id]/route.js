import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";
import { requireAuth } from "@/lib/requireAuth";
import { queueUpsertContent, queueDeleteContent } from "@/lib/queues/searchQueue";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const siteId = getSiteId(req);
    const { id } = await Promise.resolve(params);
    const body = await req.json();

    // The admin can update status and potentially edit details
    const dataToUpdate = {};
    if (body.status) dataToUpdate.status = body.status;
    if (body.title) dataToUpdate.title = body.title;
    if (body.description !== undefined) dataToUpdate.description = body.description;
    
    const recipe = await prisma.recipe.update({
      where: { id, siteId },
      data: dataToUpdate
    });

    if (recipe.status === "APPROVED") {
      await queueUpsertContent("recipe", recipe.id);
    } else {
      await queueDeleteContent("recipe", recipe.id);
    }

    return NextResponse.json(apiSuccess({ recipe }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const siteId = getSiteId(req);
    const { id } = await Promise.resolve(params);

    await prisma.recipe.delete({
      where: { id, siteId }
    });

    await queueDeleteContent("recipe", id);

    return NextResponse.json(apiSuccess({ message: "Recipe deleted successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
