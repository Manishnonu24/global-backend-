import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import CtaEditorClient from "./CtaEditorClient";

export default async function CtaSettingsPage() {
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">CTA & Popups Management</h1>
        <p className="mt-4 text-sm text-red-600">No active site found. Please configure a site in the database.</p>
      </div>
    );
  }

  // Fetch settings for the active site
  const settings = await prisma.globalSettings.findUnique({
    where: { siteId: site.id },
  });

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">CTA & Lead Capture</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage Call-To-Actions, Floating Buttons, and subscription/lead capture popups for site: <span className="font-semibold text-gray-800">{site.name}</span> ({site.domain || site.id})
        </p>
      </div>

      <CtaEditorClient siteId={site.id} initialCtaConfig={settings?.ctaConfig || null} />
    </div>
  );
}

