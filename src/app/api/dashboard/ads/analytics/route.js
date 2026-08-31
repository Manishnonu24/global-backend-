import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkSitePermission } from '@/lib/apiAuth';
import { apiSuccess, handleApiError } from '@/core/errors';

export async function GET(req) {
  const auth = await checkSitePermission(req, 'EDITOR');
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;

    // Fetch all ads in the site
    const ads = await prisma.ad.findMany({
      where: {
        zone: { siteId }
      },
      include: {
        zone: true,
        campaign: true,
        advertiser: true
      }
    });

    // Calculate totals
    let totalImpressions = 0;
    let totalClicks = 0;
    let activeAdsCount = 0;

    const adsPerformance = ads.map(ad => {
      totalImpressions += ad.impressions;
      totalClicks += ad.clicks;
      if (ad.isActive && ad.status === 'active') {
        activeAdsCount++;
      }

      const ctr = ad.impressions > 0 
        ? ((ad.clicks / ad.impressions) * 100).toFixed(2)
        : '0.00';

      return {
        id: ad.id,
        name: ad.name,
        type: ad.type,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr,
        zoneName: ad.zone?.name || 'Unassigned',
        campaignName: ad.campaign?.name || 'None',
        status: ad.status
      };
    });

    const averageCtr = totalImpressions > 0 
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : '0.00';

    // Group by zone
    const zoneStatsMap = {};
    ads.forEach(ad => {
      const zName = ad.zone?.name || 'Unassigned';
      if (!zoneStatsMap[zName]) {
        zoneStatsMap[zName] = { impressions: 0, clicks: 0, adsCount: 0 };
      }
      zoneStatsMap[zName].impressions += ad.impressions;
      zoneStatsMap[zName].clicks += ad.clicks;
      zoneStatsMap[zName].adsCount++;
    });

    const zoneStats = Object.entries(zoneStatsMap).map(([name, stats]) => {
      const ctr = stats.impressions > 0 
        ? ((stats.clicks / stats.impressions) * 100).toFixed(2)
        : '0.00';
      return {
        name,
        ...stats,
        ctr
      };
    });

    // Top ads by CTR
    const topAds = [...adsPerformance]
      .filter(ad => ad.impressions >= 10) // Only ads with at least 10 impressions
      .sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr))
      .slice(0, 5);

    // Get 30-day timeline grouped by date
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 30);

    const analyticsRows = await prisma.adAnalytic.findMany({
      where: {
        ad: {
          zone: { siteId }
        },
        createdAt: {
          gte: dateLimit
        }
      },
      select: {
        type: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    const timelineMap = {};
    // Populate last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      timelineMap[dateStr] = { date: dateStr, impressions: 0, clicks: 0 };
    }

    analyticsRows.forEach(row => {
      const dateStr = row.createdAt.toISOString().slice(0, 10);
      if (timelineMap[dateStr]) {
        if (row.type === 'impression') {
          timelineMap[dateStr].impressions++;
        } else if (row.type === 'click') {
          timelineMap[dateStr].clicks++;
        }
      }
    });

    const timeline = Object.values(timelineMap);

    return NextResponse.json(apiSuccess({
      totals: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: averageCtr,
        activeAds: activeAdsCount,
        totalAds: ads.length
      },
      zones: zoneStats,
      topAds,
      timeline,
      adsPerformance: adsPerformance.slice(0, 15) // Recent 15
    }));
  } catch (err) {
    return handleApiError(err);
  }
}
