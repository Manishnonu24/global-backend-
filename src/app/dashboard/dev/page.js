import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { redirect } from "next/navigation";
import DevConsole from "./DevConsole";

export const metadata = {
  title: "Developer Tools | Global Backend Admin",
  description:
    "Manage developer API keys, Content Sync keys, and environment diagnostics",
};

export default async function DevPage() {
  const user = await requireAuth();
  if (!user) return null;

  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Developer Tools</h1>
        <p className="mt-4 text-sm text-red-600">
          No active site found. Please configure a site first.
        </p>
      </div>
    );
  }

  if (user.globalRole !== "SUPERADMIN" && user.globalRole !== "ADMIN") {
    redirect("/dashboard/dashboard");
  }

  // Pre-load API keys, integration key, errors log, webhook subscriptions, and deployment notes
  const [dbSite, apiKeys, errorLogs, webhookSubscriptions, settings] =
    await Promise.all([
      prisma.site.findUnique({
        where: { id: site.id },
        select: { integrationKey: true },
      }),
      prisma.apiKey.findMany({
        where: { siteId: site.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.systemErrorLog.findMany({
        where: { siteId: site.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.webhookSubscription.findMany({
        where: { siteId: site.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          isActive: true,
          failCount: true,
          lastError: true,
          createdAt: true,
        },
      }),
      prisma.globalSettings.findUnique({
        where: { siteId: site.id },
        select: { deploymentNotes: true },
      }),
    ]);

  // Masked Env list (server side)
  const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    DATABASE_URL: process.env.DATABASE_URL ? "mysql://*****" : "Not set",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "Not set",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME
      ? "Configured"
      : "Not set",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY
      ? "Configured"
      : "Not set",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
      ? "Configured"
      : "Not set",
    S3_ENDPOINT: process.env.S3_ENDPOINT || "Not set",
    S3_REGION: process.env.S3_REGION || "Not set",
    S3_BUCKET: process.env.S3_BUCKET || "Not set",
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ? "Configured" : "Not set",
    S3_SECRET_KEY: process.env.S3_SECRET_KEY ? "Configured" : "Not set",
    SMTP_HOST: process.env.SMTP_HOST || "Not set",
    SMTP_PORT: process.env.SMTP_PORT || "Not set",
  };

  const initialVersionInfo = {
    currentVersion: "1.0.2",
    buildTime: new Date().toISOString(),
    history: [
      {
        version: "1.0.2",
        releaseDate: "2026-06-20",
        changes:
          "Added compliance center, cookie banner pref toggles, GDPR data purger, and developer administration tools.",
      },
      {
        version: "1.0.1",
        releaseDate: "2026-06-19",
        changes:
          "Added rate limiters, reCAPTCHA validations, custom 404 mappings, system diagnostics health, and dashboard notifications popover.",
      },
      {
        version: "1.0.0",
        releaseDate: "2026-06-18",
        changes:
          "Initial release of multi-site Global Backend with 28 core content modules.",
      },
    ],
    deploymentNotes: settings?.deploymentNotes || [],
  };

  return (
    <div className="w-full">
      <DevConsole
        siteId={site.id}
        initialIntegrationKey={dbSite?.integrationKey || null}
        initialApiKeys={JSON.parse(JSON.stringify(apiKeys))}
        initialErrorLogs={JSON.parse(JSON.stringify(errorLogs))}
        initialEnv={env}
        initialVersionInfo={initialVersionInfo}
        initialWebhooks={JSON.parse(JSON.stringify(webhookSubscriptions))}
      />
    </div>
  );
}

