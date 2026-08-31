import { getObjectStreamFromS3, headObjectFromS3, isS3Configured, normalizeS3Key } from "../../../../../utils/s3Utility";
import { buildS3Url } from "@/lib/mediaUrl";
import { NextResponse } from "next/server";

/**
 * GET  /api/media/view?key=<s3-key>
 * HEAD /api/media/view?key=<s3-key>
 *
 * Streams S3 objects (images, PDFs) directly to the browser with Range request support.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return new NextResponse("Missing key parameter", { status: 400 });
  }

  const cleanKey = normalizeS3Key(key);
  const directUrl = buildS3Url(cleanKey);

  try {
    if (!isS3Configured()) {
      if (directUrl && directUrl.startsWith("http")) {
        return NextResponse.redirect(directUrl, 307);
      }
      return NextResponse.json(
        { success: false, error: "S3 media storage is not configured.", code: "INTEGRATION_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const rangeHeader = request.headers.get("range") || null;
    const ifNoneMatch = request.headers.get("if-none-match") || null;
    const ifModifiedSince = request.headers.get("if-modified-since") || null;

    const result = await getObjectStreamFromS3(cleanKey, rangeHeader || undefined);

    const siteIdMatch = cleanKey.match(/^site-([^/]+)\//);
    const siteId = siteIdMatch ? siteIdMatch[1] : (process.env.NEXT_PUBLIC_SITE_ID || "AHP");

    let maxAgeSeconds = 7 * 24 * 60 * 60;
    try {
      const getPerformanceConfig = (await import("next/cache")).unstable_cache(
        async (sId) => {
          const prisma = (await import("@/lib/prisma")).default;
          const settings = await prisma.globalSettings.findUnique({
            where: { siteId: sId },
            select: { performanceConfig: true },
          });
          return settings?.performanceConfig || {};
        },
        [`media-performance-config-${siteId}`],
        { revalidate: 3600 }
      );
      const perfConfig = await getPerformanceConfig(siteId);
      const cachingDays = perfConfig?.browserCachingDays ?? 7;
      maxAgeSeconds = cachingDays * 24 * 60 * 60;
    } catch (_) {
      // Safe fallback if next/cache or Prisma is unavailable
    }

    const isPdf = result.contentType?.includes("pdf");

    const headers = new Headers();
    headers.set("Content-Type", result.contentType || "application/octet-stream");
    headers.set("Accept-Ranges", "bytes");
    headers.set(
      "Cache-Control",
      isPdf
        ? "public, max-age=31536000, immutable"
        : `public, max-age=${maxAgeSeconds}, immutable`
    );
    if (isPdf) headers.set("Content-Disposition", "inline");
    if (result.contentLength !== null) headers.set("Content-Length", String(result.contentLength));
    if (result.contentRange) headers.set("Content-Range", result.contentRange);
    if (result.etag) headers.set("ETag", result.etag);
    if (result.lastModified) headers.set("Last-Modified", new Date(result.lastModified).toUTCString());

    // Conditional GET: If-None-Match
    if (ifNoneMatch && result.etag && (ifNoneMatch === result.etag || ifNoneMatch === "*")) {
      return new Response(null, { status: 304, headers });
    }

    // Conditional GET: If-Modified-Since
    if (ifModifiedSince && result.lastModified) {
      const ims = new Date(ifModifiedSince).getTime();
      const lm = new Date(result.lastModified).getTime();
      if (!isNaN(ims) && !isNaN(lm) && ims >= lm) {
        return new Response(null, { status: 304, headers });
      }
    }

    return new NextResponse(result.body, {
      status: result.statusCode,
      headers,
    });
  } catch (err) {
    if (directUrl && directUrl.startsWith("http")) {
      return NextResponse.redirect(directUrl, 307);
    }

    const statusCode = err.$metadata?.httpStatusCode || err.status || err.statusCode;
    if (
      err.name === "NoSuchKey" ||
      err.Code === "NoSuchKey" ||
      err.name === "AccessDenied" ||
      err.Code === "AccessDenied" ||
      statusCode === 404 ||
      statusCode === 403
    ) {
      return new NextResponse("File not found", { status: 404 });
    }

    if (err.name === "InvalidRange" || err.Code === "InvalidRange" || err.$metadata?.httpStatusCode === 416) {
      return new Response(null, {
        status: 416,
        headers: { "Accept-Ranges": "bytes", "Content-Range": "bytes */*" },
      });
    }

    if (err.name === "TimeoutError" || err.$metadata?.httpStatusCode === 504) {
      return new NextResponse("Gateway Timeout", { status: 504 });
    }

    if (err.name === "ServiceUnavailable" || err.$metadata?.httpStatusCode === 503) {
      return new NextResponse("Storage Service Unavailable", { status: 503 });
    }

    return new NextResponse("File not found", { status: 404 });
  }
}

export async function HEAD(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) return new Response(null, { status: 400 });

    if (!isS3Configured()) return new Response(null, { status: 503 });

    const meta = await headObjectFromS3(key);

    const headers = new Headers();
    headers.set("Content-Type", meta.contentType || "application/octet-stream");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", meta.contentType?.includes("pdf")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=604800, immutable");
    if (meta.contentLength !== null) headers.set("Content-Length", String(meta.contentLength));
    if (meta.etag) headers.set("ETag", meta.etag);
    if (meta.lastModified) headers.set("Last-Modified", new Date(meta.lastModified).toUTCString());

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && meta.etag && (ifNoneMatch === meta.etag || ifNoneMatch === "*")) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(null, { status: 200, headers });
  } catch (err) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: err.$metadata?.httpStatusCode || 500 });
  }
}
