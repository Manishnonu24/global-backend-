const fs = require("fs");
const path = require("path");

const SITE_ID = process.env.SITE_ID || "AHP";

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
  "/services/private",
];

// Patterns that should never be synced as real pages:
// - Next.js catch-all routes: [...slug], [[...slug]]
// - Optional catch-all roots
const CATCH_ALL_PATTERN = /\[\.\.\..*?\]/;

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

async function run() {
  console.log("🔍 Running route discovery script...");
  const appDir = path.join(process.cwd(), "src", "app");
  const pageDirs = discoverPageDirs(appDir);

  const routes = pageDirs
    .map((dir) => dirToSlug(dir, appDir))
    .filter(
      (slug) =>
        !EXCLUDED_PREFIXES.some((prefix) => slug.startsWith(prefix)) &&
        !CATCH_ALL_PATTERN.test(slug)
    )
    .map((slug) => ({
      slug,
      title: slugToTitle(slug),
      isDynamic: slug.includes("["),
    }));

  const outputPath = path.join(process.cwd(), "src", "lib", "discovered-routes.json");
  
  // Create src/lib directory if it doesn't exist
  const libDir = path.dirname(outputPath);
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  if (routes.length === 0) {
    console.error("❌ ERROR: Route discovery failed! Found 0 routes. Failing build loudly.");
    process.exit(1);
  }

  fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2));
  console.log(`✅ Successfully discovered and wrote ${routes.length} routes to ${outputPath}`);

  // Build-time Route Sync has been disabled for performance reasons.
  // DB synchronization will now rely entirely on the runtime synchronization
  // managed by `instrumentation.js` during server startup, to avoid
  // sequential DB lock timeouts during parallel Vercel builds.
}

run();
