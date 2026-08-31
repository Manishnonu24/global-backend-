/**
 * Seed script — populates navigation settings in the DB for all sites.
 * Run with: node scripts/seed-navigation.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MAIN_NAVIGATION = [
  { label: "Home", url: "/", type: "internal", children: [] },
  { label: "About", url: "/about", type: "internal", children: [] },
  { label: "Publication", url: "/publication", type: "internal", children: [] },
  { label: "Blogs", url: "/blogs", type: "internal", children: [] },
  { label: "Quizzes", url: "/quizzes", type: "internal", children: [] },
  { label: "Contact Us", url: "/contact", type: "internal", children: [] }
];

const FOOTER_NAVIGATION = [
  { label: "About Us", url: "/about", type: "internal", children: [] },
  { label: "Our Blogs", url: "/blogs", type: "internal", children: [] },
  { label: "Interactive Quizzes", url: "/quizzes", type: "internal", children: [] },
  { label: "Contact Us", url: "/contact", type: "internal", children: [] }
];

async function main() {
  console.log("Seeding navigation configuration...");
  const sites = await prisma.site.findMany();
  
  if (sites.length === 0) {
    const defaultSiteId = process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "AHP";
    console.log("  ⚠️ No sites found. Creating default 'infinium' site settings...");
    await prisma.globalSettings.upsert({
      where: { siteId: defaultSiteId },
      update: {
        navigation: {
          main: MAIN_NAVIGATION,
          footer: FOOTER_NAVIGATION
        }
      },
      create: {
        siteId: defaultSiteId,
        navigation: {
          main: MAIN_NAVIGATION,
          footer: FOOTER_NAVIGATION
        }
      }
    });
    console.log("  ✅ Seeding complete for 'infinium' site.");
    return;
  }

  for (const site of sites) {
    console.log(`  🔗 Seeding navigation settings for site: "${site.name}" (ID: ${site.id})...`);
    await prisma.globalSettings.upsert({
      where: { siteId: site.id },
      update: {
        navigation: {
          main: MAIN_NAVIGATION,
          footer: FOOTER_NAVIGATION
        }
      },
      create: {
        siteId: site.id,
        navigation: {
          main: MAIN_NAVIGATION,
          footer: FOOTER_NAVIGATION
        }
      }
    });
    console.log(`  ✅ Done for "${site.name}".`);
  }
}

main()
  .catch((e) => {
    console.error("Error seeding navigation:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
