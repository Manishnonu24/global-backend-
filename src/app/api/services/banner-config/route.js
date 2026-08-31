import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";

const DEFAULT_BANNER_CONFIG = {
  badgeText: "PR & EDITORIAL PLACEMENTS",
  title: "Want to get featured in AHealthPlace?",
  description: "Unlock authority status and reach our highly engaged, health-conscious readers. Align your expertise with a publication vetted by a medical review board.",
  benefits: [
    { title: "Submit an Article", description: "Share your expertise and get published." },
    { title: "Expert Interviews", description: "Be featured in our expert interviews." },
    { title: "Editorial Photo Shoots", description: "Collaborate on creative editorial projects." },
    { title: "Featured Success Stories", description: "Inspire others with your success." },
    { title: "PR & Press Releases", description: "Promote your news and announcements." },
    { title: "Sponsored Content", description: "Partner with us through sponsored stories." },
    { title: "Video Features", description: "Showcase your story through video." },
    { title: "Brand Collaborations", description: "Work with us on impactful brand collaborations." },
  ],
  buttonText: "Explore Media Packages",
  buttonLink: "/services",
  bgCoverImage: "/images/mag_strength.webp",
  fgCoverImage: "/images/mag_sleep.webp",
};

export async function GET(req) {
  try {
    const siteId = req.headers.get("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "AHP";
    
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { websiteSettings: true },
    });

    const customConfig = settings?.websiteSettings?.servicesBannerConfig || {};

    const bannerConfig = {
      ...DEFAULT_BANNER_CONFIG,
      ...customConfig,
      benefits: customConfig.benefits && customConfig.benefits.length > 0
        ? customConfig.benefits
        : DEFAULT_BANNER_CONFIG.benefits,
    };

    return NextResponse.json(apiSuccess({ bannerConfig }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Public services banner config GET error:");
    return NextResponse.json(apiSuccess({ bannerConfig: DEFAULT_BANNER_CONFIG }));
  }
}
