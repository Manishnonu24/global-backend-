import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req) {
  const auth = await checkSitePermission(req, "ADMIN"); // Only admins can trigger load tests
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Get all sites (up to 6)
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      take: 6,
    });

    const targetUrls = [];
    const localUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    sites.forEach((site) => {
      if (site.domain) {
        // Support protocol-less domains
        const url = site.domain.startsWith("http") ? site.domain : `http://${site.domain}`;
        targetUrls.push({ name: site.name, id: site.id, url });
      } else {
        // Fallback to local API queries scoped by siteId
        targetUrls.push({
          name: `${site.name} (API)`,
          id: site.id,
          url: `${localUrl}/api/content?siteId=${site.id}&slug=home`,
        });
      }
    });

    // Also include a few core system APIs
    targetUrls.push({ name: "Core API - Services", id: "system", url: `${localUrl}/api/services?siteId=${auth.siteId}` });
    targetUrls.push({ name: "Core API - Blog", id: "system", url: `${localUrl}/api/posts?siteId=${auth.siteId}` });

    const results = [];
    const concurrency = 15; // 15 simultaneous requests per target

    for (const target of targetUrls) {
      const start = Date.now();
      let successCount = 0;
      let failureCount = 0;
      const latencies = [];

      // Execute concurrency pings
      const promises = Array.from({ length: concurrency }).map(async () => {
        const reqStart = Date.now();
        try {
          // Add a cache buster parameter to avoid static cache
          const urlWithCacheBuster = `${target.url}${target.url.includes("?") ? "&" : "?"}_cb=${Math.random()}`;
          const res = await fetch(urlWithCacheBuster, {
            method: "GET",
            headers: {
              "x-site-id": target.id !== "system" ? target.id : auth.siteId,
              "User-Agent": "Global-CMS-Load-Tester/1.0",
            },
            signal: AbortSignal.timeout(3000), // 3s timeout
          });

          const latency = Date.now() - reqStart;
          latencies.push(latency);

          if (res.ok) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch {
          const latency = Date.now() - reqStart;
          latencies.push(latency);
          failureCount++;
        }
      });

      await Promise.all(promises);
      const totalDuration = Date.now() - start;

      const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
      const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
      const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

      results.push({
        targetName: target.name,
        url: target.url,
        requestsSent: concurrency,
        successCount,
        failureCount,
        avgLatencyMs: avgLatency,
        minLatencyMs: minLatency,
        maxLatencyMs: maxLatency,
        throughputRps: parseFloat((concurrency / (totalDuration / 1000)).toFixed(2)),
      });
    }

    return NextResponse.json(
      apiSuccess({
        timestamp: new Date().toISOString(),
        durationMs: results.reduce((sum, r) => sum + (r.avgLatencyMs * r.requestsSent), 0) / concurrency,
        concurrency,
        results,
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
