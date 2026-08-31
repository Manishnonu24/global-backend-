import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;

    // Fetch site pages, posts, and media to scan
    const [pages, posts, media] = await Promise.all([
      prisma.page.findMany({
        where: { siteId, deletedAt: null },
        include: { sections: true },
      }),
      prisma.post.findMany({
        where: { siteId, deletedAt: null },
      }),
      prisma.media.findMany({
        where: { siteId, deletedAt: null },
      }),
    ]);

    const seoAudits = [];
    const accessibilityAudits = [];
    const brokenLinks = [];
    let speedScore = 95; // Default initial performance score
    let pageLoadTimeMs = 450; // Mock base load time

    // Validate active routes map (for link check)
    const validSlugs = new Set();
    pages.forEach((p) => validSlugs.add(p.slug.startsWith("/") ? p.slug : `/${p.slug}`));
    posts.forEach((p) => validSlugs.add(`/blogs/${p.slug}`));
    validSlugs.add("/");

    // 1. SEO Scan
    pages.forEach((page) => {
      const issues = [];
      if (!page.seoTitle) issues.push("Missing SEO Title");
      if (page.seoTitle && page.seoTitle.length > 60) issues.push("SEO Title exceeds recommended 60 chars");
      if (!page.seoDescription) issues.push("Missing SEO Description");
      if (page.seoDescription && page.seoDescription.length > 160) issues.push("SEO Description exceeds recommended 160 chars");
      if (!page.ogImage) issues.push("Missing OpenGraph (OG) image");
      if (!page.canonicalUrl) issues.push("Missing Canonical URL path");

      seoAudits.push({
        type: "PAGE",
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        issues,
        score: Math.max(0, 100 - issues.length * 15),
      });

      // Parse visual content blocks for links to detect broken paths (Broken Links scanner)
      if (page.sections) {
        page.sections.forEach((section) => {
          try {
            const content = typeof section.content === "string" ? JSON.parse(section.content) : section.content;
            if (content && typeof content === "object") {
              // Extract links (e.g. content.buttonLink or text containing hrefs)
              const link = content.buttonLink || content.link || content.ctaLink;
              if (link && typeof link === "string" && link.startsWith("/")) {
                // Remove query strings
                const cleanLink = link.split("?")[0];
                if (!validSlugs.has(cleanLink)) {
                  brokenLinks.push({
                    pageId: page.id,
                    pageTitle: page.title,
                    linkText: content.buttonText || "Button Link",
                    targetUrl: link,
                    error: "404 Not Found (Unmapped Slug)",
                  });
                }
              }
            }
          } catch {
            // ignore JSON errors
          }
        });
      }
    });

    posts.forEach((post) => {
      const issues = [];
      if (!post.seoTitle) issues.push("Missing SEO Title");
      if (!post.seoDescription) issues.push("Missing SEO Description");
      if (!post.ogImage) issues.push("Missing OG Image");

      seoAudits.push({
        type: "POST",
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        issues,
        score: Math.max(0, 100 - issues.length * 20),
      });
    });

    // 2. Accessibility Scan (Check Alt Text on Media library images)
    const images = media.filter((m) => m.isImage);
    images.forEach((img) => {
      if (!img.altText || img.altText.trim() === "") {
        accessibilityAudits.push({
          mediaId: img.id,
          fileName: img.fileName,
          url: img.url,
          issue: "Missing image alt text (screen reader compliance)",
          severity: "MEDIUM",
        });
      }
    });

    // 3. Performance diagnostics
    const totalAssets = media.length;
    const heavyImagesCount = media.filter((m) => m.isImage && m.size && m.size > 500000).length; // Images > 500KB
    if (heavyImagesCount > 0) {
      speedScore -= heavyImagesCount * 5;
      pageLoadTimeMs += heavyImagesCount * 150;
    }
    speedScore = Math.max(50, speedScore);

    const overallSeoScore = seoAudits.length > 0 
      ? Math.round(seoAudits.reduce((acc, item) => acc + item.score, 0) / seoAudits.length) 
      : 100;

    return NextResponse.json(
      apiSuccess({
        timestamp: new Date().toISOString(),
        overallSeoScore,
        performance: {
          speedScore,
          loadTimeMs: pageLoadTimeMs,
          totalAssets,
          heavyImagesCount,
        },
        seoScan: seoAudits,
        accessibility: {
          score: images.length > 0 ? Math.round(((images.length - accessibilityAudits.length) / images.length) * 100) : 100,
          issues: accessibilityAudits,
        },
        brokenLinks: {
          count: brokenLinks.length,
          links: brokenLinks,
        },
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
