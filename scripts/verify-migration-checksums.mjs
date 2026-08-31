#!/usr/bin/env node
/**
 * scripts/verify-migration-checksums.mjs
 *
 * Pre-deployment read-only migration history & checksum verifier.
 * Compares SHA-256 hashes of local migration.sql files against recorded
 * checksums in the database `_prisma_migrations` table.
 *
 * Exits 0 if clean / aligned.
 * Exits 1 if migration history is diverged or a checksum mismatch is found.
 * Never modifies database or prints credentials.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌ DATABASE_URL environment variable is not set.");
  process.exit(1);
}

function parseDbUrl(url) {
  const u = new URL(url.replace(/^mysql:\/\//, "http://"));
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306", 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  console.log("🔍 Pre-deployment Migration Checksum Verification...");

  let conn;
  try {
    conn = await mysql.createConnection(parseDbUrl(DB_URL));
  } catch (err) {
    console.error(`❌ Database connection failed during preflight checksum check: ${err.message}`);
    process.exit(1);
  }

  try {
    // Check if _prisma_migrations table exists
    const [tables] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'`
    );

    if (tables[0].cnt === 0) {
      console.log("  ℹ️ _prisma_migrations table does not exist yet (fresh database). Skipping checksum comparison.");
      await conn.end();
      process.exit(0);
    }

    const [dbRows] = await conn.execute(
      `SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations`
    );

    const dbChecksumMap = new Map();
    const failedMigrations = [];

    for (const r of dbRows) {
      if (r.finished_at && !r.rolled_back_at) {
        dbChecksumMap.set(r.migration_name, r.checksum);
      } else if (!r.finished_at && !r.rolled_back_at) {
        failedMigrations.push(r.migration_name);
      }
    }

    if (failedMigrations.length > 0) {
      console.error(`❌ FAILED MIGRATION DETECTED IN DATABASE: ${failedMigrations.join(", ")}`);
      console.error("   Aborting deployment preflight. A failed migration exists in _prisma_migrations.");
      process.exit(1);
    }

    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ Migration directory missing: ${migrationsDir}`);
      process.exit(1);
    }

    const localDirs = fs.readdirSync(migrationsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();

    let mismatches = 0;
    for (const migrationName of localDirs) {
      const sqlPath = path.join(migrationsDir, migrationName, "migration.sql");
      if (!fs.existsSync(sqlPath)) continue;

      const content = fs.readFileSync(sqlPath, "utf8");
      const localHash = crypto.createHash("sha256").update(content).digest("hex");
      const normalizedHash = crypto.createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
      const dbHash = dbChecksumMap.get(migrationName);

      if (!dbHash) {
        console.log(`  ⏳ Pending migration: ${migrationName} (not yet applied)`);
      } else if (dbHash !== localHash && dbHash !== normalizedHash) {
        mismatches++;
        console.error(`  ❌ CHECKSUM MISMATCH in migration: ${migrationName}`);
        console.error(`     Local SHA-256: ${localHash}`);
        console.error(`     DB Checksum:   ${dbHash}`);
      } else {
        console.log(`  ✅ Migration checksum matched: ${migrationName}`);
      }
    }

    if (mismatches > 0) {
      console.error(`\n❌ Migration history preflight failed: ${mismatches} historical migration checksum mismatch(es) detected.`);
      console.error("   Deployment halted to protect database integrity.");
      process.exit(1);
    }

    console.log("\n✅ Migration checksum preflight passed — all applied historical migrations match local files.");
    process.exit(0);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("❌ Checksum preflight crashed:", err.message);
  process.exit(1);
});
