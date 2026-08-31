/**
 * scripts/migrate-auth-to-user.js
 *
 * One-off migration: copies rows from the legacy `auth` table into the `User` table
 * with globalRole=VISITOR and SHA-256 hash stored in legacyPasswordHash.
 *
 * On first login after migration, frontendAuth.js will transparently upgrade the
 * hash to bcrypt and clear legacyPasswordHash.
 *
 * Run: node scripts/migrate-auth-to-user.js
 *
 * The original `auth` table rows are NOT deleted — they serve as a backup.
 */

import { PrismaClient } from "../src/generated/prisma/index.js";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Auth → User migration...\n");

  const authRows = await prisma.auth.findMany();
  console.log(`Found ${authRows.length} auth rows to process.\n`);

  let migrated = 0;
  let skipped = 0;
  const skippedEmails = [];

  for (const authUser of authRows) {
    const email = authUser.email || authUser.username;

    if (!email) {
      console.warn(`  ⚠️  Skipping auth row id=${authUser.id} — no email or username`);
      skipped++;
      skippedEmails.push(`(no email, id=${authUser.id})`);
      continue;
    }

    // Check for collision
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      console.warn(`  ⚠️  Collision: ${email} already exists in User table — skipping`);
      skipped++;
      skippedEmails.push(email);
      continue;
    }

    try {
      await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          name: authUser.name || email.split("@")[0],
          bio: authUser.bio || null,
          image: authUser.profile || null,
          passwordHash: "", // placeholder — SHA-256 hash stored in legacyPasswordHash
          legacyPasswordHash: authUser.password || null,
          globalRole: "VISITOR",
          isActive: true,
        }
      });
      console.log(`  ✅  Migrated: ${email}`);
      migrated++;
    } catch (err) {
      console.error(`  ❌  Failed to migrate ${email}: ${err.message}`);
      skipped++;
      skippedEmails.push(email);
    }
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`✅  Migrated:  ${migrated}`);
  console.log(`⚠️   Skipped:   ${skipped}`);
  if (skippedEmails.length > 0) {
    console.log(`\nSkipped emails (review manually):\n  ${skippedEmails.join("\n  ")}`);
  }
  console.log("─────────────────────────────────────────");
  console.log("\n✅ Migration complete. The original `auth` table rows are preserved.");
  console.log("   After verifying in production, you can safely drop the auth table.\n");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
