/**
 * scripts/backfill-page-types.js
 * 
 * Safely backfills existing Page records with appropriate pageType (SYSTEM, CODE_TEMPLATE, or CMS_BUILT)
 * and generates initial publishedSnapshot for existing PUBLISHED pages so they don't break when public
 * routes switch to snapshot-based rendering.
 */
const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

const SYSTEM_PREFIXES = [
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

const TEMPLATE_SLUGS = [
  "/",
  "/about",
  "/contact",
  "/blogs",
  "/services",
  "/recipes/submit",
  "/publication",
  "/info",
  "/quizzes",
  "/legal",
  "/team",
  "/testimonials",
  "/faq",
];

async function run() {
  console.log("🔍 Starting page classification and snapshot backfill...");

  const pages = await prisma.page.findMany({
    include: {
      sections: {
        where: { isDeleted: false },
        orderBy: { order: "asc" },
      },
    },
  });

  console.log(`Found ${pages.length} pages in database.`);
  let updatedCount = 0;
  let snapshotCount = 0;

  for (const page of pages) {
    let pageType = "CMS_BUILT";

    // Classify as SYSTEM
    if (
      page.slug.includes("[") ||
      page.slug.includes("]") ||
      SYSTEM_PREFIXES.some((prefix) => page.slug.startsWith(prefix))
    ) {
      pageType = "SYSTEM";
    }
    // Classify as CODE_TEMPLATE
    else if (
      page.isHardcoded ||
      TEMPLATE_SLUGS.some((slug) => page.slug === slug || page.slug.startsWith(slug + "/"))
    ) {
      pageType = "CODE_TEMPLATE";
    }

    let publishedSnapshot = page.publishedSnapshot;

    // Build initial publishedSnapshot if PUBLISHED and missing snapshot
    if (page.status === "PUBLISHED" && !publishedSnapshot) {
      // Fetch PageContent if available
      const pageContentRow = await prisma.pageContent.findUnique({
        where: {
          siteId_pageSlug: {
            siteId: page.siteId,
            pageSlug: page.slug,
          },
        },
      });

      publishedSnapshot = {
        title: page.title,
        slug: page.slug,
        seoTitle: page.seoTitle || page.title,
        seoDescription: page.seoDescription || null,
        canonicalUrl: page.canonicalUrl || null,
        ogImage: page.ogImage || null,
        jsonLd: page.jsonLd || null,
        sections: page.sections.map((s) => ({
          id: s.id,
          type: s.type,
          name: s.name,
          order: s.order,
          isVisible: s.isVisible,
          content: s.content || {},
        })),
        content: pageContentRow?.data || null,
        snapshotAt: new Date().toISOString(),
      };
      snapshotCount++;
    }

    await prisma.page.update({
      where: { id: page.id },
      data: {
        pageType,
        publishedSnapshot,
      },
    });

    updatedCount++;
  }

  console.log(`✅ Successfully backfilled ${updatedCount} pages with pageType.`);
  if (snapshotCount > 0) {
    console.log(`📸 Generated initial publishedSnapshot for ${snapshotCount} published pages.`);
  }

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("❌ Backfill failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
