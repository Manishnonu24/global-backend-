import { cache } from "react";
import prisma from "@/lib/prisma";
import { getDefaultSiteId, getDefaultSiteMetadata } from "@/lib/siteResolver";
/**
 * Resolves the active site for a given authenticated user.
 * Supporting cookie-based workspace selection switcher.
 *
 * Wrapped in React cache() so repeated calls within the same request
 * (e.g. from dashboard layout + page) resolve to a single DB query.
 *
 * @param {object} user - User object from requireAuth()
 * @returns {Promise<object|null>} Prisma Site record or null
 */
export const getSiteForUser = cache(async (user) => {
  if (!user) return null;

  // Resolve directly from environment variables (single-site mode)
  const targetSiteId = getDefaultSiteId();
  let site = await prisma.site.findUnique({
    where: { id: targetSiteId },
  });

  if (!site) {
    try {
      const siteMeta = getDefaultSiteMetadata(targetSiteId);
      site = await prisma.site.create({
        data: {
          id: targetSiteId,
          name: siteMeta.name,
          domain: siteMeta.domain,
          isActive: true,
        }
      });
    } catch (e) {
      console.error("Failed to automatically create site in database:", e);
    }
  }

  if (site) return site;

  // Catch-all fallback
  return prisma.site.findFirst({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
});

/**
 * Convenience wrapper that returns just the siteId string.
 */
export async function getSiteIdForUser(user) {
  const site = await getSiteForUser(user);
  return site?.id || null;
}
