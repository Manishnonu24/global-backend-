/**
 * Authoritative Media URL Resolver (Client & Server Safe).
 * Normalizes bare keys (e.g. "site-AHP/123.webp"), proxy paths ("/api/media/view..."),
 * or absolute URLs (Cloudinary/S3) into complete, valid S3 URLs.
 *
 * Automatically removes any predefined website domain (e.g. "https://ahealthplace.com/",
 * "http://localhost:3000/", "http://209.46.127.71/") that was accidentally prepended
 * before an S3 link anywhere on the site.
 */

/**
 * Strips any predefined website domain, proxy origin, or accidental path prefix
 * from an S3 URL, returning the clean, direct S3 URL.
 *
 * @param {string} rawUrl - The input media URL
 * @returns {string} The cleaned URL
 */
export function cleanS3Url(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim();

  // 1. Un-nest double protocols: e.g. "https://ahealthplace.com/https://..." or "http://209.46.127.71/http://..."
  const nestedHttpsIdx = url.indexOf("https://", 8);
  const nestedHttpIdx = url.indexOf("http://", 7);
  if (nestedHttpsIdx !== -1) {
    url = url.substring(nestedHttpsIdx);
  } else if (nestedHttpIdx !== -1) {
    url = url.substring(nestedHttpIdx);
  }

  // 2. Remove predefined domain / leading path before known S3 hostnames
  // Matches e.g. "https://ahealthplace.com/s3-eu-central-2.ionoscloud.com/..."
  // or "http://209.46.127.71/a-health-place.s3-eu-central-2.ionoscloud.com/..."
  // or "/s3-eu-central-2.ionoscloud.com/..."
  const s3DomainRegex = /(?:https?:\/\/[^\/]+\/|\/+)(s3[a-z0-9\-\.]*\.ionoscloud\.com\/.*|a-health-place\.s3[a-z0-9\-\.]*\.ionoscloud\.com\/.*|[a-z0-9\-\.]+\.s3[a-z0-9\-\.]*\.amazonaws\.com\/.*|s3[a-z0-9\-\.]*\.amazonaws\.com\/.*|[a-z0-9\-\.]+\.backblazeb2\.com\/.*|[a-z0-9\-\.]+\.digitaloceanspaces\.com\/.*|storage\.googleapis\.com\/.*)/i;
  const s3Match = url.match(s3DomainRegex);
  if (s3Match && s3Match[1]) {
    url = `https://${s3Match[1]}`;
  }

  // 3. If string starts with an S3 domain without protocol (e.g. "s3-eu-central-2.ionoscloud.com/...")
  if (/^(?:s3[a-z0-9\-\.]*\.ionoscloud\.com|a-health-place\.s3[a-z0-9\-\.]*\.ionoscloud\.com|[a-z0-9\-\.]+\.s3[a-z0-9\-\.]*\.amazonaws\.com|s3[a-z0-9\-\.]*\.amazonaws\.com|[a-z0-9\-\.]+\.backblazeb2\.com|[a-z0-9\-\.]+\.digitaloceanspaces\.com|storage\.googleapis\.com)/i.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }

  // 4. Protocol-relative URLs: "//s3-eu-central-2.ionoscloud.com/..." -> "https://s3-eu-central-2.ionoscloud.com/..."
  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  // 4b. If url is ALREADY a clean, direct S3 URL with protocol, return it directly
  const isDirectS3Url = /^https?:\/\/(?:s3[a-z0-9\-\.]*\.ionoscloud\.com|a-health-place\.s3[a-z0-9\-\.]*\.ionoscloud\.com|[a-z0-9\-\.]+\.s3[a-z0-9\-\.]*\.amazonaws\.com|s3[a-z0-9\-\.]*\.amazonaws\.com|[a-z0-9\-\.]+\.backblazeb2\.com|[a-z0-9\-\.]+\.digitaloceanspaces\.com|storage\.googleapis\.com)/i.test(url);
  if (isDirectS3Url) {
    return url;
  }

  // 5. If domain was prepended to a bare S3 key (e.g. "https://ahealthplace.com/site-AHP/1786966897149-wy80izh.webp" or "/site-AHP/...")
  const siteKeyRegex = /(?:https?:\/\/[^\/]+\/|\/+)(site-[a-zA-Z0-9_\-\/]+\.(?:webp|png|jpg|jpeg|gif|svg|pdf|mp4|webm|avif))/i;
  const siteKeyMatch = url.match(siteKeyRegex);
  if (siteKeyMatch && siteKeyMatch[1]) {
    return buildS3Url(siteKeyMatch[1]);
  }

  return url;
}

