/*
 * src/lib/routeClassification.js
 * Helper to classify a Next.js route into pageType, templateKey, and isHardcoded flag.
 * Used by both the internal route‑sync process and the integration manifest route.
 */

/**
 * Checks if a route slug contains bracket parameters like [slug] or [...path]
 *
 * @param {string} slug - The route slug to check
 * @returns {boolean} True if the route is an unresolved dynamic pattern
 */
export function isDynamicRoutePattern(slug) {
  if (!slug) return false;
  return /\[.+?\]/.test(slug);
}

/**
 * Resolves a safe, concrete internal path for live preview.
 * Refuses unresolved dynamic patterns.
 *
 * @param {Object} page - The page object containing slug/sourceRoute
 * @returns {string|null} The resolved path, or null if invalid/dynamic
 */
export function resolvePagePreviewPath(page) {
  const slug = page?.slug || page?.sourceRoute;
  if (!slug) return null;
  if (isDynamicRoutePattern(slug)) return null;
  return slug.startsWith("/") ? slug : `/${slug}`;
}

export function classifyRoute({ pathname, isDynamic }) {
  // Normalise pathname (remove trailing slash)
  const cleanPath = pathname.replace(/\/+$/, "") || "/";

  // Hard‑coded mapping for CODE_TEMPLATE pages
  const codeTemplateMap = {
    '/': 'HOME',
    '/about': 'ABOUT',
    '/contact': 'CONTACT',
    '/services': 'SERVICES',
    '/blogs': 'BLOGS',
    '/publication': 'PUBLICATION',
    '/quizzes': 'QUIZZES',
    '/recipes': 'RECIPES',
    '/info': 'INFO',
  };

  if (codeTemplateMap[cleanPath]) {
    return {
      pageType: 'CODE_TEMPLATE',
      templateKey: codeTemplateMap[cleanPath],
      isHardcoded: true,
    };
  }

  // All other non‑API, non‑_next routes are considered CMS built pages.
  if (!pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    return {
      pageType: 'CMS_BUILT',
      templateKey: 'GENERAL',
      isHardcoded: false,
    };
  }

  // Default fallback – treat as system page (read‑only)
  return {
    pageType: 'SYSTEM',
    templateKey: null,
    isHardcoded: true,
  };
}
