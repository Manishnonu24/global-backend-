import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import CrmDashboardClient from "./CrmDashboardClient";

export default async function CrmDashboardPage() {
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Marketing CRM</h1>
        <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-250 rounded-xl text-sm max-w-md mx-auto">
          No active site configuration found. Please configure a site in the database first.
        </div>
      </div>
    );
  }

  return (
    <CrmDashboardClient
      siteId={site.id}
      siteName={site.name}
    />
  );
}