export function buildS3Url(key) {
  if (!key) return "";
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return cleanS3Url(key);
  }

  const cleanKey = key.replace(/^\/+/, "");

  const publicBaseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_S3_BASE_URL || process.env.S3_PUBLIC_BASE_URL;
  if (publicBaseUrl) {
    const protocol = /^https?:\/\//i.test(publicBaseUrl) ? "" : "https://";
    const cleanBase = publicBaseUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `${protocol}${cleanBase}/${cleanKey}`;
  }

  const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.S3_ENDPOINT || process.env.ENDPOINT || process.env.AWS_ENDPOINT;
  const bucket = process.env.NEXT_PUBLIC_S3_BUCKET || process.env.S3_BUCKET || process.env.BUCKET || process.env.AWS_BUCKET_NAME;
  const region = process.env.NEXT_PUBLIC_S3_REGION || process.env.S3_REGION || process.env.REGION || process.env.AWS_REGION || "us-east-1";

  if (bucket) {
    if (endpoint) {
      const protocol = /^https?:\/\//i.test(endpoint) ? "" : "https://";
      const cleanedEndpoint = endpoint.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      return `${protocol}${cleanedEndpoint}/${bucket}/${cleanKey}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
  }

  return `/api/media/view?key=${cleanKey}`;
}

export function getMediaUrl(media) {
  if (!media) return "";
  
  let url = typeof media === "string" ? media : (media.secureUrl || media.url || media.publicId || media.key || "");
  if (!url) return "";

  // Strip any predefined website domain or erroneous prefix from S3 URLs first
  // Extract site key (e.g. site-AHP/123.webp) and route through internal media proxy for CORS protection
  const siteKeyMatch = url.match(/(site-[a-zA-Z0-9_\-\/]+\.(?:webp|png|jpg|jpeg|gif|svg|pdf|mp4|webm|avif))/i);
  if (siteKeyMatch && siteKeyMatch[1]) {
    return `/api/media/view?key=${siteKeyMatch[1]}`;
  }

  // If already resolved to a full direct S3 or external URL (e.g. ionoscloud, backblaze)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    if (url.includes("ionoscloud.com") || url.includes("backblazeb2.com") || url.includes("amazonaws.com")) {
      return `/api/media/proxy?url=${encodeURIComponent(url)}`;
    }
    if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      return url.replace(/^http:\/\//i, "https://");
    }
    return url;
  }

  const endpoint = (process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.S3_ENDPOINT || process.env.ENDPOINT || "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const bucket = process.env.NEXT_PUBLIC_S3_BUCKET || process.env.S3_BUCKET || process.env.BUCKET || "";

  // Normalize path-style S3 URLs (e.g. s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/...)
  if (endpoint && bucket && url.includes(`${endpoint}/${bucket}/`)) {
    const keyPath = url.split(`${endpoint}/${bucket}/`)[1];
    if (keyPath) {
      return buildS3Url(keyPath);
    }
  }

  // Extract key parameter from proxy URL (/api/media/view?key=site-AHP/123.webp)
  if (url.includes("/api/media/view") || url.includes("key=")) {
    const keyMatch = url.match(/key=([^&"'\s]+)/);
    if (keyMatch && keyMatch[1]) {
      const direct = buildS3Url(keyMatch[1]);
      if (direct.startsWith("http")) return direct;
      return `/api/media/view?key=${keyMatch[1]}`;
    }
  }

  // Bare key like "site-AHP/1785834000-xyz.webp" -> convert to direct S3 URL
  if (url.startsWith("site-") || url.startsWith("/site-")) {
    const cleanKey = url.replace(/^\/+/, "");
    const direct = buildS3Url(cleanKey);
    if (direct.startsWith("http")) return direct;
    return `/api/media/view?key=${cleanKey}`;
  }

  // Relative path missing leading slash ("api/media/view...", "uploads/...")
  if (!url.startsWith("/")) {
    return `/${url}`;
  }

  return url;
}

