import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";

/**
 * Helper to evaluate simple JSON targeting rules.
 * Rule schema examples:
 * - { "country": ["US", "CA"] }
 * - { "device": ["mobile", "desktop"] }
 * - { "routes": ["/blogs/*", "/home"] }
 */
function evaluateTargeting(ad, userAgent, route, userCountry) {
  if (!ad.targeting) return true;
  const targeting = typeof ad.targeting === "string" ? JSON.parse(ad.targeting) : ad.targeting;

  // Device check
  if (targeting.device) {
    if (Array.isArray(targeting.device) && targeting.device.length > 0 && !targeting.device.includes("all")) {
      const isMobile = /mobile|iphone|ipad|android/i.test(userAgent);
      const userDevice = isMobile ? "mobile" : "desktop";
      if (!targeting.device.includes(userDevice)) return false;
    } else if (typeof targeting.device === "string" && targeting.device !== "all") {
      const isMobile = /mobile|iphone|ipad|android/i.test(userAgent);
      const userDevice = isMobile ? "mobile" : "desktop";
      if (targeting.device !== userDevice) return false;
    }
  }

  // Country check
  if (targeting.country) {
    if (Array.isArray(targeting.country) && targeting.country.length > 0 && !targeting.country.includes("all") && userCountry) {
      if (!targeting.country.includes(userCountry.toUpperCase())) return false;
    } else if (typeof targeting.country === "string" && targeting.country !== "all" && userCountry) {
      if (targeting.country.toUpperCase() !== userCountry.toUpperCase()) return false;
    }
  }

  // Route matching check
  if (targeting.routes && Array.isArray(targeting.routes) && targeting.routes.length > 0 && route) {
    const isRouteMatch = targeting.routes.some((pattern) => {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return route.startsWith(prefix);
      }
      return route === pattern;
    });
    if (!isRouteMatch) return false;
  }

  return true;
}

/**
 * Helper to evaluate day of week / time of day scheduling.
 */
function evaluateScheduling(ad) {
  if (!ad.scheduling) return true;
  const scheduling = typeof ad.scheduling === "string" ? JSON.parse(ad.scheduling) : ad.scheduling;
  const now = new Date();

  // Day of week check (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const days = scheduling.daysOfWeek || scheduling.days;
  if (days && Array.isArray(days) && days.length > 0) {
    const currentDay = now.getDay();
    if (!days.includes(currentDay)) return false;
  }

  // Time of day check (hours 0-23)
  if (scheduling.startHour !== undefined && scheduling.endHour !== undefined) {
    const currentHour = now.getHours();
    if (currentHour < scheduling.startHour || currentHour > scheduling.endHour) return false;
  }

  return true;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const zoneName = searchParams.get("zone");
    const route = searchParams.get("route") || "/";
    const siteId = req.headers.get("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "AHP";
    const userAgent = req.headers.get("user-agent") || "";
    const country = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;

    if (!zoneName) {
      return NextResponse.json({ error: "Zone parameter missing" }, { status: 400 });
    }

    const widthParam = searchParams.get("width") ? parseInt(searchParams.get("width"), 10) : null;
    const heightParam = searchParams.get("height") ? parseInt(searchParams.get("height"), 10) : null;

    // Resolve Zone & Site mapping
    let zone = await prisma.adZone.findFirst({
      where: {
        OR: [
          { slug: zoneName },
          { name: zoneName },
        ],
        siteId,
      },
    });

    if (!zone) {
      try {
        const formattedName = zoneName
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        zone = await prisma.adZone.create({
          data: {
            siteId,
            name: `${formattedName}${widthParam && heightParam ? ` (${widthParam}x${heightParam})` : ''}`,
            slug: zoneName,
            width: widthParam || 300,
            height: heightParam || 250,
          },
        });
      } catch (e) {
        zone = null;
      }
    }

    // Fetch global adSettings for Google AdSense integration
    const globalSettings = await prisma.globalsettings.findFirst({
      where: { siteId },
      select: { adSettings: true },
    });
    const adSettings = globalSettings?.adSettings || {};

    if (!zone) {
      return NextResponse.json(apiSuccess({ ads: [], zoneWidth: null, zoneHeight: null, adSettings }));
    }

    // Find active Ads assigned to this zone
    const allAds = await prisma.ad.findMany({
      where: {
        zoneId: zone.id,
        isActive: true,
        NOT: { status: "expired" },
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: new Date() } },
            ],
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          {
            OR: [
              { campaign: null },
              { campaign: { status: "active" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        code: true,
        imageUrl: true,
        targetUrl: true,
        headline: true,
        description: true,
        ctaText: true,
        ctaColor: true,
        priority: true,
        targeting: true,
        scheduling: true,
        impressions: true,
        clicks: true,
        maxClicks: true,
      },
    });

    const matchingAds = allAds.filter((ad) => {
      if (ad.maxClicks !== null && ad.maxClicks !== undefined && ad.clicks >= ad.maxClicks) {
        return false;
      }
      return (
        evaluateTargeting(ad, userAgent, route, country) &&
        evaluateScheduling(ad)
      );
    });

    if (matchingAds.length === 0) {
      return NextResponse.json(apiSuccess({ ads: [], zoneWidth: zone.width, zoneHeight: zone.height, adSettings }));
    }

    const maxPriority = Math.max(...matchingAds.map((ad) => ad.priority || 50));
    const highestPriorityAds = matchingAds.filter((ad) => (ad.priority || 50) === maxPriority);

    const sortedByImpressions = highestPriorityAds.sort((a, b) => a.impressions - b.impressions);
    const selectedAd = sortedByImpressions[0];

    const responseAd = {
      id: selectedAd.id,
      name: selectedAd.name,
      type: selectedAd.type,
      code: selectedAd.code,
      imageUrl: selectedAd.imageUrl,
      targetUrl: selectedAd.targetUrl,
      headline: selectedAd.headline,
      description: selectedAd.description,
      ctaText: selectedAd.ctaText,
      ctaColor: selectedAd.ctaColor,
    };

    return NextResponse.json(apiSuccess({
      ads: [responseAd],
      zoneWidth: zone.width,
      zoneHeight: zone.height,
      adSettings,
    }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Public serve ads error:");
    return NextResponse.json(apiSuccess({ ads: [], adSettings: {} }));
  }
}
