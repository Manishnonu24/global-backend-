import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess, handleApiError } from "@/core/errors";

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
    { title: "Brand Collaborations", description: "Work with us on impactful brand collaborations." }
  ],
  buttonText: "Explore Media Packages",
  buttonLink: "/services",
  bgCoverImage: "/images/mag_strength.webp",
  fgCoverImage: "/images/mag_sleep.webp"
};

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "VIEWER");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { websiteSettings: true }
    });

    const customConfig = settings?.websiteSettings?.servicesBannerConfig || {};
    const bannerConfig = {
      ...DEFAULT_BANNER_CONFIG,
      ...customConfig,
      benefits: customConfig.benefits && customConfig.benefits.length > 0
        ? customConfig.benefits
        : DEFAULT_BANNER_CONFIG.benefits
    };

    return NextResponse.json(apiSuccess({ bannerConfig }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();

    const existingSettings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { websiteSettings: true }
    });

    const currentWebsiteSettings = existingSettings?.websiteSettings || {};

    const newServicesBannerConfig = {
      badgeText: body.badgeText || DEFAULT_BANNER_CONFIG.badgeText,
      title: body.title || DEFAULT_BANNER_CONFIG.title,
      description: body.description || DEFAULT_BANNER_CONFIG.description,
      benefits: Array.isArray(body.benefits) ? body.benefits : DEFAULT_BANNER_CONFIG.benefits,
      buttonText: body.buttonText || DEFAULT_BANNER_CONFIG.buttonText,
      buttonLink: body.buttonLink || DEFAULT_BANNER_CONFIG.buttonLink,
      bgCoverImage: body.bgCoverImage || DEFAULT_BANNER_CONFIG.bgCoverImage,
      fgCoverImage: body.fgCoverImage || DEFAULT_BANNER_CONFIG.fgCoverImage
    };

    const updatedSettings = await prisma.globalSettings.upsert({
      where: { siteId: auth.siteId },
      update: {
        websiteSettings: {
          ...currentWebsiteSettings,
          servicesBannerConfig: newServicesBannerConfig
        }
      },
      create: {
        siteId: auth.siteId,
        websiteSettings: {
          servicesBannerConfig: newServicesBannerConfig
        }
      }
    });

    return NextResponse.json(
      apiSuccess({ bannerConfig: updatedSettings.websiteSettings.servicesBannerConfig })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
