import { getObjectStreamFromS3, headObjectFromS3, isS3Configured, normalizeS3Key } from "../../../../../utils/s3Utility";

// ── SSRF allowlist ──────────────────────────────────────────────────────────
const ALLOWED_HOSTNAME_PATTERNS = [
  /\.ionoscloud\.com$/i,
  /\.ionos\.com$/i,
  /^res\.cloudinary\.com$/i,
  /\.ahealthplace\.com$/i,
  /^images\.unsplash\.com$/i,
];

// Additional hostname derived from the configured S3 public base URL at startup
const s3PublicBase = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL || "";
if (s3PublicBase) {
  try {
    const h = new URL(s3PublicBase).hostname;
    if (h) ALLOWED_HOSTNAME_PATTERNS.push(new RegExp(`^${h.replace(/\./g, "\\.")}$`, "i"));
  } catch (_) { /* ignore invalid env */ }
}

// Private-network / localhost block patterns
const BLOCKED_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^::1$/,
  /^0\.0\.0\.0$/,
];

function isAllowedUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  // Only http/https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname;

  // Block private/internal network ranges in production for security
  if (BLOCKED_IP_PATTERNS.some((p) => p.test(host))) {
    if (process.env.NODE_ENV === "production") return false;
  }

  // Allow all valid public web origins (S3, IONOS, AWS, Cloudinary, Unsplash, external CDNs, etc.)
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPdfContentType(ct) {
  return ct && ct.includes("pdf");
}

function buildCommonHeaders(upstreamHeaders, isPdf, forceAcceptRanges = false) {
  const headers = new Headers();
  const ct = upstreamHeaders?.get("content-type") || "application/octet-stream";
  headers.set("Content-Type", ct);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Range, If-Range, If-None-Match, If-Modified-Since");
  headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, ETag, Last-Modified");

  const upstreamAcceptRanges = upstreamHeaders?.get("accept-ranges");
  const upstreamContentRange = upstreamHeaders?.get("content-range");
  if (forceAcceptRanges || upstreamAcceptRanges === "bytes" || upstreamContentRange) {
    headers.set("Accept-Ranges", "bytes");
  }

  if (isPdf) {
    headers.set("Cache-Control", "public, max-age=604800, immutable, no-transform");
    headers.set("Content-Disposition", "inline");
  } else {
    headers.set("Cache-Control", "public, max-age=604800, no-transform, stale-while-revalidate=86400");
  }

  // Forward upstream caching headers
  const etag = upstreamHeaders?.get("etag");
  const lastMod = upstreamHeaders?.get("last-modified");
  const cl = upstreamHeaders?.get("content-length");
  const cr = upstreamHeaders?.get("content-range");

  if (etag) headers.set("ETag", etag);
  if (lastMod) headers.set("Last-Modified", lastMod);
  if (cl) headers.set("Content-Length", cl);
  if (cr) headers.set("Content-Range", cr);

  return headers;
}

// ── S3 URL extraction ─────────────────────────────────────────────────────────

