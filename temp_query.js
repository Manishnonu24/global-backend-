const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.legalpage.findMany({
    where: { type: 'refund' }
  });
  console.log(JSON.stringify(pages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
