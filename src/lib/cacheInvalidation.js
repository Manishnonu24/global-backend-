import { revalidateTag } from "next/cache";

/**
 * Revalidates cache tags for a specific CMS page and the general pages collection.
 * 
 * @param {string} siteId - Target website site ID
 * @param {string} [slug] - Optional page slug (e.g. "/about")
 */
export function revalidatePageCache(siteId, slug) {
  try {
    revalidateTag("pages");
    if (siteId) {
      revalidateTag(`pages:${siteId}`);
      if (slug) {
        const normalized = slug.startsWith("/") ? slug : `/${slug}`;
        revalidateTag(`page:${siteId}:${normalized}`);
      }
    }
  } catch (error) {
    // Gracefully handle environments without active request context or mocks
    console.warn(`[cacheInvalidation] revalidatePageCache failed for siteId="${siteId}" slug="${slug}":`, error?.message || error);
  }
}

/**
 * Revalidates cache tags for redirects.
 * 
 * @param {string} siteId - Target website site ID
 */
export function revalidateRedirectCache(siteId) {
  try {
    revalidateTag("redirects");
    if (siteId) {
      revalidateTag(`redirects:${siteId}`);
    }
  } catch (error) {
    console.warn(`[cacheInvalidation] revalidateRedirectCache failed for siteId="${siteId}":`, error?.message || error);
  }
}
