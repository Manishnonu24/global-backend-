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

    const [liveVisitors, liveCount] = await Promise.all([
      analyticsService.getLiveVisitors(auth.siteId),
      analyticsService.getLiveVisitorsCount(auth.siteId),
    ]);

    return NextResponse.json(apiSuccess({ liveCount, liveVisitors }));
  } catch (err) {
    return handleApiError(err);
  }
}
