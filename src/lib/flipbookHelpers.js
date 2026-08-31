/**
 * Flipbook viewer reliability and URL candidate resolution helpers.
 */

/**
 * Extracts the S3 object key from an S3 URL (virtual-hosted or path-style).
 * @param {string} url - The full media URL
 * @returns {string|null} The object key or null if not an S3 URL
 */
export function extractS3KeyFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    const path = parsed.pathname.replace(/^\/+/, "");

    const isS3Host = /(?:s3[a-z0-9\-\.]*\.ionoscloud\.com|a-health-place\.s3[a-z0-9\-\.]*\.ionoscloud\.com|[a-z0-9\-\.]+\.s3[a-z0-9\-\.]*\.amazonaws\.com|s3[a-z0-9\-\.]*\.amazonaws\.com|[a-z0-9\-\.]+\.backblazeb2\.com|[a-z0-9\-\.]+\.digitaloceanspaces\.com|storage\.googleapis\.com)/i.test(host);

    if (!isS3Host) return null;

    // Virtual-hosted style: https://bucket.s3.../site-AHP/key
    if (/^site-[a-zA-Z0-9_\-\/]+/i.test(path)) {
      return path;
    }

    // Path style: https://s3.../bucket/site-AHP/key
    const parts = path.split("/");
    if (parts.length >= 2 && parts[1].startsWith("site-")) {
      return parts.slice(1).join("/");
    }

    const siteIdx = path.indexOf("site-");
    if (siteIdx !== -1) {
      return path.substring(siteIdx);
    }

    return path || null;
  } catch (e) {
    return null;
  }
}

/**
 * Builds a candidate attempt plan with fallbacks (direct, pdf-stream, proxy) for loading flipbooks.
 * @param {string} url - Initial publication PDF URL
 * @returns {Array<{type: string, url: string, delay: number, isFinal?: boolean}>}
 */
export function buildAttemptPlan(url) {
  if (!url || typeof url !== "string") return [];
  const s3Key = extractS3KeyFromUrl(url);

  if (s3Key) {
    return [
      { type: "direct", url, delay: 0 },
      { type: "pdf-stream", url: `/api/media/pdf?key=${encodeURIComponent(s3Key)}`, delay: 1000 },
      { type: "proxy", url: `/api/media/proxy?url=${encodeURIComponent(url)}`, delay: 2000 },
      { type: "direct", url, delay: 4000, isFinal: true },
    ];
  }

  return [
    { type: "direct", url, delay: 0 },
    { type: "proxy", url: `/api/media/proxy?url=${encodeURIComponent(url)}`, delay: 1000 },
    { type: "direct", url, delay: 3000, isFinal: true },
  ];
}

/**
 * Checks if an error is unrecoverable (e.g. 404 Not Found, 403 Access Denied).
 * @param {Error|string|Object} err
 * @returns {boolean}
 */
export function isPermanentError(err) {
  if (!err) return false;
  const msg = (typeof err === "string" ? err : err.message || "").toLowerCase();
  const status = err.status || err.statusCode || 0;
  if (status === 404 || status === 403 || status === 401) return true;
  return msg.includes("404") || msg.includes("not found") || msg.includes("access denied") || msg.includes("unauthorized");
}

/**
 * Formats an error into a user-friendly message.
 * @param {Error|string|Object} err
 * @returns {string}
 */
export function formatErrorMsg(err) {
  if (!err) return "An unknown error occurred while loading the publication.";
  if (typeof err === "string") return err;
  return err.message || "Failed to load publication document.";
}