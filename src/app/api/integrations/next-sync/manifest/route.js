import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
// global_backend/src/app/api/integrations/next-sync/manifest/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { classifyRoute } from "@/lib/routeClassification";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


/*
  POST /api/integrations/next-sync/manifest
  Headers:
    x-integration-key: <FrontendProject.apiKey or Site.integrationKey>

  Body:
    {
      siteId: string,
      source?: string,
      generatedAt?: string,
      routes: [
        { slug: string, path: string, type?: 'static'|'dynamic', title?: string }
      ]
    }
*/

const ManifestSchema = z.object({
  siteId: z.string().min(1),
  source: z.string().optional(),
  generatedAt: z.string().optional(),
  routes: z.array(
    z.object({
      slug: z.string().min(1),
      path: z.string().min(1),
      type: z.enum(["static", "dynamic"]).optional().default("static"),
      title: z.string().optional(),
    }),
  ),
});

async function resolveAuth(apiKey, siteId) {
  if (apiKey) {
    const frontendProject = await prisma.frontendProject.findUnique({
      where: { apiKey },
    });

    if (frontendProject) {
      if (!frontendProject.isActive) {
        return { error: "Frontend project is inactive", status: 401 };
      }
      if (frontendProject.siteId !== siteId) {
        return {
          error: "Frontend project does not belong to this site",
          status: 401,
        };
      }
      return { frontendProject };
    }
  }

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return { error: "Site not found", status: 404 };
  }

  if (site.integrationKey) {
    if (!apiKey || apiKey !== site.integrationKey) {
      return { error: "Invalid integration key", status: 401 };
    }
    return { site };
  }

  if (process.env.NODE_ENV === "production") {
    return { error: "Site integration not configured", status: 401 };
  }

  return { site };
}

