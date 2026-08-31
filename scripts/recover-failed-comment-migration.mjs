#!/usr/bin/env node

/**
 * Guarded one-time recovery for 20260806090000_repair_comment_system.
 * It only handles the original MySQL 1267 collation failure, creates and
 * verifies a full logical backup, then uses Prisma's official rolled-back
 * resolution. It never updates `_prisma_migrations` directly.
 */

import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { createGunzip, createGzip } from "zlib";
import { pipeline } from "stream/promises";
import mysql from "mysql2/promise";

const TARGET = "20260806090000_repair_comment_system";
const DB_URL = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.MIGRATION_BACKUP_DIR || "/backups";

if (!DB_URL) {
  console.error("Recovery aborted: DATABASE_URL is not configured.");
  process.exit(1);
}

function parseDbUrl(url) {
  const parsed = new URL(url.replace(/^mysql:\/\//, "http://"));
  return {
    host: parsed.hostname,
    port: Number.parseInt(parsed.port || "3306", 10),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  };
}

function correctedChecksum() {
  const sqlPath = path.join(process.cwd(), "prisma", "migrations", TARGET, "migration.sql");
  return crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex");
}

function findDumpClient() {
  for (const command of ["mariadb-dump", "mysqldump"]) {
    const probe = spawnSync(command, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) {
      const version = `${probe.stdout || ""}${probe.stderr || ""}`;
      return { command, isMariaDb: /mariadb/i.test(version) };
    }
  }
  throw new Error("No compatible database dump client is installed.");
}

function dumpTlsArgs(client, config) {
  if (config.ssl) {
    return client.isMariaDb ? ["--ssl"] : ["--ssl-mode=REQUIRED"];
  }
  return client.isMariaDb ? ["--skip-ssl"] : ["--ssl-mode=DISABLED"];
}

async function createVerifiedBackup(config) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rawPath = path.join(BACKUP_DIR, `before-${TARGET}-${stamp}.sql`);
  const gzipPath = `${rawPath}.gz`;
  const client = findDumpClient();
  const args = [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    "--events",
    "--hex-blob",
    "--default-character-set=utf8mb4",
    ...dumpTlsArgs(client, config),
  ];
  if (!client.isMariaDb) args.push("--set-gtid-purged=OFF", "--column-statistics=0");
  args.push(config.database);

  const output = fs.openSync(rawPath, "wx", 0o600);
  let result;
  try {
    result = spawnSync(client.command, args, {
      env: { ...process.env, MYSQL_PWD: config.password },
      stdio: ["ignore", output, "pipe"],
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } finally {
    fs.closeSync(output);
  }
  if (result.status !== 0) {
    fs.rmSync(rawPath, { force: true });
    throw new Error(`Database backup failed: ${(result.stderr || "unknown error").trim()}`);
  }

  await pipeline(
    fs.createReadStream(rawPath),
    createGzip({ level: 9 }),
    fs.createWriteStream(gzipPath, { mode: 0o600 })
  );

  let bytes = 0;
  let hasMigrationHistory = false;
  const migrationNeedle = Buffer.from("_prisma_migrations");
  let verificationTail = Buffer.alloc(0);
  const gunzip = createGunzip();
  gunzip.on("data", (chunk) => {
    bytes += chunk.length;
    const searchable = Buffer.concat([verificationTail, chunk]);
    if (searchable.includes(migrationNeedle)) hasMigrationHistory = true;
    verificationTail = searchable.subarray(
      Math.max(0, searchable.length - migrationNeedle.length + 1)
    );
  });
  await pipeline(fs.createReadStream(gzipPath), gunzip);
  if (bytes === 0 || !hasMigrationHistory) {
    throw new Error("Backup verification failed: dump is empty or lacks migration history.");
  }

  const hash = crypto.createHash("sha256").update(fs.readFileSync(gzipPath)).digest("hex");
  fs.rmSync(rawPath);
  console.log(`Verified recovery backup: ${gzipPath}`);
  console.log(`Backup SHA-256: ${hash}`);
  console.log(`Verified uncompressed bytes: ${bytes}`);
}

async function inspectCommentData(connection) {
  const [tables] = await connection.execute(`
    SELECT TABLE_NAME, ENGINE FROM INFORMATION_SCHEMA.TABLES
    WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
      AND BINARY(LOWER(TABLE_NAME)) = BINARY('comment')
  `);
  if (tables.length !== 1) {
    throw new Error(`Expected exactly one Comment/comment table; found ${tables.length}.`);
  }

  const tableName = tables[0].TABLE_NAME;
  if (!/^[A-Za-z0-9_]+$/.test(tableName)) throw new Error("Unsafe comment table identifier.");

  const [columns] = await connection.execute(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
      AND BINARY(TABLE_NAME) = BINARY(?)
      AND BINARY(COLUMN_NAME) IN (BINARY('postId'), BINARY('magazineId'))
  `, [tableName]);
  const names = new Set(columns.map((column) => column.COLUMN_NAME));

  if (names.has("postId")) {
    const [oversized] = await connection.query(
      `SELECT COUNT(*) AS count FROM \`${tableName}\` WHERE \`postId\` IS NOT NULL AND CHAR_LENGTH(\`postId\`) > 50`
    );
    if (Number(oversized[0].count) > 0) {
      throw new Error("Oversized comment.postId values require manual review.");
    }
    const [postExists] = await connection.execute(`
      SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES
      WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('post')
    `);
    if (Number(postExists[0].count) > 0) {
      const [orphans] = await connection.query(
        `SELECT COUNT(*) AS count FROM \`${tableName}\` c WHERE c.\`postId\` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM \`post\` p WHERE p.\`id\` = c.\`postId\`)`
      );
      if (Number(orphans[0].count) > 0) throw new Error("Orphaned comment.postId values require manual review.");
    }
  }

  if (names.has("magazineId")) {
    const [magazinesExist] = await connection.execute(`
      SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES
      WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('magazines')
    `);
    if (Number(magazinesExist[0].count) > 0) {
      const [orphans] = await connection.query(
        `SELECT COUNT(*) AS count FROM \`${tableName}\` c WHERE c.\`magazineId\` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM \`magazines\` m WHERE m.\`idMagazines\` = c.\`magazineId\`)`
      );
      if (Number(orphans[0].count) > 0) throw new Error("Orphaned comment.magazineId values require manual review.");
    }
  }
  console.log(`Comment recovery preflight passed for ${tableName} (${tables[0].ENGINE || "unknown engine"}).`);
}

function resolveWithPrisma() {
  const cli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  if (!fs.existsSync(cli)) throw new Error("Prisma CLI is missing from the deployment image.");
  const result = spawnSync(process.execPath, [
    cli,
    "migrate",
    "resolve",
    "--rolled-back",
    TARGET,
    "--schema=prisma/schema.prisma",
  ], { env: process.env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Prisma migrate resolve exited with status ${result.status}.`);
}

async function main() {
  const config = parseDbUrl(DB_URL);
  const connection = await mysql.createConnection(config);
  try {
    const [historyTable] = await connection.execute(`
      SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES
      WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
        AND BINARY(TABLE_NAME) = BINARY('_prisma_migrations')
    `);
    if (Number(historyTable[0].count) === 0) {
      console.log("No migration history exists; recovery is not needed.");
      return;
    }

    const [failed] = await connection.execute(`
      SELECT migration_name, checksum, logs FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
      ORDER BY started_at
    `);
    if (failed.length === 0) {
      console.log("No failed migration exists; recovery is not needed.");
      return;
    }
    if (failed.length !== 1 || failed[0].migration_name !== TARGET) {
      throw new Error(`Expected only ${TARGET}; found ${failed.map((row) => row.migration_name).join(", ")}.`);
    }

    const log = String(failed[0].logs || "");
    if (!/illegal mix of collations/i.test(log) || !/\b1267\b/.test(log)) {
      throw new Error("Stored failure is not the known MySQL 1267 collation error.");
    }
    if (failed[0].checksum === correctedChecksum()) {
      throw new Error("Failed attempt already used the corrected migration; automatic recovery is unsafe.");
    }

    await inspectCommentData(connection);
    await createVerifiedBackup(config);
    resolveWithPrisma();

    const [resolved] = await connection.execute(`
      SELECT rolled_back_at FROM _prisma_migrations
      WHERE migration_name = ? ORDER BY started_at DESC LIMIT 1
    `, [TARGET]);
    if (!resolved[0]?.rolled_back_at) throw new Error("Prisma did not record rolled_back_at.");
    console.log(`Guarded recovery completed for ${TARGET}.`);
  } finally {
    await connection.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(`Guarded migration recovery failed: ${error.message}`);
  process.exit(1);
});
