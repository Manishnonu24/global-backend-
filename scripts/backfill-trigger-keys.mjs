import prisma from '../src/lib/prisma.js';

async function backfill() {
  console.log('Starting backfill of triggerKey and isActive for EmailTemplates...');
  const templates = await prisma.emailTemplate.findMany();
  console.log(`Found ${templates.length} templates in database.`);

  let updatedCount = 0;
  for (const t of templates) {
    let key = t.triggerKey;

    if (!key) {
      const lowerName = (t.name || '').toLowerCase();
      if (lowerName.includes('newsletter')) {
        key = 'newsletter_welcome';
      } else if (lowerName.includes('admin')) {
        key = 'admin_lead_notification';
      } else if (lowerName.includes('lead')) {
        key = 'lead_auto_reply';
      } else if (lowerName.includes('otp') || lowerName.includes('verify')) {
        key = 'user_verification';
      } else if (lowerName.includes('magazine')) {
        key = 'magazine_published';
      } else if (lowerName.includes('blog')) {
        key = 'blog_published';
      } else {
        key = 'promotions_offers';
      }
    }

    await prisma.emailTemplate.update({
      where: { id: t.id },
      data: {
        triggerKey: key,
        isActive: t.isActive !== undefined ? t.isActive : true,
      },
    });
    updatedCount++;
    console.log(`Updated template ID: ${t.id} (${t.name}) -> triggerKey: ${key}`);
  }

  console.log(`Backfill completed successfully. ${updatedCount} records updated.`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill error:', err);
    process.exit(1);
  });
