import { NextResponse } from "next/server";
import { subscriberService } from "@/services/subscriber.service";
import { getSiteId } from "@/lib/siteGuard";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const siteId = getSiteId(req);
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const tag = url.searchParams.get("tag") || "";
    const skip = url.searchParams.get("skip") || 0;
    const take = url.searchParams.get("take") || 50;

    const data = await subscriberService.getSubscribers(siteId, {
      search,
      status,
      tag,
      skip,
      take,
    });
    return NextResponse.json(apiSuccess(data));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const siteId = getSiteId(req);
    const body = await req.json();
    const subscriber = await subscriberService.createSubscriber(siteId, body);
    return NextResponse.json(apiSuccess({ subscriber }));
  } catch (err) {
    return handleApiError(err);
  }
}
