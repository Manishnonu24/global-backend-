const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.service.updateMany({
    where: { status: 'DRAFT', deletedAt: null },
    data: { status: 'ACTIVE' },
  });
  console.log(`Successfully activated ${res.count} draft service(s).`);
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
