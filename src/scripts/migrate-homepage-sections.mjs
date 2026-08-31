import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function migrateHomepageSections() {
  const isApply = process.argv.includes('--apply');
  
  if (!isApply) {
    console.log("=========================================");
    console.log(" DRY RUN MODE: No database changes will be made.");
    console.log(" Run with --apply to execute the migration.");
    console.log("=========================================\n");
  } else {
    console.log("=========================================");
    console.log(" APPLY MODE: Database will be modified.");
    console.log("=========================================\n");
  }

  // Find all pages that are the homepage (slug: '/')
  const homePages = await prisma.page.findMany({
    where: {
      slug: '/',
      deletedAt: null
    },
    include: {
      sections: true
    }
  });

  console.log(`Found ${homePages.length} HOME template page(s).\n`);

  for (const page of homePages) {
    console.log(`Processing page: ${page.title} (ID: ${page.id}, SiteID: ${page.siteId})`);

    const existingSectionTypes = page.sections.map(s => s.type);

    // Default content for the new sections
    const newsletterContent = {
      eyebrow: "GET INVOLVED",
      heading: "Get A Health Place Delivered to Your Inbox",
      subtext: "Join our community for weekly tips, inspiring stories, and exclusive resources delivered right to you.",
      placeholder: "Your email address",
      buttonText: "Sign Up",
      footnote: "By signing up you agree to our Terms of Service & Privacy Policy."
    };

    const showcaseContent = {
      sectionTag: "Our Offerings",
      heading: "The Tools for Real Results",
      description: "Explore our publications designed to inspire and inform.",
      button1Text: "Find Health Services Near Me",
      button2Text: "Shop Our Curated Health Store",
      middleEyebrow: "Hello Health Enthusiasts",
      middleGreeting: "Discover Your Next Read",
      hintText: "Click Below to Preview",
      button3Text: "Check out our latest publication"
    };

    const sliderContent = {
      heading: "Explore Categories",
      description: "Browse articles by topic."
    };

    const sectionsToAdd = [
      { type: 'NEWSLETTER', content: newsletterContent, regionKey: 'main', order: 80 },
      { type: 'MAGAZINE_SHOWCASE', content: showcaseContent, regionKey: 'main', order: 50 },
      { type: 'BLOG_SLIDER', content: sliderContent, regionKey: 'main', order: 40 }
    ];

    for (const sec of sectionsToAdd) {
      if (existingSectionTypes.includes(sec.type)) {
        console.log(`  - [SKIP] Section ${sec.type} already exists on this page.`);
      } else {
        if (isApply) {
          await prisma.section.create({
            data: {
              siteId: page.siteId,
              pageId: page.id,
              type: sec.type,
              regionKey: sec.regionKey,
              order: sec.order,
              content: sec.content,
              isVisible: true,
            }
          });
          console.log(`  - [CREATED] Section ${sec.type} added successfully.`);
        } else {
          console.log(`  - [WOULD CREATE] Section ${sec.type} with regionKey '${sec.regionKey}'.`);
        }
      }
    }
    console.log(""); // Empty line for readability
  }

  console.log("Migration complete.");
  await prisma.$disconnect();
}

migrateHomepageSections().catch(async (e) => {
  console.error("Migration failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
