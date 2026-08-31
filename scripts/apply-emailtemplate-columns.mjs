import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Attempting to add triggerKey and isActive columns to emailtemplate table...');

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE emailtemplate ADD COLUMN triggerKey VARCHAR(191) NULL;
    `);
    console.log('Added triggerKey column.');
  } catch (err) {
    console.log('triggerKey column notice:', err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE emailtemplate ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1;
    `);
    console.log('Added isActive column.');
  } catch (err) {
    console.log('isActive column notice:', err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX EmailTemplate_siteId_triggerKey_idx ON emailtemplate(siteId(64), triggerKey(64));
    `);
    console.log('Created index EmailTemplate_siteId_triggerKey_idx.');
  } catch (err) {
    console.log('Index notice:', err.message);
  }

  console.log('Column migration script finished.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
