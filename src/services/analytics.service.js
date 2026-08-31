import prisma from "@/lib/prisma";

export class AnalyticsService {
  // ─── Ping / Session Recording ────────────────────────────────────────────────

  async recordPing(siteId, pingData) {
    const { visitorId, pageViewed, ipAddress, location, deviceInfo, trafficSource, duration } = pingData;
    const page = pageViewed.startsWith("/") ? pageViewed : `/${pageViewed}`;
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const isExcluded =
      page.startsWith("/dashboard") ||
      page.startsWith("/crm") ||
      page.startsWith("/login") ||
      page.startsWith("/forgot-password") ||
      page.startsWith("/reset-password") ||
      page.startsWith("/preview");

    if (isExcluded) {
      return { success: true, ignored: true };
    }

    const existingLog = await prisma.visitorLog.findFirst({
      where: {
        siteId,
        visitorId,
        pageViewed: page,
        createdAt: { gte: twoMinutesAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingLog) {
      const finalDuration = (typeof duration === "number" && duration >= 0)
        ? Math.max(existingLog.duration, duration)
        : Math.round((Date.now() - new Date(existingLog.createdAt).getTime()) / 1000);

      const updated = await prisma.visitorLog.update({
        where: { id: existingLog.id },
        data: { 
          duration: finalDuration,
          ipAddress: ipAddress || existingLog.ipAddress, // Update IP address if new one is captured
        },
      });
      return { logId: updated.id, updated: true };
    }

    const created = await prisma.visitorLog.create({
      data: {
        siteId,
        visitorId,
        pageViewed: page,
        ipAddress,
        location: location || "Unknown",
        deviceInfo: deviceInfo || "Unknown",
        trafficSource: trafficSource || "Direct",
        duration: (typeof duration === "number" && duration >= 0) ? duration : 0,
      },
    });

    return { logId: created.id, created: true };
  }

  // ─── Live Count ───────────────────────────────────────────────────────────────

  async getLiveVisitorsCount(siteId) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const activeVisitors = await prisma.visitorLog.groupBy({
      by: ["visitorId"],
      where: { siteId, createdAt: { gte: twoMinutesAgo } },
    });
    return activeVisitors.length;
  }

  // ─── Live Visitors Detail (who's online right now) ────────────────────────────

  async getLiveVisitors(siteId) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    // Get the most recent log entry per visitor that's been active in last 2 min
    const recent = await prisma.visitorLog.findMany({
      where: { siteId, createdAt: { gte: twoMinutesAgo } },
      orderBy: { createdAt: "desc" },
    });
    // Deduplicate by visitorId – keep most recent entry
    const seen = new Set();
    const live = [];
    for (const log of recent) {
      if (!seen.has(log.visitorId)) {
        seen.add(log.visitorId);
        live.push(log);
      }
    }
    return live;
  }

  // ─── Aggregated Stats ─────────────────────────────────────────────────────────

  async getStats(siteId, { from, to } = {}) {
    const where = { siteId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [
      totalSessions,
      uniqueVisitors,
      avgDurationRaw,
      pageGroups,
      locationGroups,
      deviceGroups,
      sourceGroups,
    ] = await Promise.all([
      // total log entries (page views)
      prisma.visitorLog.count({ where }),

      // unique visitor IDs
      prisma.visitorLog.groupBy({ by: ["visitorId"], where }).then((r) => r.length),

      // average session duration (seconds)
      prisma.visitorLog.aggregate({ where, _avg: { duration: true } }),

      // top pages
      prisma.visitorLog.groupBy({
        by: ["pageViewed"],
        where,
        _count: { pageViewed: true },
        orderBy: { _count: { pageViewed: "desc" } },
        take: 20,
      }),

      // by location
      prisma.visitorLog.groupBy({
        by: ["location"],
        where,
        _count: { location: true },
        orderBy: { _count: { location: "desc" } },
        take: 20,
      }),

      // by device
      prisma.visitorLog.groupBy({
        by: ["deviceInfo"],
        where,
        _count: { deviceInfo: true },
        orderBy: { _count: { deviceInfo: "desc" } },
        take: 20,
      }),

      // by traffic source
      prisma.visitorLog.groupBy({
        by: ["trafficSource"],
        where,
        _count: { trafficSource: true },
        orderBy: { _count: { trafficSource: "desc" } },
        take: 20,
      }),
    ]);

    return {
      totalPageViews: totalSessions,
      uniqueVisitors,
      avgSessionDuration: Math.round(avgDurationRaw._avg.duration || 0),
      topPages: pageGroups.map((g) => ({ page: g.pageViewed, views: g._count.pageViewed })),
      byLocation: locationGroups.map((g) => ({ location: g.location || "Unknown", count: g._count.location })),
      byDevice: deviceGroups.map((g) => ({ device: g.deviceInfo || "Unknown", count: g._count.deviceInfo })),
      bySource: sourceGroups.map((g) => ({ source: g.trafficSource || "Direct", count: g._count.trafficSource })),
    };
  }

  // ─── Time-Series (daily page views for chart) ─────────────────────────────────

  async getTimeSeries(siteId, days = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await prisma.visitorLog.findMany({
      where: { siteId, createdAt: { gte: from } },
      select: { createdAt: true, visitorId: true },
      orderBy: { createdAt: "asc" },
    });

    const byDay = {};
    // Pre-populate last 'days' days to ensure time series has continuous dates
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const day = d.toISOString().split("T")[0];
      byDay[day] = { date: day, pageViews: 0, visitors: new Set() };
    }

    for (const log of logs) {
      const day = log.createdAt.toISOString().split("T")[0];
      if (!byDay[day]) {
        byDay[day] = { date: day, pageViews: 0, visitors: new Set() };
      }
      byDay[day].pageViews++;
      byDay[day].visitors.add(log.visitorId);
    }

    return Object.values(byDay).map((d) => ({
      date: d.date,
      pageViews: d.pageViews,
      uniqueVisitors: d.visitors.size,
    }));
  }

  // ─── Visitor Logs (paginated) ─────────────────────────────────────────────────

  async getVisitorLogs(siteId, options = {}) {
    const skip = options.skip || 0;
    const take = options.take || 50;
    return prisma.visitorLog.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  // ─── Count ────────────────────────────────────────────────────────────────────

  async count(siteId) {
    return prisma.visitorLog.count({ where: { siteId } });
  }
}

export const analyticsService = new AnalyticsService();
