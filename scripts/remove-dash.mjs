import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  try {
    const pages = await prisma.page.findMany({
      include: { sections: true }
    });
    for (const page of pages) {
      if (page.sections && Array.isArray(page.sections)) {
        for (const section of page.sections) {
          if (section.content && section.content.subtext && typeof section.content.subtext === 'string') {
            let changed = false;
            if (section.content.subtext.includes('from the inside out — covering')) {
              section.content.subtext = section.content.subtext.replace('from the inside out — covering', 'from the inside out covering');
              changed = true;
            } else if (section.content.subtext.includes('from the inside out - covering')) {
              section.content.subtext = section.content.subtext.replace('from the inside out - covering', 'from the inside out covering');
              changed = true;
            }
            
            if (changed) {
              await prisma.section.update({
                where: { id: section.id },
                data: { content: section.content }
              });
              console.log(`Updated section ${section.id} on page ${page.slug}`);
            }
          }
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
