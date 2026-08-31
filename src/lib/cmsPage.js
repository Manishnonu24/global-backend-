import { cache } from "react";
import { pageService } from "@/services/page.service";
import prisma from "@/lib/prisma";
import { getDefaultSiteId } from "@/lib/siteResolver";
import { parseSeoKeywords } from "@/lib/seoKeywords";

/**
 * Resolves a CMS page directly via Database queries instead of making loopback HTTP requests.
 * Wrapped with React cache() to deduplicate execution between generateMetadata and page components.
 * 
 * @param {string} slug - Page path slug
 * @param {boolean} preview - If true, bypasses status: "PUBLISHED" and isEnabled visibility checks, reading draft sections
 */
export const getCmsPage = cache(async (slug, preview = false) => {
  const siteId = getDefaultSiteId();
  try {
    const page = await pageService.getPageWithSections(siteId, slug);
    if (!page) return null;

    if (!preview) {
      if (
        page.status !== "PUBLISHED" ||
        page.isEnabled === false ||
        page.deletedAt != null
      ) {
        return null;
      }
    }

    // Determine if we should read from publishedSnapshot (public view) or live database sections (preview / draft)
    const isPublicSnapshot = !preview && page.publishedSnapshot;
    const rawSections = isPublicSnapshot
      ? page.publishedSnapshot.sections || []
      : page.sections || [];

    // Only render sections that are explicitly visible (default true when field absent)
    const visibleSections = rawSections.filter((s) => s.isVisible !== false && s.showHide !== false && s.showHide !== 0);

    const sectionsWithUrls = await enrichSectionsWithData(siteId, visibleSections, page.id);

    const seo = {
      title: isPublicSnapshot
        ? page.publishedSnapshot.seoTitle || page.publishedSnapshot.title
        : page.seoTitle || page.title,
      description: isPublicSnapshot
        ? page.publishedSnapshot.seoDescription || null
        : page.seoDescription || null,
      keywords: parseSeoKeywords(
        isPublicSnapshot
          ? page.publishedSnapshot.seoKeywords || null
          : page.seoKeywords || null,
      ),
      canonical: isPublicSnapshot
        ? page.publishedSnapshot.canonicalUrl || null
        : page.canonicalUrl || null,
      ogImage: isPublicSnapshot
        ? page.publishedSnapshot.ogImage || null
        : page.ogImage || null,
      jsonLd: isPublicSnapshot
        ? page.publishedSnapshot.jsonLd || null
        : page.jsonLd || null,
    };

    const { sections, ...pageData } = page;

    return {
      page: {
        ...pageData,
        title: isPublicSnapshot ? page.publishedSnapshot.title || page.title : page.title,
      },
      sections: sectionsWithUrls,
      seo,
      jsonLd: isPublicSnapshot ? page.publishedSnapshot.jsonLd ?? null : page.jsonLd ?? null,
    };
  } catch (error) {
    // Don't log expected 404s — unknown slugs (crawlers, browser devtools probes, etc.) are normal
    if (error?.code !== "NOT_FOUND" && error?.status !== 404) {
      console.error(`[cmsPage] Unexpected error resolving slug "${slug}":`, error);
    }
    return null;
  }
});

export async function enrichSectionsWithData(siteId, visibleSections, pageId = null) {
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

  return await Promise.all(
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
        content.items = services.map((srv) => {
          if (srv.price) {
            const trimmed = String(srv.price).trim();
            const isNumeric = !isNaN(trimmed) && !isNaN(parseFloat(trimmed));
            const hasCurrencySymbol = /[\$\€\£\¥\₹]/.test(trimmed);
            if (isNumeric && !hasCurrencySymbol) {
              return { ...srv, price: `$${trimmed}` };
            }
          }
          return srv;
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
            ...(pageId ? { OR: [{ pageId: null }, { pageId }] } : { pageId: null }),
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
}
