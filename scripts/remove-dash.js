const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const pages = await prisma.cmsPage.findMany();
    for (const page of pages) {
      if (page.sections && Array.isArray(page.sections)) {
        let changed = false;
        const newSections = page.sections.map(section => {
          if (section.content && section.content.subtext && typeof section.content.subtext === 'string') {
            if (section.content.subtext.includes('from the inside out — covering')) {
              section.content.subtext = section.content.subtext.replace('from the inside out — covering', 'from the inside out covering');
              changed = true;
            } else if (section.content.subtext.includes('from the inside out - covering')) {
              section.content.subtext = section.content.subtext.replace('from the inside out - covering', 'from the inside out covering');
              changed = true;
            }
          }
          return section;
        });

        if (changed) {
          await prisma.cmsPage.update({
            where: { id: page.id },
            data: { sections: newSections }
          });
          console.log(`Updated page ${page.slug} (${page.id})`);
        }
      }
    }
    console.log("Done checking CMS pages.");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
