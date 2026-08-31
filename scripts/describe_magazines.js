const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function describeTable() {
  const cols = await prisma.$queryRawUnsafe("DESCRIBE magazines");
  console.log("COLUMNS ON MAGAZINES TABLE:", cols);
}

describeTable().finally(() => prisma.$disconnect());
