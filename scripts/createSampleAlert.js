const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || 'AHP';
  const count = await prisma.notificationAlert.count({ where: { siteId } });
  console.log(`Current notification alerts count for site ${siteId}:`, count);

  if (count === 0) {
    await prisma.notificationAlert.create({
      data: {
        siteId,
        title: 'New Service Booking Request',
        message: 'Sample Lead requested Front Cover Feature Package ($599)',
        type: 'NEW_LEAD',
      },
    });
    console.log('Successfully created initial Service Booking NotificationAlert.');
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
