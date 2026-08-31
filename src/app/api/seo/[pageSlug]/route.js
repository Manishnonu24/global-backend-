import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


export async function GET(req, context) {
  try {
    const params = await context.params;
    const pageSlug = params?.pageSlug;
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId || !pageSlug) {
      return NextResponse.json({ error: "siteId and pageSlug are required" }, { status: 400 });
    }

    let decodedSlug = decodeURIComponent(pageSlug);
    if (decodedSlug === "home" || decodedSlug === "root") {
      decodedSlug = "/";
    }
    // Standardize slug format (prefixed with /)
    const formattedSlug = decodedSlug.startsWith("/") ? decodedSlug : `/${decodedSlug}`;

    const slugWithSlash = formattedSlug;
    const slugWithoutSlash = formattedSlug.startsWith("/") ? formattedSlug.substring(1) : formattedSlug;

    // Fetch site domain setting with fallback
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { websiteSettings: true }
    });
    let domain = (settings?.websiteSettings?.domain || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");

    // 1. Try to find a Page
    const page = await prisma.page.findFirst({
      where: {
        siteId,
        slug: { in: [slugWithSlash, slugWithoutSlash] },
        deletedAt: null
      },
      select: { title: true, seoTitle: true, seoDescription: true, canonicalUrl: true, ogImage: true, jsonLd: true }
    });

    if (page) {
      return NextResponse.json(apiSuccess({ type: "page",
        seo: {
          title: page.seoTitle || page.title,
          description: page.seoDescription || null,
          canonical: page.canonicalUrl || `${domain}${formattedSlug}`,
          ogImage: page.ogImage || null,
          jsonLd: page.jsonLd
        } }));
    }

    // 2. Try to find a Legal Page
    if (formattedSlug.startsWith("/legal/")) {
      const legalType = formattedSlug.split("/")[2];
      const mapping = {
        "privacy": "privacy",
        "privacy-policy": "privacy",
        "terms": "terms",
        "terms-of-service": "terms",
        "terms-of-use": "terms",
        "cookies": "cookies",
        "cookie-policy": "cookies",
        "disclaimer": "disclaimer",
        "refund": "refund",
        "refund-policy": "refund"
      };
      const dbType = mapping[legalType] || legalType;

      const legalPage = await prisma.legalpage.findFirst({
        where: {
          siteId,
          type: dbType,
          published: true
        },
        select: { title: true, content: true }
      });

      if (legalPage) {
        return NextResponse.json(apiSuccess({
          type: "legal",
          seo: {
            title: `${legalPage.title} - The Infinium`,
            description: legalPage.content ? `${legalPage.content.replace(/<[^>]*>/g, "").substring(0, 155)}...` : null,
            canonical: `${domain}${formattedSlug}`
          }
        }));
      }
    }

    // 3. Try to find a blog Post (without leading / for blog slugs in some databases, so let's check both formats)
    const postSlug = formattedSlug.startsWith("/") ? formattedSlug.substring(1) : formattedSlug;
    let targetPostSlug = postSlug;
    if (postSlug.startsWith("blog/")) {
      targetPostSlug = postSlug.substring(5);
    } else if (postSlug.startsWith("blogs/")) {
      targetPostSlug = postSlug.substring(6);
    }

    const post = await prisma.post.findFirst({
      where: {
        siteId,
        OR: [
          { slug: postSlug },
          { slug: formattedSlug },
          { slug: targetPostSlug }
        ]
      },
      select: {
        title: true,
        seoTitle: true,
        seoDescription: true,
        excerpt: true,
        canonicalUrl: true,
        ogImage: true,
        featuredImage: {
          select: {
            secureUrl: true,
            url: true,
            altText: true
          }
        }
      }
    });

    if (post) {
      const ogImageUrl = post.ogImage || post.featuredImage?.secureUrl || post.featuredImage?.url || null;
      return NextResponse.json(apiSuccess({ type: "post",
        seo: {
          title: post.seoTitle || post.title,
          description: post.seoDescription || post.excerpt || null,
          canonical: post.canonicalUrl || `${domain}/posts/${targetPostSlug}`,
          ogImage: ogImageUrl,
          ogImageAlt: post.featuredImage?.altText || post.seoTitle || post.title || ""
        } }));
    }

    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "GET /api/seo/[pageSlug] error:");
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
