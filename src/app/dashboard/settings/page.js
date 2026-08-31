import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import SettingsEditor from "./SettingsEditor";

export default async function SettingsPage() {
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-4 text-sm text-red-600">No active site found.</p>
      </div>
    );
  }

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  // Fetch the existing settings for this site, if they exist
  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: site.id },
  });

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Global Website Settings</h1>
          <p className="admin-caption mt-1">
            Site: <span className="font-semibold" style={{ color: "var(--admin-text, #0f172a)" }}>{site.name}</span> ({site.domain || site.id})
          </p>
        </div>
      </div>

      {/*
        The SettingsEditor is a client component that handles all state and API calls.
        We pass the initial data fetched on the server as a prop.
      */}
      <SettingsEditor siteId={site.id} initialSettings={settings} />
    </div>
  );
}

