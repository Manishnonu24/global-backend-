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
    const range = searchParams.get("range") || "30";
    const days = parseInt(range, 10) || 30;
    const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Traffic trends (daily)
    const logs = await prisma.visitorLog.findMany({
      where: { siteId, createdAt: { gte: dateLimit } },
      select: { createdAt: true, visitorId: true },
      orderBy: { createdAt: "asc" },
    });

    const trafficTrends = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStr = d.toISOString().split("T")[0];
      trafficTrends[dayStr] = { date: dayStr, pageViews: 0, uniqueVisitors: new Set() };
    }

    for (const log of logs) {
      const dayStr = log.createdAt.toISOString().split("T")[0];
      if (trafficTrends[dayStr]) {
        trafficTrends[dayStr].pageViews++;
        trafficTrends[dayStr].uniqueVisitors.add(log.visitorId);
      }
    }

    const trafficTrendsList = Object.values(trafficTrends).map((t) => ({
      date: t.date,
      pageViews: t.pageViews,
      uniqueVisitors: t.uniqueVisitors.size,
    }));

    // 2. Campaign performance metrics
    const campaigns = await prisma.emailCampaign.findMany({
      where: { siteId, createdAt: { gte: dateLimit } },
      include: {
        logs: true,
      },
    });

    const campaignPerformance = campaigns.map((campaign) => {
      const totalSent = campaign.logs.filter((l) => l.status === "sent").length;
      const totalOpened = campaign.logs.filter((l) => l.status === "opened").length;
      const totalClicked = campaign.logs.filter((l) => l.status === "clicked").length;
      const totalFailed = campaign.logs.filter((l) => l.status === "failed").length;

      return {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt,
        sentCount: totalSent,
        openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
        failedCount: totalFailed,
      };
    });

    // 3. Pipeline Revenue / Lead Conversion value
    // Let's match requested service prices or default to $500
    const services = await prisma.service.findMany({
      where: { siteId, deletedAt: null },
      select: { title: true, price: true },
    });

    const servicePriceMap = {};
    services.forEach((s) => {
      const parsedPrice = parseFloat(String(s.price || "").replace(/[^0-9.]/g, ""));
      servicePriceMap[s.title.toLowerCase()] = isNaN(parsedPrice) ? 500 : parsedPrice;
    });

    const leads = await prisma.lead.findMany({
      where: { siteId, createdAt: { gte: dateLimit } },
      select: { status: true, serviceInterest: true },
    });

    let totalPipelineValue = 0;
    let convertedValue = 0;
    let totalLeads = leads.length;
    let wonLeads = 0;

    leads.forEach((lead) => {
      if (lead.serviceInterest && ["won", "converted", "approved"].includes(lead.status)) {
        const interest = lead.serviceInterest.toLowerCase();
        const extractedMatch = interest.match(/\$(\d+)/);
        let price = 500;
        if (extractedMatch) {
          price = parseFloat(extractedMatch[1]);
        } else {
          let matchedPrice = null;
          for (const [title, pr] of Object.entries(servicePriceMap)) {
            if (interest.includes(title) || title.includes(interest)) {
              matchedPrice = pr;
              break;
            }
          }
          price = matchedPrice !== null ? matchedPrice : 500;
        }
        totalPipelineValue += price;
        convertedValue += price;
        wonLeads++;
      } else if (lead.status === "won" || lead.status === "converted" || lead.status === "approved") {
        totalPipelineValue += 500;
        convertedValue += 500;
        wonLeads++;
      }
    });

    return NextResponse.json(
      apiSuccess({
        trafficTrends: trafficTrendsList,
        campaignPerformance,
        revenue: {
          totalPipelineValue,
          convertedValue,
          conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
          totalLeads,
        },
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
