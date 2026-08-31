import { NextResponse } from "next/server";
import { subscriberService } from "@/services/subscriber.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req) {
  try {
    const siteId = getSiteId(req);
    const body = await req.json();
    const { listId, subscribers } = body;

    if (!Array.isArray(subscribers)) {
      return NextResponse.json({ error: "Subscribers array is required" }, { status: 400 });
    }

    const result = await subscriberService.importSubscribersCsv(siteId, listId, subscribers);
    return NextResponse.json(apiSuccess(result));
  } catch (err) {
    return handleApiError(err);
  }
}
