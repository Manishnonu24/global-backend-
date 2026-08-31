import { NextResponse } from "next/server";
import { analyticsService } from "@/services/analytics.service";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "VIEWER");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;
    const days = parseInt(searchParams.get("days") || "30", 10);

    const [stats, timeSeries] = await Promise.all([
      analyticsService.getStats(auth.siteId, { from, to }),
      analyticsService.getTimeSeries(auth.siteId, days),
    ]);

    return NextResponse.json(apiSuccess({ stats, timeSeries }));
  } catch (err) {
    return handleApiError(err);
  }
}
