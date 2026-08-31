import { analyticsService } from "@/services/analytics.service";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import VisitorDashboardClient from "@/components/dashboard/VisitorDashboardClient";

export const metadata = {
  title: "Live Visitor Dashboard | Marketing CRM",
  description: "Real-time analytics: live visitors, page views, location, device, traffic source, session duration, and visitor logs.",
};

export default async function VisitorsPage() {
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">No active site found.</p>
      </div>
    );
  }

  // Server-side initial data
  const [stats, timeSeries, liveCount, recentLogs] = await Promise.all([
    analyticsService.getStats(site.id),
    analyticsService.getTimeSeries(site.id, 30),
    analyticsService.getLiveVisitorsCount(site.id),
    analyticsService.getVisitorLogs(site.id, { take: 100 }),
  ]);

  return (
    <VisitorDashboardClient
      siteId={site.id}
      siteName={site.name}
      initialStats={stats}
      initialTimeSeries={timeSeries}
      initialLiveCount={liveCount}
      initialLogs={recentLogs}
    />
  );
}
