import prisma from "@/lib/prisma";
import { parseSeoKeywords } from "@/lib/seoKeywords";

/**
 * Safely fetches and resolves normalized SEO metadata for any public route slug or entity path.
 * Enforces draft vs published snapshot isolation and indexability rules.
 *
 * Returns normalized object: { title, description, keywords, canonical, ogImage, jsonLd, robots }
 *
 * @param {string} pageSlug - Public route path (e.g. '/' or '/blogs/my-post' or '/recipes/123')
 * @param {string|null} siteIdOverride - Optional explicit siteId
 * @param {boolean} isPreview - Whether authenticated preview mode is active
 */
export async function getSeoMetadata(pageSlug, siteIdOverride = null, isPreview = false) {
  // Compute defaultCanonical OUTSIDE the inner try so it is accessible in catch
  const _domain = (process.env.NEXT_PUBLIC_APP_URL || "https://ahealthplace.com").replace(/\/+$/, "");
  const _slug = pageSlug || "/";
  const _formatted = _slug.startsWith("/") ? _slug : `/${_slug}`;
  const _outerDefaultCanonical = `${_domain}${_formatted}`;

  try {
    const siteId = siteIdOverride || process.env.NEXT_PUBLIC_SITE_ID || "AHP";
    let decodedSlug = pageSlug || "/";
    if (decodedSlug === "home" || decodedSlug === "root" || decodedSlug === "") {
      decodedSlug = "/";
    }

    const formattedSlug = decodedSlug.startsWith("/") ? decodedSlug : `/${decodedSlug}`;
    const slugWithoutSlash = formattedSlug.substring(1);

    // Domain resolution for canonical fallback
    let domain = (process.env.NEXT_PUBLIC_APP_URL || "https://ahealthplace.com").replace(/\/+$/, "");
    try {
      const settings = await prisma.globalSettings.findUnique({
        where: { siteId },
        select: { websiteSettings: true },
      });
      if (settings?.websiteSettings?.domain) {
        domain = settings.websiteSettings.domain.replace(/\/+$/, "");
      }
    } catch {
      // Fallback to default domain
    }

    const defaultCanonical = `${domain}${formattedSlug}`;
    const noIndexRobots = { index: false, follow: false };
    const indexRobots = { index: true, follow: true };

    // 1. Blog Post route: /blogs/[slug]
    if (formattedSlug.startsWith("/blogs/")) {
      const postSlug = formattedSlug.replace(/^\/blogs\//, "");
      const post = await prisma.post.findFirst({
        where: {
          siteId,
          slug: postSlug,
          deletedAt: null,
          ...(isPreview ? {} : { status: "PUBLISHED" }),
        },
        select: {
          title: true,
          excerpt: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          ogImage: true,
          jsonLd: true,
          status: true,
          featuredImage: { select: { url: true, secureUrl: true } },
        },
      });

      if (!post || (!isPreview && post.status !== "PUBLISHED")) {
        return {
          title: "Article Not Found",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      return {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || null,
        canonical: post.canonicalUrl || defaultCanonical,
        ogImage: post.ogImage || post.featuredImage?.secureUrl || post.featuredImage?.url || null,
        jsonLd: post.jsonLd || null,
        robots: indexRobots,
      };
    }

    // 2. Service route: /services/[slug]
    if (formattedSlug.startsWith("/services/")) {
      const serviceSlug = formattedSlug.replace(/^\/services\//, "");
      if (serviceSlug.startsWith("private/")) {
        return {
          title: "Private Service",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      const service = await prisma.service.findFirst({
        where: {
          siteId,
          slug: serviceSlug,
          visibility: "PUBLIC",
          deletedAt: null,
          ...(isPreview ? {} : { status: "ACTIVE", visible: true }),
        },
        select: {
          title: true,
          description: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          ogImage: true,
          jsonLd: true,
          status: true,
          visible: true,
          featuredImage: { select: { url: true, secureUrl: true } },
        },
      });

      if (!service || (!isPreview && (service.status !== "ACTIVE" || !service.visible))) {
        return {
          title: "Service Not Found",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      const cleanDesc = service.description
        ? service.description.replace(/<[^>]*>?/gm, "").substring(0, 160)
        : null;

      return {
        title: service.seoTitle || `${service.title} | A Health Place`,
        description: service.seoDescription || cleanDesc,
        canonical: service.canonicalUrl || defaultCanonical,
        ogImage: service.ogImage || service.featuredImage?.secureUrl || service.featuredImage?.url || null,
        jsonLd: service.jsonLd || null,
        robots: indexRobots,
      };
    }

    // 3. Publication route: /publication/[slug]
    if (formattedSlug.startsWith("/publication/")) {
      const issueSlug = formattedSlug.replace("/publication/", "");
      const mag = await prisma.magazine.findFirst({
        where: {
          slug: issueSlug,
          ...(isPreview ? {} : { status: 1 }),
        },
        select: {
          title: true,
          description: true,
          coverImage: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          ogImage: true,
          jsonLd: true,
          status: true,
        },
      });

      if (!mag || (!isPreview && mag.status !== 1)) {
        return {
          title: "Issue Not Found",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      return {
        title: mag.seoTitle || `${mag.title} | Digital Magazine`,
        description: mag.seoDescription || mag.description || null,
        canonical: mag.canonicalUrl || defaultCanonical,
        ogImage: mag.ogImage || mag.coverImage || null,
        jsonLd: mag.jsonLd || null,
        robots: indexRobots,
      };
    }

    // 4. Quiz route: /quizzes/[slug]
    if (formattedSlug.startsWith("/quizzes/")) {
      const quizSlug = formattedSlug.replace(/^\/quizzes\//, "");
      if (quizSlug.startsWith("results/")) {
        return {
          title: "Quiz Results | A Health Place",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      const quizType = await prisma.quizType.findFirst({
        where: {
          slug: quizSlug,
          ...(isPreview ? {} : { isActive: true }),
        },
        select: {
          title: true,
          description: true,
          imageUrl: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          ogImage: true,
          jsonLd: true,
          isActive: true,
        },
      });

      if (!quizType || (!isPreview && !quizType.isActive)) {
        return {
          title: "Quiz Not Found",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      return {
        title: quizType.seoTitle || `${quizType.title} | A Health Place`,
        description: quizType.seoDescription || quizType.description || null,
        canonical: quizType.canonicalUrl || defaultCanonical,
        ogImage: quizType.ogImage || quizType.imageUrl || null,
        jsonLd: quizType.jsonLd || null,
        robots: indexRobots,
      };
    }

    // 5. Recipe detail route: /recipes/[id]
    if (formattedSlug.startsWith("/recipes/") && formattedSlug !== "/recipes") {
      const recipeId = formattedSlug.replace(/^\/recipes\//, "");
      const recipe = await prisma.recipe.findFirst({
        where: {
          id: recipeId,
          ...(isPreview ? {} : { status: "APPROVED" }),
        },
        select: {
          title: true,
          description: true,
          imageUrl: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          ogImage: true,
          jsonLd: true,
          status: true,
        },
      });

      if (!recipe || (!isPreview && recipe.status !== "APPROVED")) {
        return {
          title: "Recipe Not Found",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      return {
        title: recipe.seoTitle || `${recipe.title} | Daily Diet Recipe`,
        description: recipe.seoDescription || recipe.description || null,
        canonical: recipe.canonicalUrl || defaultCanonical,
        ogImage: recipe.ogImage || recipe.imageUrl || null,
        jsonLd: recipe.jsonLd || null,
        robots: indexRobots,
      };
    }

    // 6. Legal route: /legal/[type]
    if (formattedSlug.startsWith("/legal/")) {
      const legalType = formattedSlug.replace(/^\/legal\//, "");
      const mapping = {
        privacy: "privacy",
        "privacy-policy": "privacy",
        terms: "terms",
        "terms-of-service": "terms",
        cookies: "cookies",
        "cookie-policy": "cookies",
        disclaimer: "disclaimer",
        refund: "refund",
      };
      const cleanType = mapping[legalType] || legalType;

      const legalPage = await prisma.legalpage.findFirst({
        where: {
          siteId,
          type: cleanType,
          deletedAt: null,
          ...(isPreview ? {} : { published: true }),
        },
        select: {
          title: true,
          published: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          ogImage: true,
          jsonLd: true,
        },
      });

      if (!legalPage || (!isPreview && !legalPage.published)) {
        return {
          title: "Legal Policy Not Found",
          description: null,
          canonical: defaultCanonical,
          ogImage: null,
          jsonLd: null,
          robots: noIndexRobots,
        };
      }

      return {
        title: legalPage.seoTitle || `${legalPage.title} | A Health Place`,
        description: legalPage.seoDescription || `Read the official ${legalPage.title} of A Health Place website.`,
        canonical: legalPage.canonicalUrl || defaultCanonical,
        ogImage: legalPage.ogImage || null,
        jsonLd: legalPage.jsonLd || null,
        robots: indexRobots,
      };
    }

    // 7. Page record (CODE_TEMPLATE & CMS_BUILT)
    const page = await prisma.page.findFirst({
      where: {
        siteId,
        slug: { in: [formattedSlug, slugWithoutSlash] },
        deletedAt: null,
      },
      select: {
        title: true,
        status: true,
        isEnabled: true,
        seoTitle: true,
        seoKeywords: true,
        seoDescription: true,
        canonicalUrl: true,
        ogImage: true,
        jsonLd: true,
        publishedSnapshot: true,
      },
    });

    if (!page) {
      return {
        title: "A Health Place | Empowering Health Decisions",
        description: "Your daily guide to health, wellness, nutrition, and holistic care.",
        canonical: defaultCanonical,
        ogImage: null,
        jsonLd: null,
        robots: indexRobots,
      };
    }

    if (!isPreview && (page.status !== "PUBLISHED" || !page.isEnabled)) {
      return {
        title: page.title || "A Health Place",
        description: null,
        canonical: defaultCanonical,
        ogImage: null,
        jsonLd: null,
        robots: noIndexRobots,
      };
    }

    // Snapshot isolation: For published non-preview requests, publishedSnapshot is authoritative
    const snap = !isPreview && page.status === "PUBLISHED" && page.publishedSnapshot ? page.publishedSnapshot : null;

    const resolvedTitle = snap
      ? (snap.seoTitle || snap.title || page.title)
      : (page.seoTitle || page.title);

    const resolvedDesc = snap
      ? (snap.seoDescription ?? null)
      : (page.seoDescription ?? null);

    const resolvedKeywords = snap
      ? parseSeoKeywords(snap.seoKeywords ?? null)
      : parseSeoKeywords(page.seoKeywords ?? null);

    const resolvedCanonical = snap
      ? (snap.canonicalUrl || defaultCanonical)
      : (page.canonicalUrl || defaultCanonical);

    const resolvedOgImage = snap
      ? (snap.ogImage ?? null)
      : (page.ogImage ?? null);

    const resolvedJsonLd = snap
      ? (snap.jsonLd ?? null)
      : (page.jsonLd ?? null);

    return {
      title: resolvedTitle,
      description: resolvedDesc,
      keywords: resolvedKeywords,
      canonical: resolvedCanonical,
      ogImage: resolvedOgImage,
      jsonLd: resolvedJsonLd,
      robots: indexRobots,
    };
  } catch (err) {
    console.error("SEO Metadata resolution error:", err);
    return {
      title: "A Health Place | Empowering Health Decisions",
      description: "Empowering your health decisions through evidence-based health information.",
      canonical: _outerDefaultCanonical,
      ogImage: null,
      jsonLd: null,
      robots: { index: true, follow: true },
    };
  }
}
