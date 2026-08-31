const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$executeRawUnsafe("ALTER TABLE `Ad` ADD COLUMN `ctaColor` VARCHAR(20) NULL;");
    console.log("Successfully added ctaColor column to Ad table:", res);
  } catch (err) {
    if (err.message.includes("Duplicate column name")) {
      console.log("Column ctaColor already exists in Ad table!");
    } else {
      console.error("Error adding ctaColor column:", err.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
