import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;

    // Fetch all pages and their sections
    const pages = await prisma.page.findMany({
      where: { siteId },
      include: { sections: true }
    });

    // Fetch all post slugs
    const posts = await prisma.post.findMany({
      where: { siteId },
      select: { slug: true }
    });

    // Compile a set of valid slugs (e.g., "/", "/about", "/blog/post-1")
    const validSlugs = new Set();
    pages.forEach(p => validSlugs.add(p.slug));
    posts.forEach(p => {
      const slug = p.slug.startsWith("/") ? p.slug : `/${p.slug}`;
      validSlugs.add(`/blog${slug}`);
    });

    const brokenLinks = [];

    // Helper to check links
    const checkLink = (pageSlug, linkUrl, contextText) => {
      if (!linkUrl || typeof linkUrl !== "string") return;
      
      // We only scan internal relative links starting with "/"
      if (linkUrl.startsWith("/") && !linkUrl.startsWith("//")) {
        const pathOnly = linkUrl.split("?")[0].split("#")[0]; // remove query and hashes
        if (!validSlugs.has(pathOnly) && pathOnly !== "/" && pathOnly !== "") {
          brokenLinks.push({
            pageSlug,
            brokenLink: linkUrl,
            context: contextText
          });
        }
      }
    };

    // Scan all pages sections for internal links
    pages.forEach(p => {
      p.sections.forEach(sec => {
        const content = sec.content || {};
        
        // Check primary and secondary button CTAs
        if (content.primaryButton && content.primaryButton.url) {
          checkLink(p.slug, content.primaryButton.url, `${sec.type} - Primary Button`);
        }
        if (content.secondaryButton && content.secondaryButton.url) {
          checkLink(p.slug, content.secondaryButton.url, `${sec.type} - Secondary Button`);
        }

        // Check text block CTA
        if (content.cta && content.cta.url) {
          checkLink(p.slug, content.cta.url, `${sec.type} - Text block CTA`);
        }

        // If content contains standard link fields
        if (content.url) {
          checkLink(p.slug, content.url, `${sec.type} - Link url`);
        }
      });
    });

    return NextResponse.json(apiSuccess({ scannedPagesCount: pages.length,
      scannedPostsCount: posts.length,
      brokenLinks }));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Broken links scan error:");
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
