const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const mag = await prisma.magazine.findFirst({
    where: { status: 1 },
    orderBy: { date: 'desc' }
  });
  console.log('LATEST DB MAGAZINE:', JSON.stringify(mag, null, 2));
}

check().finally(() => prisma.$disconnect());
