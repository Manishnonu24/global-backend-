/**
 * routeSync.js
 *
 * Route synchronization strategy:
 * - Build-time discovery is the single source of truth for WHICH routes exist (scanning src/app and writing to discovered-routes.json).
 * - Production runtime sync (instrumentation.js) reads directly from the compile-time imported discovered-routes.json snapshot
 *   and pushes it to the database on cold starts, completely bypassing filesystem reads which are unreliable on serverless.
 * - Development runtime sync attempts live filesystem scans and falls back to discovered-routes.json if the scan is empty.
 */
import path from "path";
import fs from "fs";
import prisma from "./prisma.js";
import { classifyRoute } from "./routeClassification.js";
import { createRequire } from "module";
import { getDefaultSiteId, getDefaultSiteMetadata } from "./siteResolver.js";
const require = createRequire(import.meta.url);
const prebuiltRoutes = require("./discovered-routes.json");

const EXCLUDED_PREFIXES = [
  "/dashboard",
  "/crm",
  "/api",
  "/preview",
  "/maintenance",
  "/all-played-quiz",
  "/yourmove",
  "/login",
  "/forgot-password",
  "/reset-password",
];

// Never sync Next.js catch-all route segments ([...slug], [[...slug]]) as real pages
export const CATCH_ALL_PATTERN = /\[\.\.\..*?\]/;

function slugToTitle(slug) {
  if (slug === "/") return "Home";

  const last = slug.split("/").filter(Boolean).pop() || "";

  if (last.startsWith("[") && last.endsWith("]")) {
    const parent = slug.split("/").filter(Boolean).slice(-2, -1)[0] || "";
    const name = parent.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${name} Detail`.trim();
  }

  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function discoverPageDirs(dir, found = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  const hasPage = entries.some(
    (e) => e.isFile() && (e.name === "page.js" || e.name === "page.jsx")
  );

  if (hasPage) {
    found.push(dir);
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      discoverPageDirs(path.join(dir, entry.name), found);
    }
  }

  return found;
}

function dirToSlug(dir, appDir) {
  const relative = path.relative(appDir, dir).replace(/\\/g, "/");
  return relative === "" ? "/" : `/${relative}`;
}

export async function syncRoutes(siteIdParam) {
  const siteId = siteIdParam || getDefaultSiteId();
  let routes = [];
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    routes = prebuiltRoutes || [];
    console.log(`[${siteId} Startup] Production mode: Loaded ${routes.length} pre-built routes from discovered-routes.json`);
  } else {
    const appDir = path.join(process.cwd(), "src", "app");
    const pageDirs = discoverPageDirs(appDir);

    if (pageDirs.length > 0) {
      routes = pageDirs
        .map((dir) => dirToSlug(dir, appDir))
        .filter((slug) =>
          !EXCLUDED_PREFIXES.some((prefix) => slug.startsWith(prefix)) &&
          !CATCH_ALL_PATTERN.test(slug)
        )
        .map((slug) => ({
          slug,
          title: slugToTitle(slug),
          isDynamic: slug.includes("["),
        }));
    } else {
      routes = prebuiltRoutes || [];
      if (routes.length > 0) {
        console.warn(`[${siteId} Startup] Live route discovery found 0 pages — falling back to discovered-routes.json`);
      }
    }
  }

  const siteMeta = getDefaultSiteMetadata(siteId);
  await prisma.site.upsert({
    where: { id: siteId },
    update: {},
    create: {
      id: siteId,
      name: siteMeta.name,
      domain: siteMeta.domain,
      isActive: true,
    },
  });

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const route of routes) {
    try {
      const { pageType, templateKey, isHardcoded } = classifyRoute({ pathname: route.slug, isDynamic: route.isDynamic });
      await prisma.page.upsert({
        where: { siteId_slug: { siteId, slug: route.slug } },
        update: {
          title: route.title,
          isManagedBySync: true,
          isDiscovered: true,
          pageType,
          templateKey,
          isHardcoded,
        },
        create: {
          siteId,
          slug: route.slug,
          title: route.title,
          status: "PUBLISHED",
          isManagedBySync: true,
          isDiscovered: true,
          isHardcoded: isHardcoded,
          pageType,
          templateKey,
          publishedAt: new Date(),
        },
      });
      synced++;
    } catch (upsertErr) {
      const errMsg = upsertErr.message || "";
      if (errMsg.includes("Lock wait timeout") || errMsg.includes("deadlock") || errMsg.includes("1205")) {
        console.warn(`[${siteId} Startup] ⚠️ Lock wait timeout/deadlock on upserting route ${route.slug}. Skipping this route.`);
        skipped++;
      } else {
        failed++;
        console.error(`[${siteId} Startup] Failed to upsert route ${route.slug}:`, upsertErr.message);
      }
    }
  }

  const activeSlugs = routes.map((r) => r.slug);
  let softDeleteCount = 0;
  try {
    const obsoleteResult = await prisma.page.updateMany({
      where: {
        siteId,
        isDiscovered: true,
        isManagedBySync: true,
        slug: { notIn: activeSlugs },
        deletedAt: null,
      },
      data: { deletedAt: new Date(), status: "DRAFT", isEnabled: false },
    });
    softDeleteCount = obsoleteResult.count;
  } catch (delErr) {
    const delMsg = delErr.message || "";
    if (delMsg.includes("Lock wait timeout") || delMsg.includes("deadlock") || delMsg.includes("1205")) {
      console.warn(`[${siteId} Startup] ⚠️ Lock wait timeout/deadlock on soft-deleting obsolete pages.`);
    } else {
      console.error(`[${siteId} Startup] ⚠️ Failed to soft-delete obsolete pages:`, delErr.message);
    }
  }

  console.log(
    `[${siteId} Startup] ✅ Auto-discovered and synced ${synced} routes to global backend.`
  );
  if (softDeleteCount > 0) {
    console.log(
      `[${siteId} Startup] 🗑️ Soft-deleted ${softDeleteCount} obsolete sync-managed pages.`
    );
  }

  return {
    siteId,
    syncedCount: synced,
    skippedCount: skipped,
    failedCount: failed,
    softDeletedCount: softDeleteCount,
  };
}
