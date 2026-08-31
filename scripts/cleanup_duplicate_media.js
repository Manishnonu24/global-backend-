const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanupDuplicateMedia() {
  console.log("🔍 Scanning Media library for duplicate records and invalid HTML entries...");

  // Step 0: Soft-delete invalid HTML pages uploaded into Media library during import
  const htmlMedia = await prisma.$queryRawUnsafe("SELECT id, fileName, mimeType FROM Media WHERE deletedAt IS NULL AND (mimeType LIKE '%html%' OR fileName LIKE '%.html%' OR fileName LIKE '%.htm%')");
  if (htmlMedia.length > 0) {
    console.log(`\n🗑️ Found ${htmlMedia.length} invalid HTML media record(s) to remove:`);
    for (const h of htmlMedia) {
      console.log(`  -> Soft-deleting invalid HTML media ID ${h.id} (${h.fileName}, ${h.mimeType})`);
      await prisma.$executeRawUnsafe(`UPDATE Media SET deletedAt = NOW() WHERE id = '${h.id}'`);
    }
  }

  // Fetch all active media records after HTML cleanup
  const allMedia = await prisma.$queryRawUnsafe("SELECT id, siteId, fileName, originalName, url, secureUrl, mimeType, extension, size, isImage, isVideo, isDocument, createdAt, deletedAt FROM Media WHERE deletedAt IS NULL ORDER BY createdAt DESC");

  console.log(`\n📊 Total active Media records found: ${allMedia.length}`);

  const groups = new Map();

  for (const item of allMedia) {
    let nameKey = (item.originalName || item.fileName || "").trim().toLowerCase();
    if (!nameKey) continue;

    // Strip extension to group '.jpg', '.webp', '.pdf' duplicates of the same base file name
    nameKey = nameKey.replace(/\.[^/.]+$/, "");

    const groupKey = `${item.siteId}::${nameKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(item);
  }

  let duplicateGroupCount = 0;
  let totalDuplicatesRemoved = htmlMedia.length;

  for (const [key, items] of groups.entries()) {
    if (items.length <= 1) continue;

    duplicateGroupCount++;

    // Prefer item with valid media type, S3/proxy URL & complete metadata (extension & size)
    items.sort((a, b) => {
      const aIsMedia = a.isImage || a.isVideo || a.isDocument || a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/") || a.mimeType?.includes("pdf");
      const bIsMedia = b.isImage || b.isVideo || b.isDocument || b.mimeType?.startsWith("image/") || b.mimeType?.startsWith("video/") || b.mimeType?.includes("pdf");
      const aIsS3 = a.url?.includes("localhost:9000") || a.url?.includes("ahp-media") || a.url?.startsWith("/uploads/") || a.url?.startsWith("/api/media/");
      const bIsS3 = b.url?.includes("localhost:9000") || b.url?.includes("ahp-media") || b.url?.startsWith("/uploads/") || b.url?.startsWith("/api/media/");

      const aScore = (aIsMedia ? 20 : 0) + (aIsS3 ? 10 : 0) + (a.extension ? 2 : 0) + (a.size ? 2 : 0);
      const bScore = (bIsMedia ? 20 : 0) + (bIsS3 ? 10 : 0) + (b.extension ? 2 : 0) + (b.size ? 2 : 0);
      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const keeper = items[0];
    const duplicates = items.slice(1);

    console.log(`\n✨ Group '${key}': Keeping ID ${keeper.id} (${keeper.fileName}, mime: ${keeper.mimeType || 'none'}, ext: ${keeper.extension || 'none'}, size: ${keeper.size || 0})`);
    duplicates.forEach(d => console.log(`  -> Soft-deleting duplicate ID ${d.id} (${d.fileName}, mime: ${d.mimeType || 'none'}, ext: ${d.extension || 'none'}, size: ${d.size || 0})`));

    const duplicateIds = duplicates.map((d) => d.id);

    // 1. Re-point references in other tables
    if (duplicateIds.length > 0) {
      const idsString = duplicateIds.map(id => `'${id}'`).join(",");
      await prisma.$executeRawUnsafe(`UPDATE Post SET featuredImageId = '${keeper.id}' WHERE featuredImageId IN (${idsString})`).catch(() => {});
      await prisma.$executeRawUnsafe(`UPDATE Service SET featuredImageId = '${keeper.id}' WHERE featuredImageId IN (${idsString})`).catch(() => {});
    }

    // 2. Soft-delete the duplicate Media records
    for (const dupId of duplicateIds) {
      await prisma.$executeRawUnsafe(`UPDATE Media SET deletedAt = NOW() WHERE id = '${dupId}'`);
    }

    totalDuplicatesRemoved += duplicates.length;
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`📁 Duplicate File Groups Processed: ${duplicateGroupCount}`);
  console.log(`🗑️ Total Invalid / Duplicate Media Rows Soft-Deleted: ${totalDuplicatesRemoved}`);
}

cleanupDuplicateMedia()
  .catch((err) => {
    console.error("❌ Cleanup failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
