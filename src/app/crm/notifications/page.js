import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import NotificationsConsole from "@/app/dashboard/notifications/NotificationsConsole";

export const metadata = {
  title: "Notifications & System Alerts | Marketing CRM",
  description: "Configure email alerts and manage in-app CRM notification logs",
};

export default async function CrmNotificationsPage() {
  const user = await requireAuth();
  if (!user) return null;

  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Notifications & Alerts</h1>
        <p className="mt-4 text-sm text-red-600">No active site found. Please configure a site first.</p>
      </div>
    );
  }

  // Pre-load notification settings config and alerts
  const [settings, alerts] = await Promise.all([
    prisma.globalSettings.findUnique({
      where: { siteId: site.id },
      select: { notifications: true }
    }),
    prisma.notificationAlert.findMany({
      where: { siteId: site.id },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const initialConfig = settings?.notifications || {
    newLead: { email: true, dashboard: true },
    failedForm: { email: true, dashboard: true },
    blogAlert: { email: true, dashboard: true }
  };

  return (
    <div className="w-full">
      <NotificationsConsole
        siteId={site.id}
        initialConfig={initialConfig}
        initialAlerts={JSON.parse(JSON.stringify(alerts))}
      />
    </div>
  );
}
