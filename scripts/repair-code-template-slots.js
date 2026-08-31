// scripts/repair-code-template-slots.js
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

// Local copy of templateRegistry for script execution
const TEMPLATE_REGISTRY = {
  HOME: {
    slots: [
      { key: "hero", label: "Hero Banner", type: "HERO" },
      { key: "articles", label: "Articles Grid", type: "CUSTOM" },
      { key: "blogCategories", label: "Blog Categories", type: "CUSTOM" },
      { key: "wellnessBanner", label: "Wellness Banner", type: "CUSTOM" },
      { key: "quiz", label: "Quiz Section", type: "CUSTOM" },
      { key: "wellnessKitchen", label: "Wellness Kitchen", type: "CUSTOM" },
      { key: "authenticated", label: "Authenticated Modules", type: "CUSTOM" },
      { key: "communityEvents", label: "Community Events", type: "CUSTOM" },
      { key: "servicesBanner", label: "Services Banner", type: "CUSTOM" },
      { key: "newsletter", label: "Newsletter Sign-up", type: "CUSTOM" }
    ]
  },
  ABOUT: {
    slots: [
      { key: "hero", label: "Hero Banner", type: "HERO" },
      { key: "stats", label: "Statistics", type: "CUSTOM" },
      { key: "mission", label: "Mission Statement", type: "TEXT_BLOCK" },
      { key: "values", label: "Core Values", type: "CUSTOM" },
      { key: "categories", label: "Categories Grid", type: "CUSTOM" },
      { key: "cta", label: "Call to Action", type: "CTA" }
    ]
  },
  CONTACT: {
    slots: [
      { key: "hero", label: "Hero Banner", type: "HERO" },
      { key: "form", label: "Contact Form", type: "CONTACT_FORM" },
      { key: "faq", label: "FAQ Section", type: "FAQ" }
    ]
  },
  SERVICES: {
    slots: [
      { key: "hero", label: "Hero Banner", type: "HERO" },
      { key: "servicesList", label: "Services List", type: "SERVICES" },
      { key: "faq", label: "FAQ Section", type: "FAQ" },
      { key: "cta", label: "Call to Action", type: "CTA" }
    ]
  },
  BLOGS: {
    slots: [
      { key: "hero", label: "Hero Banner", type: "HERO" },
      { key: "blogsList", label: "Blogs List", type: "BLOGS" }
    ]
  }
};

async function main() {
  console.log("Starting code template slot repair migration...");
  
  const codeTemplatePages = await prisma.page.findMany({
    where: { isHardcoded: true, deletedAt: null },
    include: { sections: true }
  });

  console.log(`Found ${codeTemplatePages.length} CODE_TEMPLATE pages.`);

  let totalRepaired = 0;

  for (const page of codeTemplatePages) {
    let slugKey = page.slug.replace(/^\/+|\/+$/g, '').toUpperCase();
    if (!slugKey) slugKey = 'HOME';
    const templateKey = slugKey;
    const template = TEMPLATE_REGISTRY[templateKey];
    
    if (!template) {
      console.log(`Skipping page ${page.slug} - no template found for key ${templateKey}`);
      continue;
    }

    const currentSections = page.sections;
    const requiredSlots = template.slots;
    
    console.log(`Checking page ${page.slug} (${templateKey}). Required slots: ${requiredSlots.length}`);
    
    let pageRepaired = 0;
    
    for (const [idx, slot] of requiredSlots.entries()) {
      const existing = currentSections.find(s => s.regionKey === slot.key && !s.isDeleted);
      
      if (!existing) {
        console.log(`  - Missing slot '${slot.key}'. Creating...`);
        
        // Find if there's a legacy mapping (e.g. type === 'CONTACT_FORM' for regionKey 'main')
        const legacyMatch = currentSections.find(s => 
          (s.type === slot.type || (slot.key === 'form' && s.type === 'CONTACT_FORM')) && 
          !s.regionKey && 
          !s.isDeleted
        );

        if (legacyMatch) {
          console.log(`    - Found legacy match, updating regionKey to '${slot.key}'`);
          await prisma.section.update({
            where: { id: legacyMatch.id },
            data: { 
              regionKey: slot.key,
              order: idx
            }
          });
          pageRepaired++;
        } else {
          // Create new
          await prisma.section.create({
            data: {
              pageId: page.id,
              type: slot.type || "CUSTOM",
              regionKey: slot.key,
              order: idx,
              content: {},
              isVisible: true,
              siteId: page.siteId
            }
          });
          pageRepaired++;
        }
      } else if (existing.order !== idx) {
         // Fix order
         await prisma.section.update({
            where: { id: existing.id },
            data: { order: idx }
         });
      }
    }
    
    // Hide or soft delete any sections that don't belong to a slot for CODE_TEMPLATE
    const validKeys = new Set(requiredSlots.map(s => s.key));
    const extraSections = currentSections.filter(s => s.regionKey && !validKeys.has(s.regionKey) && !s.isDeleted);
    
    for (const extra of extraSections) {
      console.log(`  - Hiding extra section with regionKey '${extra.regionKey}'`);
      await prisma.section.update({
        where: { id: extra.id },
        data: { isDeleted: true }
      });
      pageRepaired++;
    }

    totalRepaired += pageRepaired;
    if (pageRepaired > 0) {
      console.log(`Repaired ${pageRepaired} items on page ${page.slug}`);
    }
  }

  console.log(`Migration complete. Total repairs made: ${totalRepaired}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
