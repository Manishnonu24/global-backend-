import prisma from "@/lib/prisma";
import { CODE_TEMPLATE_PAGES, ensureCodeTemplatePage } from "@/lib/codeTemplatePages";
import { syncRoutes } from "@/lib/routeSync";
import { getDefaultSiteId, getDefaultSiteMetadata } from "@/lib/siteResolver";

let bootstrapPromise = null;

export function getDefaultGlobalSettingsPayload(siteId = getDefaultSiteId()) {
  const site = getDefaultSiteMetadata(siteId);

  return {
    websiteSettings: {
      title: site.name,
      tagline: "Building Wellness into Your Life",
      description: "A Health Place publishes practical health and wellness guidance.",
      logoUrl: "/images/Logo-web.webp",
      favicon: "/favicon.ico",
      domain: site.domain,
      maintenanceMode: false,
    },
    header: {
      logoUrl: "/images/Logo-web.webp",
    },
    footer: {
      logoUrl: "/images/Logo-web.webp",
      links: [
        { label: "About", url: "/about" },
        { label: "Contact Us", url: "/contact" },
      ],
      copyright: `Copyright ${new Date().getFullYear()} ${site.name}. All rights reserved.`,
    },
    navigation: {
      main: [
        { label: "Home", url: "/" },
        { label: "About", url: "/about" },
        { label: "Services", url: "/services" },
        { label: "Blogs", url: "/blogs" },
        { label: "Contact", url: "/contact" },
      ],
    },
    analytics: {
      enabled: false,
    },
    scripts: {},
    contactDetails: {
      email: "info@ahealthplace.com",
    },
    emailSettings: {
      provider: "resend",
      configured: false,
      adminAlerts: { enabled: false },
      autoReplyTemplate: { enabled: false },
    },
    securityControls: {
      rateLimitRps: 60,
      recaptchaSiteKey: null,
      recaptchaSecretKey: null,
      spamFilterEnabled: false,
    },
    compliance: {
      cookieBanner: { enabled: false },
      formConsent: { enabled: false },
    },
    notifications: {
      newLead: { email: false, dashboard: true },
      failedForm: { email: false, dashboard: true },
      blogAlert: { email: false, dashboard: true },
    },
    ctaConfig: {},
    performanceConfig: {
      compressImagesOnUpload: true,
    },
    devTools: {
      backupHistory: [],
    },
    adSettings: {
      enabled: false,
    },
  };
}

async function withMysqlAdvisoryLock(siteId, task) {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl.startsWith("mysql")) {
    return task();
  }

  const lockName = `bootstrap:${siteId}`;
  let locked = false;

  try {
    const rows = await prisma.$queryRaw`SELECT GET_LOCK(${lockName}, 10) AS acquired`;
    const first = rows?.[0] || {};
    const acquired = Number(first.acquired ?? Object.values(first)[0] ?? 0);
    if (acquired !== 1) {
      return { siteId, status: "skipped", reason: "bootstrap_lock_unavailable" };
    }

    locked = true;
    return await task();
  } catch {
    return task();
  } finally {
    if (locked) {
      try {
        await prisma.$queryRaw`SELECT RELEASE_LOCK(${lockName})`;
      } catch {
        // Connection close auto-releases lock.
      }
    }
  }
}

async function runBootstrap(siteId) {
  const siteMeta = getDefaultSiteMetadata(siteId);

  await prisma.site.upsert({
    where: { id: siteId },
    update: {
      isActive: true,
      deletedAt: null,
    },
    create: {
      id: siteId,
      name: siteMeta.name,
      domain: siteMeta.domain,
      isActive: true,
    },
  });

  await prisma.globalSettings.upsert({
    where: { siteId },
    update: {},
    create: {
      siteId,
      ...getDefaultGlobalSettingsPayload(siteId),
    },
  });

  let syncResult = null;
  let syncFailed = false;
  try {
    syncResult = await syncRoutes(siteId);
  } catch (err) {
    syncFailed = true;
    console.error(`[${siteId} Bootstrap] syncRoutes failed:`, err.message);
  }

  const templates = [];
  let templateFailures = 0;
  let templateSuccesses = 0;

  for (const templateKey of Object.keys(CODE_TEMPLATE_PAGES)) {
    try {
      const result = await ensureCodeTemplatePage({ siteId, templateKey });
      templates.push({
        templateKey,
        status: result.status,
        createdSlots: result.createdSlots?.length || 0,
        existingSlots: result.existingSlots?.length || 0,
      });
      templateSuccesses++;
    } catch (err) {
      templateFailures++;
      console.error(`[${siteId} Bootstrap] Failed to initialize template ${templateKey}:`, err.message);
      templates.push({
        templateKey,
        status: "error",
        error: err.message,
      });
    }
  }

  let finalStatus = "ok";
  if (templateFailures > 0 || syncFailed) {
    if (templateSuccesses > 0) {
      finalStatus = "degraded";
    } else {
      finalStatus = "failed";
    }
  }

  return {
    siteId,
    status: finalStatus,
    syncResult,
    templates,
  };
}

export async function ensureApplicationState(options = {}) {
  const siteId = options.siteId || getDefaultSiteId();

  if (bootstrapPromise && !options.force) {
    return bootstrapPromise;
  }

  bootstrapPromise = withMysqlAdvisoryLock(siteId, () => runBootstrap(siteId)).catch((err) => {
    bootstrapPromise = null;
    throw err;
  });

  return bootstrapPromise;
}
