import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/core/errors";
import { settingsService } from "@/services/settings.service";
import { getRequestId } from "@/lib/observability/requestContext";


const DEFAULT_COMMUNITY_CONFIG = {
  forceComingSoon: false,
  comingSoonTitle: "Community & Events\nComing Soon",
  comingSoonDesc: "Join a growing community passionate about better health, shared learning, and meaningful connections.",
  subtitle: "COMMUNITY CONNECTION",
  title: "Our Community & Events",
  description: "We host regular group nature walks, online yoga sessions, and stress management seminars created by wellness experts to keep you connected and inspired.",
  features: [
    { title: "Nature Walks", sub: "Reconnect", icon: "sun" },
    { title: "Yoga Sessions", sub: "Strengthen", icon: "user" },
    { title: "Wellness Talks", sub: "Learn", icon: "globe" },
    { title: "Community", sub: "Support", icon: "users" }
  ],
  communityBox: {
    title: "Our Community",
    badgeText: "+ More Members",
    description: "Join a growing community focused on wellness, mindfulness and healthy living."
  },
  testimonialBox: {
    quote: "Being part of these sessions has helped me stay more mindful, active and positive.",
    author: "— A COMMUNITY MEMBER"
  },
  ctaButtons: {
    primaryText: "Join Community",
    primaryLink: "/register",
    secondaryText: "Explore All Events",
    secondaryLink: "/events"
  }
};

export async function GET(req) {
  try {
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || "AHP";

    let communityConfig = null;
    try {
      const websiteSettings = await settingsService.getSettingsField(siteId, "websiteSettings");
      communityConfig = websiteSettings?.communityConfig || null;
    } catch (e) {
      const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      console.warn("Failed to load communityConfig from settings:", e.message);
    }

    let event = null;
    if (!communityConfig?.forceComingSoon) {
      event = await prisma.communityEvent.findFirst({
        where: { siteId, status: "active", isFeatured: true },
        orderBy: { createdAt: "desc" },
      });

      if (!event) {
        event = await prisma.communityEvent.findFirst({
          where: { siteId, status: "active" },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    return NextResponse.json(apiSuccess({
      event: event || null,
      communityConfig: communityConfig ? { ...DEFAULT_COMMUNITY_CONFIG, ...communityConfig } : DEFAULT_COMMUNITY_CONFIG
    }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Public events GET error:");
    // Return full default config so the client always receives a valid response shape
    return NextResponse.json(apiSuccess({ event: null, communityConfig: DEFAULT_COMMUNITY_CONFIG }));
  }
}
