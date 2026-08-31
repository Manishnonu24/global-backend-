/**
 * siteResolver.js
 * Universal server-side site ID resolution for AHP Reimagined.
 * Centralizes fallback logic to ensure consistent multi-tenant or single-tenant behavior.
 */

export const DEFAULT_SITE_ID = "AHP";

export function getDefaultSiteId() {
  return process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || DEFAULT_SITE_ID;
}

export function getDefaultSiteMetadata(siteId = getDefaultSiteId()) {
  const isAHP = siteId === "AHP" || siteId === "AHealthPlace";
  return {
    id: siteId,
    name: isAHP ? "A Health Place" : `${siteId.toUpperCase()} Website`,
    domain: isAHP ? "ahealthplace.com" : null,
  };
}

export function resolveSiteId(req = null) {
  if (!req) {
    return getDefaultSiteId();
  }

  try {
    if (typeof req.headers?.get === "function") {
      const headerSiteId = req.headers.get("x-site-id");
      if (
        headerSiteId &&
        headerSiteId !== "demo" &&
        headerSiteId !== "undefined" &&
        headerSiteId !== "null" &&
        headerSiteId.trim() !== ""
      ) {
        return headerSiteId.trim();
      }
    }
  } catch (err) {
    console.error("Error reading headers in resolveSiteId:", err);
  }

  return getDefaultSiteId();
}