function extractS3Key(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const isS3Host = /(?:ionoscloud\.com|ionos\.com|amazonaws\.com|backblazeb2\.com|digitaloceanspaces\.com|storage\.googleapis\.com)/i.test(host);

    if (isS3Host || url.includes("site-")) {
      const key = normalizeS3Key(url);
      return key || null;
    }
  } catch (_) {
    if (url.includes("site-")) {
      return normalizeS3Key(url);
    }
  }

  return null;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: "Proxying this URL is not permitted" }, { status: 403 });
  }

  const rangeHeader = request.headers.get("range") || null;
  const ifRange = request.headers.get("if-range") || null;
  const ifNoneMatch = request.headers.get("if-none-match") || null;
  const ifModifiedSince = request.headers.get("if-modified-since") || null;

  // ── S3 path: use SDK for authenticated access ──
  const s3Key = extractS3Key(url);
  if (s3Key && isS3Configured()) {
    try {
      const result = await getObjectStreamFromS3(s3Key, rangeHeader || undefined);
      const isPdf = isPdfContentType(result.contentType);
      const headers = new Headers();
      headers.set("Content-Type", result.contentType || "application/octet-stream");
      headers.set("Accept-Ranges", "bytes");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, ETag, Last-Modified");
      headers.set("Cache-Control", isPdf ? "public, max-age=604800, immutable, no-transform" : "public, max-age=86400, stale-while-revalidate=3600");
      if (isPdf) headers.set("Content-Disposition", "inline");
      if (result.contentLength !== null) headers.set("Content-Length", String(result.contentLength));
      if (result.contentRange) headers.set("Content-Range", result.contentRange);
      if (result.etag) headers.set("ETag", result.etag);
      if (result.lastModified) headers.set("Last-Modified", new Date(result.lastModified).toUTCString());

      if (ifNoneMatch && result.etag && (ifNoneMatch === result.etag || ifNoneMatch === "*")) {
        return new Response(null, { status: 304, headers });
      }

      return new Response(result.body, { status: result.statusCode, headers });
    } catch (err) {
      if (err.name === "NoSuchKey" || err.Code === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        return NextResponse.json({ error: "Media not found" }, { status: 404 });
      }
      console.error("[proxy] S3 stream error:", err.message || err);
      // Fall through to plain fetch
    }
  }

  // ── External URL path: streaming fetch ──
  try {
    const fetchUrl = url.replace("localhost:", "127.0.0.1:");

    const upstreamHeaders = new Headers();
    if (rangeHeader) upstreamHeaders.set("range", rangeHeader);
    if (ifRange) upstreamHeaders.set("if-range", ifRange);
    if (ifNoneMatch) upstreamHeaders.set("if-none-match", ifNoneMatch);
    if (ifModifiedSince) upstreamHeaders.set("if-modified-since", ifModifiedSince);

    const response = await fetch(fetchUrl, { headers: upstreamHeaders });

    // Explicit HTTP 304 handling with zero body
    if (response.status === 304) {
      const ct = response.headers.get("content-type") || "application/octet-stream";
      const headers = buildCommonHeaders(response.headers, isPdfContentType(ct));
      return new Response(null, {
        status: 304,
        headers,
      });
    }

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Failed to fetch media: ${response.statusText}` },
        { status: response.status }
      );
    }

    const ct = response.headers.get("content-type") || "application/octet-stream";
    const isPdf = isPdfContentType(ct);
    const headers = buildCommonHeaders(response.headers, isPdf);

    // Stream the response body without buffering
    return new Response(response.body, {
      status: response.status, // preserves 206 from upstream
      headers,
    });
  } catch (err) {
    console.error("[proxy] fetch error:", err);
    return NextResponse.json({ error: "Failed to proxy media" }, { status: 500 });
  }
}

// ── HEAD ──────────────────────────────────────────────────────────────────────

export async function HEAD(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !isAllowedUrl(url)) {
    return new Response(null, { status: url ? 403 : 400 });
  }

  const s3Key = extractS3Key(url);
  if (s3Key && isS3Configured()) {
    try {
      const meta = await headObjectFromS3(s3Key);
      const headers = new Headers();
      headers.set("Content-Type", meta.contentType);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Access-Control-Allow-Origin", "*");
      if (meta.contentLength !== null) headers.set("Content-Length", String(meta.contentLength));
      if (meta.etag) headers.set("ETag", meta.etag);
      if (meta.lastModified) headers.set("Last-Modified", new Date(meta.lastModified).toUTCString());
      return new Response(null, { status: 200, headers });
    } catch (err) {
      if (err.$metadata?.httpStatusCode === 404) return new Response(null, { status: 404 });
    }
  }

  // HEAD via plain fetch for external URLs
  try {
    const response = await fetch(url.replace("localhost:", "127.0.0.1:"), { method: "HEAD" });
    const ct = response.headers.get("content-type") || "";
    const headers = buildCommonHeaders(response.headers, isPdfContentType(ct));
    return new Response(null, { status: response.status, headers });
  } catch {
    return new Response(null, { status: 500 });
  }
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, If-Range, If-None-Match, If-Modified-Since",
      "Access-Control-Max-Age": "86400",
    },
  });
}
