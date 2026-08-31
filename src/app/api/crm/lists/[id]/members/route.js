import { NextResponse } from "next/server";
import { subscriberService } from "@/services/subscriber.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const resolvedParams = await params;
    const listId = resolvedParams.id;
    const members = await subscriberService.getListMembers(siteId, listId);
    return NextResponse.json(apiSuccess({ members }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const resolvedParams = await params;
    const listId = resolvedParams.id;
    const body = await req.json();
    const { subscriberId, subscriberIds } = body;

    if (Array.isArray(subscriberIds)) {
      const result = await subscriberService.addBulkSubscribersToList(siteId, listId, subscriberIds);
      return NextResponse.json(apiSuccess(result));
    }

    if (!subscriberId) {
      return NextResponse.json({ error: "subscriberId or subscriberIds is required" }, { status: 400 });
    }
    const member = await subscriberService.addSubscriberToList(siteId, listId, subscriberId);
    return NextResponse.json(apiSuccess({ member }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const siteId = getSiteId(req);
    const resolvedParams = await params;
    const listId = resolvedParams.id;
    const url = new URL(req.url);
    const subscriberId = url.searchParams.get("subscriberId");

    // Check if JSON body with subscriberIds array was provided for bulk removal
    let subscriberIds = null;
    try {
      const body = await req.json();
      subscriberIds = body?.subscriberIds;
    } catch (_) {
      /* body optional for DELETE */
    }

    if (Array.isArray(subscriberIds)) {
      const result = await subscriberService.removeBulkSubscribersFromList(siteId, listId, subscriberIds);
      return NextResponse.json(apiSuccess(result));
    }

    if (!subscriberId) {
      return NextResponse.json({ error: "subscriberId parameter or subscriberIds body is required" }, { status: 400 });
    }
    await subscriberService.removeSubscriberFromList(siteId, listId, subscriberId);
    return NextResponse.json(apiSuccess({ success: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
