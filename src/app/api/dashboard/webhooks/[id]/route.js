import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/dashboard/webhooks/[id]
 * Update a webhook subscription (enable/disable, change URL, change events).
 */
export async function PATCH(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify the subscription belongs to this site
    const existing = await prisma.webhookSubscription.findFirst({
      where: { id, siteId: auth.siteId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook subscription not found" }, { status: 404 });
    }

    const { name, url, events, isActive } = body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) {
      try { new URL(url); } catch { 
        return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
      }
      updateData.url = url;
    }
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
      // Reset failure count when re-enabling
      if (Boolean(isActive) && !existing.isActive) {
        updateData.failCount = 0;
        updateData.lastError = null;
      }
    }

    const updated = await prisma.webhookSubscription.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, url: true, events: true, isActive: true, failCount: true, createdAt: true },
    });

    return NextResponse.json(apiSuccess({ subscription: updated }));
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/dashboard/webhooks/[id]
 * Soft-delete a webhook subscription.
 */
export async function DELETE(req, { params }) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const existing = await prisma.webhookSubscription.findFirst({
      where: { id, siteId: auth.siteId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook subscription not found" }, { status: 404 });
    }

    await prisma.webhookSubscription.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return NextResponse.json(apiSuccess({ success: true, message: "Webhook subscription removed" }));
  } catch (err) {
    return handleApiError(err);
  }
}
