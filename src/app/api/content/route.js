import { NextResponse } from "next/server";
import { pageService } from "@/services/page.service";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const slug = searchParams.get("slug");

    if (!siteId || slug === null) {
      return NextResponse.json(
        { error: "siteId & slug required" },
        { status: 400 },
      );
    }

    const page = await pageService.getPageWithSections(siteId, slug);

    const preview = searchParams.get("preview") === "true";
    if (!preview && page.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Page not found or is not published" },
        { status: 404 },
      );
    }

    // Only render sections that are explicitly visible (default true when field absent)
    const visibleSections = page.sections.filter((s) => s.isVisible !== false);

    // Resolve referenced media ids -> URLs in content
    const mediaIds = new Set();
    visibleSections.forEach((s) => {
      const c = s.content || {};
      if (c.bannerMediaId) mediaIds.add(c.bannerMediaId);
      if (c.imageMediaId) mediaIds.add(c.imageMediaId);
    });

    let mediaMap = {};
    if (mediaIds.size > 0) {
      const mediaRows = await prisma.media.findMany({
        where: { id: { in: Array.from(mediaIds) } },
        select: { id: true, secureUrl: true, url: true, altText: true },
      });
      mediaMap = mediaRows.reduce((acc, m) => {
        acc[m.id] = m.secureUrl || m.url || null;
        return acc;
      }, {});
    }

    const sectionsWithUrls = await Promise.all(
      visibleSections.map(async (s) => {
        const content = { ...(s.content || {}) };
        if (content.bannerMediaId && mediaMap[content.bannerMediaId]) {
          content.bannerUrl = mediaMap[content.bannerMediaId];
        }
        if (content.imageMediaId && mediaMap[content.imageMediaId]) {
          content.imageUrl = mediaMap[content.imageMediaId];
        }

        // Dynamically fetch items for component-specific lists
        const type = String(s.type || "").toUpperCase();
        if (type === "SERVICES") {
          const services = await prisma.service.findMany({
            where: { siteId, status: "ACTIVE", deletedAt: null },
            orderBy: { sortOrder: "asc" },
          });
          content.items = services.map((s) => {
            if (s.price) {
              const trimmed = String(s.price).trim();
              const isNumeric = !isNaN(trimmed) && !isNaN(parseFloat(trimmed));
              const hasCurrencySymbol = /[\$\€\£\¥\₹]/.test(trimmed);
              if (isNumeric && !hasCurrencySymbol) {
                return { ...s, price: `$${trimmed}` };
              }
            }
            return s;
          });
        } else if (type === "TEAM") {
          content.items = await prisma.teammember.findMany({
            where: { siteId, deletedAt: null },
            orderBy: { sortOrder: "asc" },
          });
        } else if (type === "TESTIMONIALS") {
          content.items = await prisma.testimonial.findMany({
            where: { siteId, showHide: true, deletedAt: null },
            orderBy: { sortOrder: "asc" },
          });
        } else if (type === "FAQ") {
          content.items = await prisma.faq.findMany({
            where: {
              siteId,
              showHide: true,
              deletedAt: null,
              OR: [{ pageId: null }, { pageId: page.id }],
            },
            orderBy: { sortOrder: "asc" },
          });
        } else if (type === "BLOGS") {
          const postsRes = await prisma.post.findMany({
            where: {
              siteId,
              status: "PUBLISHED",
              deletedAt: null,
              publishedAt: { lte: new Date() },
            },
            orderBy: { publishedAt: "desc" },
            take: content.maxItems || 6,
            include: {
              author: { select: { id: true, email: true } },
              categories: { select: { id: true, name: true, slug: true } },
              featuredImage: {
                select: { id: true, url: true, secureUrl: true, altText: true },
              },
            },
          });
          content.items = postsRes;
        }

        return { ...s, content };
      }),
    );

    const seo = {
      title: page.seoTitle || page.title,
      description: page.seoDescription || null,
      canonical: page.canonicalUrl || null,
      ogImage: page.ogImage || null,
    };

    const { sections, ...pageData } = page;

    return NextResponse.json({
      page: pageData,
      sections: sectionsWithUrls,
      seo,
      jsonLd: page.jsonLd ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
