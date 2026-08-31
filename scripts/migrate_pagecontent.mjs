import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function migrate() {
  console.log('Migrating PageContent to Sections...');
  
  let pageContents = [];
  try {
    pageContents = await prisma.pageContent.findMany();
  } catch (e) {
    console.log('No PageContent table found or error fetching:', e.message);
    return;
  }
  
  for (const pc of pageContents) {
    const data = pc.content || pc.data || {};
    
    // Find or create the corresponding Page
    let page = await prisma.page.findFirst({
      where: { siteId: pc.siteId, slug: pc.pageSlug }
    });
    
    let templateKey = pc.pageSlug === '/' ? 'HOME' : pc.pageSlug.replace('/', '').toUpperCase();
    if (!['HOME', 'ABOUT', 'CONTACT', 'BLOGS', 'SERVICES'].includes(templateKey)) {
        templateKey = 'GENERAL';
    }

    if (!page) {
      console.log(`Page not found for slug ${pc.pageSlug}, creating...`);
      page = await prisma.page.create({
        data: {
          siteId: pc.siteId,
          slug: pc.pageSlug,
          title: data.titleLine1 || pc.pageSlug,
          pageType: 'CODE_TEMPLATE',
          templateKey
        }
      });
    }

    // Check if hero section exists to be idempotent
    const existingSection = await prisma.section.findFirst({
      where: { pageId: page.id, regionKey: 'hero', type: 'HERO' }
    });

    if (!existingSection && Object.keys(data).length > 0) {
      const heroContent = {
        title: `${data.titleLine1 || ''} ${data.titleLine2 || ''}`.trim(),
        subtitle: data.description || '',
        primaryButtonText: data.btn1Text || '',
        primaryButtonUrl: data.btn1Link || '',
        secondaryButtonText: data.btn2Text || '',
        secondaryButtonUrl: data.btn2Link || ''
      };
      
      await prisma.section.create({
        data: {
          siteId: pc.siteId,
          pageId: page.id,
          regionKey: 'hero',
          type: 'HERO',
          name: 'Migrated Hero Section',
          content: heroContent,
          order: 0
        }
      });
      console.log(`Created HERO section for page ${pc.pageSlug}`);
    }
  }
  
  console.log('Migration complete.');
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
