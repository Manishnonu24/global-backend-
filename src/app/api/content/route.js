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

    // ── Batched pre-fetch: detect which section types are present, then fire
    // all required DB queries concurrently in a single Promise.all so the
    // subsequent .map() can be fully synchronous (fixes N+1 queries).
    const sectionTypes = new Set(
      visibleSections.map((s) => String(s.type || "").toUpperCase()),
    );

    // For BLOGS we honour the `maxItems` of the first BLOGS section (or 6).
    const blogsSection = visibleSections.find(
      (s) => String(s.type || "").toUpperCase() === "BLOGS",
    );
    const blogsTake = (blogsSection?.content?.maxItems) || 6;

    const [
      prefetchedServices,
      prefetchedTeam,
      prefetchedTestimonials,
      prefetchedFaqs,
      prefetchedPosts,
    ] = await Promise.all([
      sectionTypes.has("SERVICES")
        ? prisma.service.findMany({
            where: { siteId, status: "ACTIVE", deletedAt: null },
            orderBy: { sortOrder: "asc" },
          })
        : Promise.resolve(null),

      sectionTypes.has("TEAM")
        ? prisma.teammember.findMany({
            where: { siteId, deletedAt: null },
            orderBy: { sortOrder: "asc" },
          })
        : Promise.resolve(null),

      sectionTypes.has("TESTIMONIALS")
        ? prisma.testimonial.findMany({
            where: { siteId, showHide: true, deletedAt: null },
            orderBy: { sortOrder: "asc" },
          })
        : Promise.resolve(null),

      sectionTypes.has("FAQ")
        ? prisma.faq.findMany({
            where: {
              siteId,
              showHide: true,
              deletedAt: null,
              OR: [{ pageId: null }, { pageId: page.id }],
            },
            orderBy: { sortOrder: "asc" },
          })
        : Promise.resolve(null),

      sectionTypes.has("BLOGS")
        ? prisma.post.findMany({
            where: {
              siteId,
              status: "PUBLISHED",
              deletedAt: null,
              publishedAt: { lte: new Date() },
            },
            orderBy: { publishedAt: "desc" },
            take: blogsTake,
            include: {
              author: { select: { id: true, email: true } },
              categories: { select: { id: true, name: true, slug: true } },
              featuredImage: {
                select: { id: true, url: true, secureUrl: true, altText: true },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    // ── Synchronous map: assign pre-fetched data — no DB calls inside.
    const sectionsWithUrls = visibleSections.map((s) => {
      const content = { ...(s.content || {}) };
      if (content.bannerMediaId && mediaMap[content.bannerMediaId]) {
        content.bannerUrl = mediaMap[content.bannerMediaId];
      }
      if (content.imageMediaId && mediaMap[content.imageMediaId]) {
        content.imageUrl = mediaMap[content.imageMediaId];
      }

      const type = String(s.type || "").toUpperCase();
      if (type === "SERVICES" && prefetchedServices !== null) {
        content.items = prefetchedServices.map((svc) => {
          if (svc.price) {
            const trimmed = String(svc.price).trim();
            const isNumeric = !isNaN(trimmed) && !isNaN(parseFloat(trimmed));
            const hasCurrencySymbol = /[\$\€\£\¥\₹]/.test(trimmed);
            if (isNumeric && !hasCurrencySymbol) {
              return { ...svc, price: `$${trimmed}` };
            }
          }
          return svc;
        });
      } else if (type === "TEAM" && prefetchedTeam !== null) {
        content.items = prefetchedTeam;
      } else if (type === "TESTIMONIALS" && prefetchedTestimonials !== null) {
        content.items = prefetchedTestimonials;
      } else if (type === "FAQ" && prefetchedFaqs !== null) {
        content.items = prefetchedFaqs;
      } else if (type === "BLOGS" && prefetchedPosts !== null) {
        content.items = prefetchedPosts;
      }

      return { ...s, content };
    });

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
