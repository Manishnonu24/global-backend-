/**
 * Media URL Resolver Utility
 * Resolves direct private S3 / Backblaze bucket URLs to internal media view proxy URLs,
 * preventing 401 Unauthorized errors across the frontend and email newsletters.
 */

import { getMediaUrl } from "@/lib/mediaUrl";

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_CMS_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";

/**
 * Resolves a media / image URL to ensure it uses the internal public proxy
 * rather than direct private S3 URLs.
 * 
 * @param {string} rawUrl - The input image or asset URL
 * @param {string} [baseUrl] - Optional base domain URL (useful for email templates/newsletters)
 * @returns {string} The normalized, publicly accessible media URL
 */
export function resolveMediaUrl(rawUrl, baseUrl = "") {
  if (!rawUrl) return rawUrl;

  let resolved = typeof rawUrl === "string" ? rawUrl : (rawUrl.secureUrl || rawUrl.url || rawUrl.publicId || rawUrl.key || "");
  if (!resolved) return "";

  // Strip absolute origins from internal proxy URLs stored with server IP/hostname.
  // e.g. "http://209.46.127.71/api/media/view?key=site-AHP/..." → "/api/media/view?key=..."
  // This prevents Mixed Content errors when the page is served over HTTPS.
  if (resolved.includes("/api/media/view")) {
    const internalMatch = resolved.match(/\/api\/media\/view(\?[^"'\s]*)?/);
    if (internalMatch) {
      resolved = internalMatch[0]; // strip origin, keep relative path + query string
    }
  }

  // Convert private S3/IONOS/Backblaze bucket URLs to /api/media/view?key=...
  if (resolved.includes("backblazeb2.com") || resolved.includes(".s3.") || resolved.includes("amazonaws.com") || resolved.includes("ionoscloud.com")) {
    try {
      const parsed = new URL(resolved);
      const parts = parsed.pathname.split("/").filter(Boolean);
      // Remove bucket name (first path segment) if present
      const key = parts.length > 1 ? parts.slice(1).join("/") : parts.join("/");
      if (key) {
        resolved = `/api/media/view?key=${key}`;
      }
    } catch (e) {
      // Return rawUrl on parse failure
    }
  } else {
    resolved = getMediaUrl(resolved);
  }

  // For emails / newsletters: if a baseUrl is provided and resolved URL is relative, make it absolute
  if (baseUrl && resolved.startsWith("/")) {
    const cleanBase = baseUrl.replace(/\/$/, "");
    return `${cleanBase}${resolved}`;
  }

  // Ensure any absolute non-local HTTP URL is upgraded to HTTPS to avoid Mixed Content errors
  if (resolved.startsWith("http://") && !resolved.includes("localhost") && !resolved.includes("127.0.0.1")) {
    resolved = resolved.replace(/^http:\/\//i, "https://");
  }

  return resolved;
}

/**
 * Normalizes all <img> src attributes and image URLs inside HTML content string
 * (e.g. for newsletters, blog post bodies, email templates).
 * 
 * @param {string} htmlContent - The raw HTML body
 * @param {string} [baseUrl] - Base domain for absolute URL conversion
 * @returns {string} Transformed HTML with clean proxy media URLs
 */
export function resolveHtmlMediaUrls(htmlContent, baseUrl = DEFAULT_BASE_URL) {
  if (!htmlContent || typeof htmlContent !== "string") return htmlContent;

  return htmlContent.replace(
    /(src|href|background)=["']([^"']+)["']/gi,
    (match, attr, url) => {
      if (
        url.includes("backblazeb2.com") ||
        url.includes(".s3.") ||
        url.includes("amazonaws.com") ||
        url.startsWith("/api/media/view")
      ) {
        const resolved = resolveMediaUrl(url, baseUrl);
        return `${attr}="${resolved}"`;
      }
      return match;
    }
  );
}
