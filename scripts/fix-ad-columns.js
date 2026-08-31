const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking and adding missing columns to table Ad...");
  
  const columns = [
    { name: 'headline', type: 'VARCHAR(255) NULL' },
    { name: 'description', type: 'TEXT NULL' },
    { name: 'ctaText', type: 'VARCHAR(255) NULL' },
  ];

  for (const col of columns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Ad\` ADD COLUMN \`${col.name}\` ${col.type};`);
      console.log(`✅ Added column \`${col.name}\` to table \`Ad\`.`);
    } catch (err) {
      if (err.message.includes('Duplicate column name')) {
        console.log(`ℹ️ Column \`${col.name}\` already exists on table \`Ad\`.`);
      } else {
        console.warn(`Warning adding column \`${col.name}\`:`, err.message);
      }
    }
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
