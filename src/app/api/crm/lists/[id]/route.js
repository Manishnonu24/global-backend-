import { NextResponse } from "next/server";
import { subscriberService } from "@/services/subscriber.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function PUT(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const list = await subscriberService.updateList(siteId, id, body);
    return NextResponse.json(apiSuccess({ list }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const resolvedParams = await params;
    const id = resolvedParams.id;
    await subscriberService.deleteList(siteId, id);
    return NextResponse.json(apiSuccess({ success: true }));
  } catch (err) {
    return handleApiError(err);
  }
}

