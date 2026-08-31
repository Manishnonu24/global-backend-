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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const total = await analyticsService.count(auth.siteId);
    const logs = await analyticsService.getVisitorLogs(auth.siteId, { skip, take: limit });

    return NextResponse.json(apiSuccess({ logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      } }));
  } catch (err) {
    return handleApiError(err);
  }
}
