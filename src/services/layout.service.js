/**
 * Layout service — fetches global settings, navigation, and footer data
 * directly from the database for the infinium frontend, avoiding local HTTP requests.
 */
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { getDefaultSiteId } from "@/lib/siteResolver";
import { resolveMediaUrl } from "@/utils/mediaUtils";

const FALLBACK = {
  siteName: "A Health Place",
  logoUrl: "/images/Logo-web.webp",
  footerLogoUrl: "/images/Logo-web.webp",
  faviconUrl: "/favicon.ico",
  tagline: "Building Wellness into Your Life",
  navigation: [],
  footerLinks: [],
  copyright: `© ${new Date().getFullYear()} A Health Place. All rights reserved.`,
};

function resolveFaviconUrl(rawUrl) {
  if (!rawUrl || rawUrl === "/favicon.ico") return FALLBACK.faviconUrl;

  let urlStr = typeof rawUrl === "string" ? rawUrl : (rawUrl.secureUrl || rawUrl.url || rawUrl.publicId || rawUrl.key || "");
  if (!urlStr || urlStr === "/favicon.ico") return FALLBACK.faviconUrl;

  // If it's an internal proxy URL, strip the absolute origin so it stays origin-relative (/api/media/view?key=...)
  if (urlStr.includes("/api/media/view")) {
    const match = urlStr.match(/\/api\/media\/view(\?[^"'\s]*)?/);
    if (match) return match[0];
  }

  // Convert private S3 / Cloud storage URLs
  if (urlStr.includes("backblazeb2.com") || urlStr.includes(".s3.") || urlStr.includes("amazonaws.com") || urlStr.includes("ionoscloud.com") || urlStr.includes("ionos.com")) {
    try {
      const parsed = new URL(urlStr);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const key = parts.length > 1 ? parts.slice(1).join("/") : parts.join("/");
      if (key) {
        return `/api/media/view?key=${key}`;
      }
    } catch (e) {
      // Ignore URL parse error
    }
  }

  // If an insecure HTTP URL is present, strip the origin if it's on this server or upgrade to HTTPS
  if (urlStr.startsWith("http://") && !urlStr.includes("localhost") && !urlStr.includes("127.0.0.1")) {
    try {
      const parsed = new URL(urlStr);
      if (parsed.pathname) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch (e) {}
    return urlStr.replace(/^http:\/\//i, "https://");
  }

  return urlStr;
}

/**
 * Fetch all layout data from DB in parallel.
 * Wrapped with unstable_cache to run exactly once per build/revalidation period,
 * drastically reducing database connections during static generation of hundreds of pages.
 */
const fetchLayoutData = async () => {
  const siteId = getDefaultSiteId();
  try {
    const [site, settings, legalPages] = await Promise.all([
      prisma.site.findUnique({
        where: { id: siteId },
        select: { isActive: true, deletedAt: true }
      }),
      prisma.globalSettings.findUnique({
        where: { siteId },
        select: { 
          websiteSettings: true,
          header: true,
          footer: true,
          navigation: true,
          compliance: true,
          analytics: true,
          securityControls: true,
          emailSettings: true,
          ctaConfig: true,
          scripts: true,
          performanceConfig: true,
          adSettings: true
        }
      }),
      prisma.legalpage.findMany({
        where: { siteId, deletedAt: null },
        select: { title: true, type: true }
      }).catch(() => [])
    ]);

    const isActive = site ? (site.isActive && !site.deletedAt) : false;
    const ws = settings?.websiteSettings || {};
    const header = settings?.header || {};
    const footer = settings?.footer || {};
    const navigation = settings?.navigation || {};
    const navItems = navigation.main || [];
    const adSettings = settings?.adSettings || {};

    const dbLogoUrl = header.logoUrl || ws.logoUrl;
    const dbFooterLogoUrl = footer.logoUrl || (footer.columns && footer.columns[0]?.logoUrl) || dbLogoUrl;

    const mappedLegalLinks = (legalPages || []).map(page => {
      let slugType = page.type;
      if (page.type === "privacy") slugType = "privacy-policy";
      else if (page.type === "terms") slugType = "terms-of-use";
      else if (page.type === "cookies") slugType = "cookie-policy";
      
      return {
        label: page.title,
        url: `/legal/${slugType}`
      };
    });

    const baseFooterLinks = footer.links || footer.items || [];
    const footerLinks = baseFooterLinks.length > 0 ? [...baseFooterLinks] : [
      { label: "About", url: "/about" },
      { label: "Contact Us", url: "/contact" }
    ];

    mappedLegalLinks.forEach(link => {
      if (!footerLinks.some(fl => fl.url === link.url || fl.label.toLowerCase() === link.label.toLowerCase())) {
        footerLinks.push(link);
      }
    });

    const securityControls = settings?.securityControls || {};
    const publicSecurityControls = {
      recaptchaSiteKey: securityControls.recaptchaSiteKey || null
    };

    const emailSettings = settings?.emailSettings || {};
    const oneSignalAppId = emailSettings.oneSignalAppId || null;
    const novuWorkflowId = emailSettings.novuWorkflowId || null;

    const resolvedFooterColumns = (footer.columns || []).map(col => ({
      ...col,
      ...(col.logoUrl ? { logoUrl: resolveMediaUrl(col.logoUrl) } : {})
    }));

    return {
      siteName: ws.title || FALLBACK.siteName,
      logoUrl: resolveMediaUrl(dbLogoUrl || FALLBACK.logoUrl),
      footerLogoUrl: resolveMediaUrl(dbFooterLogoUrl || FALLBACK.footerLogoUrl),
      tagline: ws.tagline || FALLBACK.tagline,
      faviconUrl: resolveFaviconUrl(ws.favicon || FALLBACK.faviconUrl),
      titleTemplate: ws.titleTemplate || null,
      description: ws.description || null,
      ogImageUrl: resolveMediaUrl(ws.ogImageUrl),
      globalJsonLd: ws.globalJsonLd || null,
      navigation: navItems,
      footerLinks,
      footerColumns: resolvedFooterColumns,
      copyright: footer.copyright || FALLBACK.copyright,
      isActive,
      maintenanceMode: ws.maintenanceMode === true,
      maintenanceMessage: ws.maintenanceMessage || "We are currently undergoing scheduled maintenance. Please check back shortly.",
      analytics: settings?.analytics || null,
      securityControls: publicSecurityControls,
      oneSignalAppId,
      novuWorkflowId,
      adSettings,
      rawSettings: {
        isActive,
        websiteSettings: ws,
        ctaConfig: settings?.ctaConfig || null,
        compliance: settings?.compliance || null,
        analytics: settings?.analytics || null,
        securityControls: publicSecurityControls,
        oneSignalAppId,
        novuWorkflowId,
        adSettings,
        scripts: settings?.scripts || null,
        performanceConfig: settings?.performanceConfig || null
      },
    };
  } catch (err) {
    console.error("fetchLayoutData failed, using fallback:", err);
    return {
      ...FALLBACK,
      isActive: true,
      maintenanceMode: false,
      maintenanceMessage: "",
    };
  }
};

export const getLayoutData = unstable_cache(
  fetchLayoutData,
  ['global-layout-data'],
  { revalidate: 3600, tags: ['layout'] }
);
