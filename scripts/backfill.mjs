import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function backfill() {
  console.log('Starting Section siteId backfill...');
  
  const sections = await prisma.section.findMany({
    where: { siteId: null },
    include: { page: true }
  });

  console.log(`Found ${sections.length} sections with null siteId.`);
  
  let count = 0;
  for (const sec of sections) {
    if (sec.page && sec.page.siteId) {
      await prisma.section.update({
        where: { id: sec.id },
        data: { siteId: sec.page.siteId }
      });
      count++;
    }
  }
  
  console.log(`Successfully backfilled ${count} sections.`);
}

backfill()
  .catch(e => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
