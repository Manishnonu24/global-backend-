// global_backend/src/lib/siteAuth.js
import prisma from "@/lib/prisma";
import { ROLES, hasRole } from "./rbac";

/**
 * Return the site role string for a user (ADMIN / EDITOR / etc) or null.
 */
export async function getSiteRole(userId, siteId) {
  try {
    const su = await prisma.siteUser.findUnique({
      where: { siteId_userId: { siteId, userId } },
    });
    return su?.role ?? null;
  } catch (err) {
    console.error("getSiteRole error:", err);
    return null;
  }
}

/**
 * Check whether a user (session user object) has the requiredRole for siteId.
 * - SUPERADMIN globalRole always returns true.
 * - Otherwise check the siteUser mapping and use hasRole(siteRole, requiredRole).
 */
export async function userHasSiteRole(user, siteId, requiredRole) {
  if (!user) return false;
  if (user.globalRole === ROLES.SUPERADMIN) return true;
  const siteRole = await getSiteRole(user.id, siteId);
  if (!siteRole) return false;
  return hasRole(siteRole, requiredRole);
}
