import { NextResponse } from "next/server";
import { analyticsService } from "@/services/analytics.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

// Returns who is online right now (last 2 minutes)
export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "VIEWER");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const liveVisitors = await analyticsService.getLiveVisitors(auth.siteId);
    const liveCount = liveVisitors.length;

    return NextResponse.json(apiSuccess({ liveCount, liveVisitors }));
  } catch (err) {
    return handleApiError(err);
  }
}