export async function POST(req) {
  try {
    const apiKey = req.headers.get("x-integration-key");
    const body = await req.json();
    const parsed = ManifestSchema.parse(body);

    const auth = await resolveAuth(apiKey, parsed.siteId);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const crypto = await import("crypto");
    const manifestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(parsed.routes))
      .digest("hex");

    // Determine frontendProjectId — must exist for SyncedRoute
    let frontendProjectId = auth.frontendProject?.id || null;

    // If auth is via site integrationKey, get or create a default FrontendProject
    if (!frontendProjectId && auth.site) {
      const defaultProject = await prisma.frontendProject.findFirst({
        where: { siteId: parsed.siteId, isActive: true },
        orderBy: { createdAt: "asc" },
      });
      if (defaultProject) {
        frontendProjectId = defaultProject.id;
      } else {
        // Create an auto-detected project entry
        const newProject = await prisma.frontendProject.create({
          data: {
            siteId: parsed.siteId,
            name: "Auto-detected (legacy)",
            framework: "next",
            apiKey: `auto_${crypto.randomBytes(16).toString("hex")}`,
            baseUrl: null,
            syncStatus: "connected",
          },
        });
        frontendProjectId = newProject.id;
      }
    }

    if (!frontendProjectId) {
      return NextResponse.json(
        { error: "No frontend project found. Create one first." },
        { status: 400 },
      );
    }

    await prisma.integrationManifest.create({
      data: {
        siteId: parsed.siteId,
        source: parsed.source ?? "unknown",
        manifestHash,
        rawJson: parsed,
      },
    });

    const created = [];
    const updated = [];
    const syncedRoutes = [];

    // Filter out system, administrative, and auth routes
    const systemRoutePatterns = [
      /^\/dashboard(\/|$)/i,
      /^\/crm(\/|$)/i,
      /^\/api(\/|$)/i,
      /^\/preview(\/|$)/i,
      /^\/maintenance(\/|$)/i,
      /^\/all-played-quiz(\/|$)/i,
      /^\/yourmove(\/|$)/i,
      /^\/login(\/|$)/i,
      /^\/forgot-password(\/|$)/i,
      /^\/reset-password(\/|$)/i,
    ];

    const filteredRoutes = parsed.routes.filter((r) => {
      const slug = r.slug.startsWith("/") ? r.slug : `/${r.slug}`;
      return !systemRoutePatterns.some((pattern) => pattern.test(slug));
    });

    for (const r of filteredRoutes) {
      const slug = r.slug.startsWith("/") ? r.slug : `/${r.slug}`;
      // Also check without leading slash, e.g. "about" for pages stored as "about"
      const slugBare = slug.replace(/^\//, "");

      // Look up by either slug variant to avoid duplicates
      const existing = await prisma.page.findFirst({
        where: {
          siteId: parsed.siteId,
          slug: { in: [slug, slugBare] },
          deletedAt: null,
        },
      });

      let pageId = existing?.id ?? null;
      const classification = classifyRoute({ pathname: slug, isDynamic: r.type === "dynamic" });

      if (!existing) {
        const newPage = await prisma.page.create({
          data: {
            siteId: parsed.siteId,
            title: r.title ?? slug,
            slug,
            status: "PUBLISHED",
            isDiscovered: true,
            isManagedBySync: true,
            isHardcoded: classification.isHardcoded,
            pageType: classification.pageType,
            templateKey: classification.templateKey,
            sourceRoute: slug,
          },
        });
        pageId = newPage.id;
        created.push({ slug, pageId: newPage.id });
      } else {
        // Always stamp as hardcoded + normalize slug to leading-slash form
        await prisma.page.update({
          where: { id: existing.id },
          data: {
            title: existing.title && existing.title !== slugBare && existing.title !== slug ? existing.title : (r.title ?? existing.title),
            slug,                  // normalize to /about form
            isDiscovered: true,
            isHardcoded: classification.isHardcoded,
            pageType: classification.pageType,
            templateKey: classification.templateKey,
            isManagedBySync: true,
            status: "PUBLISHED",
            deletedAt: null,
            sourceRoute: existing.sourceRoute || slug,
          },
        });
        updated.push({ slug, pageId: existing.id });
      }

      // Upsert syncedRoute with frontendProjectId instead of siteId
      const syncedRoute = await prisma.syncedRoute.upsert({
        where: {
          frontendProjectId_route: {
            frontendProjectId,
            route: slug,
          },
        },
        create: {
          frontendProjectId,
          route: slug,
          source: r.path ?? parsed.source ?? null,
          pageId,
        },
        update: {
          source: r.path ?? parsed.source ?? null,
          pageId,
          discoveredAt: new Date(),
        },
      });

      syncedRoutes.push({
        route: syncedRoute.route,
        pageId: syncedRoute.pageId,
        source: syncedRoute.source,
      });
    }

    // ── Cleanup: delete synced pages that no longer exist in the frontend ──
    const incomingSlugs = new Set(
      filteredRoutes.map((r) =>
        r.slug.startsWith("/") ? r.slug : `/${r.slug}`,
      ),
    );
    const existingSyncedRoutes = await prisma.syncedRoute.findMany({
      where: { frontendProjectId },
      select: { route: true, pageId: true },
    });

    const deleted = [];
    for (const sr of existingSyncedRoutes) {
      if (!incomingSlugs.has(sr.route) && sr.pageId) {
        await prisma.page.updateMany({
          where: { id: sr.pageId },
          data: { deletedAt: new Date(), status: "DRAFT", isEnabled: false },
        });
        await prisma.syncedRoute.deleteMany({
          where: { frontendProjectId, route: sr.route },
        });
        deleted.push({ route: sr.route, pageId: sr.pageId });
      }
    }

    if (auth.frontendProject) {
      await prisma.frontendProject.update({
        where: { id: auth.frontendProject.id },
        data: {
          lastSyncAt: new Date(),
          lastManifestHash: manifestHash,
          syncStatus: "connected",
        },
      });
    } else if (frontendProjectId) {
      await prisma.frontendProject.update({
        where: { id: frontendProjectId },
        data: {
          lastSyncAt: new Date(),
          lastManifestHash: manifestHash,
          syncStatus: "connected",
        },
      });
    }

    return NextResponse.json(
      apiSuccess({
        created,
        updated,
        deleted,
        syncedRoutes,
        manifestHash,
        frontendProjectId,
      }),
    );
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Manifest POST error:");
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: String(err?.message || err) },
      { status: 500 },
    );
  }
}
