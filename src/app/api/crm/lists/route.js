import { NextResponse } from "next/server";
import { subscriberService } from "@/services/subscriber.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const lists = await subscriberService.getLists(siteId);
    return NextResponse.json(apiSuccess({ lists }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const siteId = getSiteId(req);
    const body = await req.json();
    const list = await subscriberService.createList(siteId, body);
    return NextResponse.json(apiSuccess({ list }));
  } catch (err) {
    return handleApiError(err);
  }
}
