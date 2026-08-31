import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30"; // days
    const days = parseInt(range, 10) || 30;
    const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalPageViews,
      uniqueVisitors,
      avgDurationRaw,
      leadsCount,
      subscribersCount,
      submissionsCount,
      topPages,
      byLocation,
      byDevice,
      bySource,
    ] = await Promise.all([
      // 1. Total Page Views
      prisma.visitorLog.count({
        where: { siteId, createdAt: { gte: dateLimit } },
      }),
      // 2. Unique Visitors
      prisma.visitorLog.groupBy({
        by: ["visitorId"],
        where: { siteId, createdAt: { gte: dateLimit } },
      }).then((res) => res.length),
      // 3. Avg Duration
      prisma.visitorLog.aggregate({
        where: { siteId, createdAt: { gte: dateLimit } },
        _avg: { duration: true },
      }),
      // 4. CRM Leads Count
      prisma.lead.count({
        where: { siteId, createdAt: { gte: dateLimit } },
      }),
      // 5. CRM Subscribers Count
      prisma.subscriber.count({
        where: { siteId, createdAt: { gte: dateLimit } },
      }),
      // 6. Contact Submissions
      prisma.contactFormSubmission.count({
        where: { siteId, createdAt: { gte: dateLimit } },
      }),
      // 7. Top Pages
      prisma.visitorLog.groupBy({
        by: ["pageViewed"],
        where: { siteId, createdAt: { gte: dateLimit } },
        _count: { pageViewed: true },
        orderBy: { _count: { pageViewed: "desc" } },
        take: 5,
      }),
      // 8. Locations
      prisma.visitorLog.groupBy({
        by: ["location"],
        where: { siteId, createdAt: { gte: dateLimit } },
        _count: { location: true },
        orderBy: { _count: { location: "desc" } },
        take: 5,
      }),
      // 9. Devices
      prisma.visitorLog.groupBy({
        by: ["deviceInfo"],
        where: { siteId, createdAt: { gte: dateLimit } },
        _count: { deviceInfo: true },
        orderBy: { _count: { deviceInfo: "desc" } },
        take: 5,
      }),
      // 10. Traffic Sources
      prisma.visitorLog.groupBy({
        by: ["trafficSource"],
        where: { siteId, createdAt: { gte: dateLimit } },
        _count: { trafficSource: true },
        orderBy: { _count: { trafficSource: "desc" } },
        take: 5,
      }),
    ]);

    return NextResponse.json(
      apiSuccess({
        summary: {
          totalPageViews,
          uniqueVisitors,
          avgDuration: Math.round(avgDurationRaw._avg.duration || 0),
          crmLeads: leadsCount,
          crmSubscribers: subscribersCount,
          contactSubmissions: submissionsCount,
        },
        breakdowns: {
          topPages: topPages.map((p) => ({ page: p.pageViewed, count: p._count.pageViewed })),
          byLocation: byLocation.map((l) => ({ location: l.location || "Unknown", count: l._count.location })),
          byDevice: byDevice.map((d) => ({ device: d.deviceInfo || "Unknown", count: d._count.deviceInfo })),
          bySource: bySource.map((s) => ({ source: s.trafficSource || "Direct", count: s._count.trafficSource })),
        },
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
