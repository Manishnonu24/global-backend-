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
    const range = parseInt(searchParams.get("range") || "30", 10) || 30;
    const dateLimit = new Date(Date.now() - range * 24 * 60 * 60 * 1000);

    const [
      crmSubscribers,
      totalLists,
      totalCampaigns,
      totalPushes,
      crmLeads,
      totalPageViews,
      recentSubscribers,
      recentCampaigns,
    ] = await Promise.all([
      prisma.subscriber.count({ where: { siteId } }),
      prisma.subscriberList.count({ where: { siteId } }),
      prisma.emailCampaign.count({ where: { siteId } }),
      prisma.pushNotification.count({ where: { siteId } }),
      prisma.lead.count({ where: { siteId, createdAt: { gte: dateLimit } } }),
      prisma.visitorlog.count({ where: { siteId, createdAt: { gte: dateLimit } } }),
      prisma.subscriber.findMany({
        where: { siteId },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailCampaign.findMany({
        where: { siteId },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const [rawTrends, emailCampaigns] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE(createdAt) as day,
               COUNT(*) as pageViews,
               COUNT(DISTINCT visitorId) as uniqueVisitors
        FROM visitorlog
        WHERE siteId = ${siteId} AND createdAt >= ${dateLimit}
        GROUP BY DATE(createdAt)
        ORDER BY day ASC
      `.catch((rawErr) => {
        console.warn("[CRM API] Raw query error, falling back:", rawErr.message);
        return [];
      }),
      prisma.emailCampaign.findMany({
        where: { siteId, createdAt: { gte: dateLimit } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const trafficTrendsMap = {};
    for (const row of rawTrends || []) {
      if (!row.day) continue;
      const dayStr = new Date(row.day).toISOString().split("T")[0];
      trafficTrendsMap[dayStr] = {
        pageViews: Number(row.pageViews || 0),
        uniqueVisitors: Number(row.uniqueVisitors || 0),
      };
    }

    const trendsList = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toISOString().split("T")[0];
      trendsList.push({
        date: dayStr,
        pageViews: trafficTrendsMap[dayStr]?.pageViews ?? 0,
        uniqueVisitors: trafficTrendsMap[dayStr]?.uniqueVisitors ?? 0,
      });
    }

    const campaignsPerf = await Promise.all(
      (emailCampaigns || []).map(async (c) => {
        const [totalSent, totalOpened, totalClicked] = await Promise.all([
          prisma.campaignLog.count({ where: { campaignId: c.id, status: { in: ["sent", "opened", "clicked"] } } }),
          prisma.campaignLog.count({ where: { campaignId: c.id, status: "opened" } }),
          prisma.campaignLog.count({ where: { campaignId: c.id, status: "clicked" } }),
        ]);
        return {
          id: c.id,
          name: c.name,
          subject: c.subject,
          status: c.status,
          sentCount: totalSent,
          openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
          clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
        };
      })
    );

    const statsPayload = {
      crmSubscribers,
      totalLists,
      totalCampaigns,
      totalPushes,
      crmLeads,
      totalPageViews,
    };

    return NextResponse.json(
      apiSuccess({
        stats: statsPayload,
        trends: trendsList,
        campaignsPerf,
        recentSubscribers,
        recentCampaigns,
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
