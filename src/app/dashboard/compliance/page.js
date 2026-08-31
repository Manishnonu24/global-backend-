import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import ComplianceConsole from "./ComplianceConsole";

export const metadata = {
  title: "Compliance & GDPR Center | Global Backend Admin",
  description:
    "Configure cookie consent choices and process data deletion audit requests",
};

export default async function CompliancePage() {
  const user = await requireAuth();
  if (!user) return null;

  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Compliance Center</h1>
        <p className="mt-4 text-sm text-red-600">
          No active site found. Please configure a site first.
        </p>
      </div>
    );
  }

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  // Pre-load compliance settings and GDPR audit logs
  const [settings, deletionLogs] = await Promise.all([
    prisma.globalSettings.findUnique({
      where: { siteId: site.id },
      select: { compliance: true },
    }),
    prisma.auditLog.findMany({
      where: {
        siteId: site.id,
        action: "GDPR_DATA_DELETION",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const initialConfig = settings?.compliance || {
    cookieConsentEnabled: true,
    cookieConsentMessage:
      "This website uses cookies to improve your experience.",
    essentialCookiesEnabled: true,
    analyticsCookiesEnabled: true,
    marketingCookiesEnabled: true,
    bannerPosition: "bottom",
    acceptButtonText: "Accept All",
    declineButtonText: "Decline",
    settingsButtonText: "Preferences",
    consentLogs: [],
  };

  return (
    <div className="w-full">
      <ComplianceConsole
        siteId={site.id}
        initialConfig={initialConfig}
        initialDeletionLogs={JSON.parse(JSON.stringify(deletionLogs))}
      />
    </div>
  );
}

