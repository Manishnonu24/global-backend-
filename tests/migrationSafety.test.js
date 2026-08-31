/**
 * tests/migrationSafety.test.js
 *
 * Production-grade audit & safety test suite for the complete 25-migration
 * Prisma/MySQL chain.
 *
 * Divided into four distinct test groups:
 *   Group 1: Unit & Schema Integrity Tests (Offline / DMMF)
 *   Group 2: Ordered Historical Migration & Boundary Tests (Testing real historical
 *            migration behavior from pre-migration database states without skipping)
 *   Group 3: Post-23 Forward Repair & Convergence Tests (Emulating production DB state
 *            where migrations 1-23 are already applied, testing 061400 forward repairs)
 *   Group 4: Read-Only Audit of Persistent Production Database (ahpfinal)
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import mysql from "mysql2/promise";
import { Prisma, PrismaClient } from "../src/generated/prisma/index.js";
import { resetDisposableDb } from "../scripts/testing/reset_disposable.js";

/** Historical migrations 1 through 23 (applied prior to forward repairs) */
const MIGRATIONS_1_TO_23 = [
  "20260722040342_init",
  "20260727000000_add_page_types_and_snapshots",
  "20260730160000_add_seo_and_site_id_fields",
  "20260730170000_add_site_id_indexes",
  "20260731130000_normalize_table_case",
  "20260731143000_add_page_template_fields",
  "20260731150000_repair_lowercase_seo_columns",
  "20260803100000_ensure_all_model_columns",
  "20260803110000_add_missing_tables_and_columns",
  "20260803130000_repair_blog_and_admin_schema",
  "20260804000000_forward_repair",
  "20260804010000_repair_post_taxonomy_join_tables",
  "20260804020000_repair_admin_route_schema",
  "20260804030000_repair_taxonomy_and_admin_schema",
  "20260804040000_repair_magazines_quiztypes_admin_schema",
  "20260804050000_hardened_production_repair",
  "20260805132000_alter_post_seodescription_text",
  "20260806090000_repair_comment_system",
  "20260806095000_ensure_categorytopost_and_posttotag_join_tables",
  "20260806100000_harden_comment_schema_repair",
  "20260806110000_normalize_comment_foreign_keys",
  "20260806120000_fix_comment_engine_and_foreign_keys",
  "20260806130000_repair_recipe_schema",
];

/**
 * Apply physical SQL of migrations up to targetMigrationName so the DB has all
 * historical tables created up to that point (REAL MIGRATED STATE).
 * Uses mysql2 connection with multipleStatements: true so that dynamic SQL
 * PREPARE/EXECUTE statements run natively without protocol error 1295.
 * If any statement fails, throws an explicit Error detailing the migration name
 * without silently swallowing errors.
 */
async function setupPrismaMigrationsUpTo(testDbUrl, targetMigrationName) {
  const conn = await mysql.createConnection({
    uri: testDbUrl,
    multipleStatements: true,
  });

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const targetIndex = MIGRATIONS_1_TO_23.indexOf(targetMigrationName);
  const toApply = targetIndex >= 0 ? MIGRATIONS_1_TO_23.slice(0, targetIndex) : MIGRATIONS_1_TO_23;

  try {
    // Ensure _prisma_migrations table exists
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
        \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
        \`checksum\` VARCHAR(64) NOT NULL,
        \`finished_at\` DATETIME(3) NULL,
        \`migration_name\` VARCHAR(255) NOT NULL,
        \`logs\` TEXT NULL,
        \`rolled_back_at\` DATETIME(3) NULL,
        \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`applied_steps_count\` INT UNSIGNED NOT NULL DEFAULT 0
      ) ENGINE = InnoDB;
    `);

    for (const name of toApply) {
      const sqlPath = path.join(migrationsDir, name, "migration.sql");
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, "utf8");
        try {
          await conn.query(sqlContent);
        } catch (e) {
          const safeMsg = (e.message || "").replace(/mysql:\/\/[^@]+@/, "mysql://***@");
          throw new Error(
            `[setupPrismaMigrationsUpTo] Failed executing historical setup migration "${name}": ${safeMsg}`
          );
        }

        await conn.query(`
          INSERT IGNORE INTO \`_prisma_migrations\` (\`id\`, \`checksum\`, \`finished_at\`, \`migration_name\`, \`applied_steps_count\`)
          VALUES (UUID(), 'dummy_hash', NOW(), ?, 1)
        `, [name]);
      }
    }
  } finally {
    await conn.end();
  }
}

/** Mark all 23 historical migrations as applied */
async function setupAllHistoricalMigrationsHistory(testDbUrl) {
  await setupPrismaMigrationsUpTo(testDbUrl, null);
}

/** Helper: execute prisma migrate deploy and return output or throw error object */
function runMigrateDeploy(testDbUrl) {
  const baseEnv = { ...process.env, DATABASE_URL: testDbUrl };
  return execSync(
    "npx prisma migrate deploy --schema=prisma/schema.prisma",
    { env: baseEnv, encoding: "utf8" }
  );
}

/** Helper: execute prisma migrate deploy expecting a failure and return lowercased failure details */
function expectMigrateDeployFailure(testDbUrl) {
  const baseEnv = { ...process.env, DATABASE_URL: testDbUrl };
  try {
    const stdout = execSync(
      "npx prisma migrate deploy --schema=prisma/schema.prisma",
      { env: baseEnv, encoding: "utf8", stdio: "pipe" }
    );
    throw new Error(`Expected migrate deploy to fail, but it succeeded with output:\n${stdout}`);
  } catch (err) {
    if (err.message && err.message.startsWith("Expected migrate deploy to fail")) {
      throw err;
    }
    const combinedOutput = [
      err.stdout ? err.stdout.toString() : "",
      err.stderr ? err.stderr.toString() : "",
      err.message || ""
    ].join("\n").toLowerCase();
    return combinedOutput;
  }
}


// =============================================================================
// GROUP 1: Unit & Schema Integrity Tests (Offline / DMMF)
// =============================================================================

describe("Group 1: Unit & Schema Integrity Tests", () => {
  it("all local migration files have valid non-empty migration.sql content", () => {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const dirs = fs.readdirSync(migrationsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    expect(dirs.length).toBeGreaterThanOrEqual(28);

    for (const dirName of dirs) {
      const sqlPath = path.join(migrationsDir, dirName, "migration.sql");
      expect(fs.existsSync(sqlPath), `${dirName} must contain migration.sql`).toBe(true);
      const content = fs.readFileSync(sqlPath, "utf8");
      expect(content.trim().length, `${dirName}/migration.sql must not be empty`).toBeGreaterThan(0);
    }
  });

  it("uses binary-safe INFORMATION_SCHEMA comparisons in pending repair migrations", () => {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const pendingRepairMigrations = fs.readdirSync(migrationsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => {
        const timestamp = name.slice(0, 14);
        return timestamp >= "20260806090000" && timestamp <= "20260807100000";
      });

    const unsafePatterns = [
      {
        label: "schema name compared to DATABASE() without binary coercion",
        pattern: /\b(?:[A-Za-z_]\w*\.)?(?:TABLE_SCHEMA|CONSTRAINT_SCHEMA)\s*=\s*(?:DATABASE\(\)|LOWER\(DATABASE\(\)\))/gi,
      },
      {
        label: "metadata value compared to a string literal without binary coercion",
        pattern: /\b(?:[A-Za-z_]\w*\.)?(?:TABLE_NAME|COLUMN_NAME|CONSTRAINT_NAME|CONSTRAINT_TYPE|INDEX_NAME|DATA_TYPE|IS_NULLABLE|REFERENCED_TABLE_NAME|REFERENCED_COLUMN_NAME|DELETE_RULE|UPDATE_RULE)\s*(?:=|!=|<>)\s*'/gi,
      },
      {
        label: "derived metadata value compared to a string literal without binary coercion",
        pattern: /(?:LOWER|UPPER)\((?:TABLE_SCHEMA|TABLE_NAME|COLUMN_NAME|CONSTRAINT_NAME|INDEX_NAME)[^\r\n]*?\)\s*(?:=|!=|<>)\s*'/gi,
      },
      {
        label: "metadata value used in a string-literal IN list without binary coercion",
        pattern: /\b(?:TABLE_NAME|COLUMN_NAME|CONSTRAINT_NAME|INDEX_NAME|DATA_TYPE|IS_NULLABLE|REFERENCED_TABLE_NAME|REFERENCED_COLUMN_NAME)\s+IN\s*\(\s*'/gi,
      },
      {
        label: "malformed nested binary coercion",
        pattern: /BINARY\(BINARY\(/gi,
      },
    ];

    for (const migrationName of pendingRepairMigrations) {
      const sqlPath = path.join(migrationsDir, migrationName, "migration.sql");
      // Unescape quotes so comparisons embedded in prepared SQL are audited too.
      const sql = fs.readFileSync(sqlPath, "utf8").replace(/\\'/g, "'");

      for (const { label, pattern } of unsafePatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(sql);
        expect(
          match,
          `${migrationName} contains ${label}: ${match?.[0] || "unknown match"}`
        ).toBeNull();
      }
    }
  });

  it("guards CI/CD recovery with a verified backup before Prisma resolution", () => {
    const workflow = fs.readFileSync(path.join(process.cwd(), ".github", "workflows", "cd.yml"), "utf8");
    const recovery = fs.readFileSync(
      path.join(process.cwd(), "scripts", "recover-failed-comment-migration.mjs"),
      "utf8"
    );
    const dockerfile = fs.readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");

    const recoveryStep = workflow.indexOf("node scripts/recover-failed-comment-migration.mjs");
    const checksumStep = workflow.indexOf("npm run db:verify-checksums");
    const deployStep = workflow.indexOf("prisma migrate deploy");
    const previousStateStep = workflow.indexOf("Record previous container state");
    const prePullImageCleanup = workflow.indexOf("sudo docker image prune -af");
    const pullStep = workflow.indexOf('sudo docker pull "${IMAGE}"');

    expect(recoveryStep).toBeGreaterThan(-1);
    expect(checksumStep).toBeGreaterThan(recoveryStep);
    expect(deployStep).toBeGreaterThan(checksumStep);
    expect(previousStateStep).toBeGreaterThan(-1);
    expect(prePullImageCleanup).toBeGreaterThan(previousStateStep);
    expect(pullStep).toBeGreaterThan(prePullImageCleanup);
    expect(workflow).not.toMatch(/docker\s+(?:system|volume)\s+prune/);
    expect(workflow).toContain("ahealthplace-db-backups:/backups");
    expect(dockerfile).toContain("mariadb-client");

    expect(recovery).toContain("illegal mix of collations");
    expect(recovery).toContain("failed.length !== 1");
    expect(recovery).toContain("failed[0].checksum === correctedChecksum()");
    expect(recovery).toContain("await createVerifiedBackup(config)");
    expect(recovery).toContain('client.isMariaDb ? ["--skip-ssl"] : ["--ssl-mode=DISABLED"]');
    expect(recovery).toContain('client.isMariaDb ? ["--ssl"] : ["--ssl-mode=REQUIRED"]');
    expect(recovery.indexOf("await createVerifiedBackup(config)")).toBeLessThan(
      recovery.lastIndexOf("resolveWithPrisma()")
    );
    expect(recovery).not.toMatch(/UPDATE\s+[`']?_prisma_migrations/i);
  });

  it("verifies explicit magazine status semantic mapping rules", () => {
    const activeValues   = ["1", "ACTIVE", "PUBLISHED", "TRUE"];
    const inactiveValues = ["0", "DRAFT", "INACTIVE", "ARCHIVED", "FALSE"];

    const mapStatus = (val) => {
      const upper = String(val).toUpperCase();
      if (activeValues.includes(upper)) return 1;
      if (inactiveValues.includes(upper)) return 0;
      throw new Error(`Unexpected magazine status: ${val}`);
    };

    expect(mapStatus("1")).toBe(1);
    expect(mapStatus("ACTIVE")).toBe(1);
    expect(mapStatus("PUBLISHED")).toBe(1);
    expect(mapStatus("TRUE")).toBe(1);
    expect(mapStatus("DRAFT")).toBe(0);
    expect(mapStatus("INACTIVE")).toBe(0);
    expect(mapStatus("ARCHIVED")).toBe(0);
    expect(mapStatus("FALSE")).toBe(0);
    expect(mapStatus("0")).toBe(0);
    expect(() => mapStatus("UNKNOWN_STATUS")).toThrow();
    expect(() => mapStatus("PENDING")).toThrow();
  });

  it("verifies QuizType.id is INT in DMMF after migration", () => {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === "QuizType");
    const idField = model.fields.find(f => f.name === "id");
    expect(idField.type).toBe("Int");
    expect(idField.isId).toBe(true);
  });

  it("verifies post categories relation uses _CategoryToPost in DMMF", () => {
    const postModel = Prisma.dmmf.datamodel.models.find(m => m.name === "post");
    const categoriesField = postModel.fields.find(f => f.name === "categories");
    expect(categoriesField.relationName).toBe("CategoryToPost");
  });
});


// =============================================================================
// GROUP 2 & GROUP 3: MySQL Integration Tests
// =============================================================================

const testDbUrl = process.env.TEST_DATABASE_URL;
const runIntegration = process.env.RUN_MIGRATION_INTEGRATION_TESTS === "true";

if (testDbUrl && runIntegration) {
  const shadowDbUrl = testDbUrl.replace(/\/([^/]+)$/, "/$1_shadow");

  describe("Group 2: Ordered Historical Migration & Boundary Tests", () => {
    it("refuses to run migration tests against production or dev database", () => {
      const lower = testDbUrl.toLowerCase();
      expect(lower.includes("ahpfinal")).toBe(false);
      expect(lower.includes("production")).toBe(false);
      expect(lower.includes("defaultdb")).toBe(false);
    });

    it("Scenario A: Fresh DB → all 25 migrations, idempotency, zero drift, checksums", async () => {
      await resetDisposableDb();
      const baseEnv = { ...process.env, DATABASE_URL: testDbUrl };

      const deployOut = execSync("npx prisma migrate deploy --schema=prisma/schema.prisma", { env: baseEnv, encoding: "utf8" });
      expect(deployOut).toMatch(/All migrations have been successfully applied/);

      const statusOut = execSync("npx prisma migrate status --schema=prisma/schema.prisma", { env: baseEnv, encoding: "utf8" });
      expect(statusOut).toContain("Database schema is up to date");

      const verifyOut = execSync("node scripts/verify-production-schema.mjs", { env: baseEnv, encoding: "utf8" });
      expect(verifyOut).toContain("Schema verification passed");

      const diffOut = execSync(
        `npx prisma migrate diff --from-migrations prisma/migrations --to-url "${testDbUrl}" --shadow-database-url "${shadowDbUrl}"`,
        { env: baseEnv, encoding: "utf8" }
      );
      expect(diffOut).toContain("No difference detected");

      const checksumOut = execSync("node scripts/verify-migration-checksums.mjs", { env: baseEnv, encoding: "utf8" });
      expect(checksumOut).toContain("Migration checksum preflight passed");

      const secondDeploy = execSync("npx prisma migrate deploy --schema=prisma/schema.prisma", { env: baseEnv, encoding: "utf8" });
      expect(secondDeploy).toContain("No pending migrations to apply");
    }, 90000);

    it("Boundary M: Historical 040400 magazine status coercion behavior", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260804040000_repair_magazines_quiztypes_admin_schema");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`magazines\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`magazines\` (
            \`idMagazines\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`magazine_id\` VARCHAR(255) NOT NULL, \`magazine_title\` VARCHAR(255) NOT NULL,
            \`magazine_description\` TEXT NOT NULL, \`magazine_tags\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_cover_image\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_link\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_date\` DATE NOT NULL DEFAULT '2024-01-01', \`magazine_category\` VARCHAR(255) NOT NULL DEFAULT '',
            \`MagCloudLink\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_slug\` VARCHAR(191) NOT NULL,
            \`status\` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            \`magazine_timestamp\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX (\`magazine_slug\`)
          ) ENGINE = InnoDB;
        `);

        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`) VALUES ('m1', 'Mag 1', 'Desc', 'm-active', 'ACTIVE')`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`) VALUES ('m2', 'Mag 2', 'Desc', 'm-draft', 'DRAFT')`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`) VALUES ('m3', 'Mag 3', 'Desc', 'm-num', '0')`);
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT magazine_slug, status FROM magazines ORDER BY idMagazines`);
        expect(rows.length).toBe(3);
        expect(Number(rows[1].status)).toBe(1);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Boundary Q1: Historical 040400 QuizType numeric VARCHAR ID behavior", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260804040000_repair_magazines_quiztypes_admin_schema");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`quiz_types\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`quiz_types\` (
            \`id\` VARCHAR(50) NOT NULL PRIMARY KEY, \`slug\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(200) NOT NULL, \`description\` TEXT NOT NULL, \`category\` VARCHAR(255) NOT NULL,
            \`difficulty\` VARCHAR(255) NOT NULL DEFAULT 'Beginner', \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
            \`sortOrder\` INT NOT NULL DEFAULT 0,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`quiz_types\` (\`id\`, \`slug\`, \`title\`, \`description\`, \`category\`) VALUES ('42', 'q-num', 'Num Quiz', 'Desc', 'cat')`);
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const typeInfo = await checkPrisma.$queryRawUnsafe(
          `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'id'`
        );
        expect(typeInfo[0].DATA_TYPE.toLowerCase()).toBe("int");

        const rows = await checkPrisma.$queryRawUnsafe(`SELECT id, slug FROM quiz_types WHERE slug = 'q-num'`);
        expect(Number(rows[0].id)).toBe(42);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Boundary Q2: Historical 040400 QuizType non-numeric VARCHAR ID behavior", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260804040000_repair_magazines_quiztypes_admin_schema");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`quiz_types\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`quiz_types\` (
            \`id\` VARCHAR(50) NOT NULL PRIMARY KEY, \`slug\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(200) NOT NULL, \`description\` TEXT NOT NULL, \`category\` VARCHAR(255) NOT NULL,
            \`difficulty\` VARCHAR(255) NOT NULL DEFAULT 'Beginner', \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
            \`sortOrder\` INT NOT NULL DEFAULT 0,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`quiz_types\` (\`id\`, \`slug\`, \`title\`, \`description\`, \`category\`) VALUES ('quiz-health', 'q-alpha', 'Alpha Quiz', 'Desc', 'cat')`);
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const typeInfo = await checkPrisma.$queryRawUnsafe(
          `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'id'`
        );
        expect(typeInfo[0].DATA_TYPE.toLowerCase()).toBe("int");

        const rows = await checkPrisma.$queryRawUnsafe(`SELECT id, slug FROM quiz_types WHERE slug = 'q-alpha'`);
        expect(rows.length).toBe(1);
        // Non-numeric string "quiz-health" is coerced by MySQL ALTER TABLE ... INT AUTO_INCREMENT to 1
        expect(Number(rows[0].id)).toBeGreaterThan(0);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Boundary J1: Historical 040500 _CategoryToPost orphan deletion evidence", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260804050000_hardened_production_repair");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`category\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`name\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`post\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`category\` (\`id\`, \`name\`) VALUES ('c1', 'Cat 1')`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`post\` (\`id\`, \`title\`) VALUES ('p1', 'Post 1')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`_CategoryToPost\``);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE \`_CategoryToPost\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_CategoryToPost\` VALUES ('c1', 'p1')`); // valid
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_CategoryToPost\` VALUES ('ghost_cat', 'p1')`); // orphan
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT * FROM \`_CategoryToPost\``);
        expect(rows.length).toBe(1);
        expect(rows[0].A).toBe("c1");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Boundary J2: Historical 040500 _PostToTag orphan deletion evidence", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260804050000_hardened_production_repair");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`post\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`tag\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`name\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`post\` (\`id\`, \`title\`) VALUES ('p1', 'Post 1')`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`tag\` (\`id\`, \`name\`) VALUES ('t1', 'Tag 1')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`_PostToTag\``);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE \`_PostToTag\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_PostToTag\` VALUES ('p1', 't1')`); // valid
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_PostToTag\` VALUES ('p1', 'ghost_tag')`); // orphan
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT * FROM \`_PostToTag\``);
        expect(rows.length).toBe(1);
        expect(rows[0].B).toBe("t1");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Boundary J3: Historical 040500 _RecipeToRecipeTag orphan deletion evidence", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260804050000_hardened_production_repair");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`user\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`email\` VARCHAR(191) NOT NULL UNIQUE, \`passwordHash\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`user\` (\`id\`, \`email\`, \`passwordHash\`) VALUES ('u1', 'chef@test.com', 'hash')`);

        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`recipe\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL,
            \`ingredients\` JSON NOT NULL, \`steps\` JSON NOT NULL,
            \`status\` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
            \`contributorId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipe\` (\`id\`, \`title\`, \`ingredients\`, \`steps\`, \`contributorId\`, \`updatedAt\`) VALUES ('r1', 'Salad', '[]', '[]', 'u1', NOW())`);

        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`recipetag\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`name\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipetag\` (\`id\`, \`name\`) VALUES ('t1', 'Vegan')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`_RecipeToRecipeTag\``);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE \`_RecipeToRecipeTag\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeTag\` VALUES ('r1', 't1')`); // valid
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeTag\` VALUES ('r1', 'tag_ghost_orphan')`); // orphan
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT * FROM \`_RecipeToRecipeTag\` ORDER BY B`);
        expect(rows.length).toBe(1);
        expect(rows[0].B).toBe("t1");
        expect(rows[0].A).toBe("r1");

        const recipeRows = await checkPrisma.$queryRawUnsafe(`SELECT id, title FROM \`recipe\` WHERE id = 'r1'`);
        expect(recipeRows.length).toBe(1);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Boundary J4: Historical 040500 _RecipeToRecipeAllergen orphan deletion evidence", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260804050000_hardened_production_repair");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`user\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`email\` VARCHAR(191) NOT NULL UNIQUE, \`passwordHash\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`user\` (\`id\`, \`email\`, \`passwordHash\`) VALUES ('u1', 'chef2@test.com', 'hash')`);

        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`recipe\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL,
            \`ingredients\` JSON NOT NULL, \`steps\` JSON NOT NULL,
            \`status\` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
            \`contributorId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipe\` (\`id\`, \`title\`, \`ingredients\`, \`steps\`, \`contributorId\`, \`updatedAt\`) VALUES ('r1', 'Salad', '[]', '[]', 'u1', NOW())`);

        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`recipeallergen\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`name\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipeallergen\` (\`id\`, \`name\`) VALUES ('a1', 'Nuts')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`_RecipeToRecipeAllergen\``);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE \`_RecipeToRecipeAllergen\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeAllergen\` VALUES ('r1', 'a1')`); // valid
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeAllergen\` VALUES ('r1', 'allergen_ghost_orphan')`); // orphan
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT * FROM \`_RecipeToRecipeAllergen\` ORDER BY B`);
        expect(rows.length).toBe(1);
        expect(rows[0].B).toBe("a1");
        expect(rows[0].A).toBe("r1");

        const recipeRows = await checkPrisma.$queryRawUnsafe(`SELECT id, title FROM \`recipe\` WHERE id = 'r1'`);
        expect(recipeRows.length).toBe(1);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Boundary H1: Historical 060900 comment.postId narrowing boundary evidence", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260806090000_repair_comment_system");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        /* DELIBERATELY CONSTRUCTED LEGACY FIXTURE DATA */
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`comment\``);
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`magazines\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`magazines\` (
            \`idMagazines\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`magazine_id\` VARCHAR(255) NOT NULL, \`magazine_title\` VARCHAR(255) NOT NULL,
            \`magazine_description\` TEXT NOT NULL, \`magazine_slug\` VARCHAR(191) NOT NULL,
            UNIQUE INDEX (\`magazine_slug\`)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`comment\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`content\` TEXT NOT NULL,
            \`postId\` VARCHAR(191) NOT NULL, \`authorName\` VARCHAR(191) NOT NULL DEFAULT 'Anon',
            \`authorEmail\` VARCHAR(191) NOT NULL DEFAULT 'anon@test.com', \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            \`siteId\` VARCHAR(191) NULL, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        const longPostId = "x".repeat(60);
        await dbPrisma.$executeRawUnsafe(
          `INSERT INTO \`comment\` (\`id\`, \`content\`, \`postId\`) VALUES (?, ?, ?)`,
          "c_historical_oversized", "Comment with oversized postId", longPostId
        );
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput.toLowerCase()).toMatch(/(foreign key|data truncated|out of range|too long|p3018)/);
    }, 60000);

    it("Boundary H2: Historical 060950 Linux case normalization behavior", async (ctx) => {
      await resetDisposableDb();

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      let lowerCaseSetting = 1;
      try {
        const settingRows = await dbPrisma.$queryRawUnsafe(`SHOW VARIABLES LIKE 'lower_case_table_names'`);
        if (settingRows && settingRows.length > 0) {
          lowerCaseSetting = Number(settingRows[0].Value);
        }
      } finally { await dbPrisma.$disconnect(); }

      if (lowerCaseSetting !== 0) {
        ctx.skip("Historical 060950 Linux casing verification: NOT RUN / SKIPPED - Reason: disposable MySQL lower_case_table_names != 0");
        return;
      }

      await setupPrismaMigrationsUpTo(testDbUrl, "20260806095000_ensure_categorytopost_and_posttotag_join_tables");
      const testPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await testPrisma.$executeRawUnsafe(`CREATE TABLE \`_categorytopost\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await testPrisma.$executeRawUnsafe(`INSERT INTO \`_categorytopost\` VALUES ('c_linux', 'p_linux')`);
      } finally { await testPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT * FROM \`_CategoryToPost\``);
        expect(rows.length).toBe(1);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);
  });


  describe("Group 3: Post-23 Forward Repair & Convergence Tests (Emulating Production State)", () => {

    it("Scenario M1: Magazine valid statuses ACTIVE/PUBLISHED/TRUE/1 → 1, DRAFT/INACTIVE/ARCHIVED/FALSE/0 → 0", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`magazines\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`magazines\` (
            \`idMagazines\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`magazine_id\` VARCHAR(255) NOT NULL, \`magazine_title\` VARCHAR(255) NOT NULL,
            \`magazine_description\` TEXT NOT NULL, \`magazine_tags\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_cover_image\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_link\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_date\` DATE NOT NULL DEFAULT '2024-01-01', \`magazine_category\` VARCHAR(255) NOT NULL DEFAULT '',
            \`MagCloudLink\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_slug\` VARCHAR(191) NOT NULL,
            \`status\` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            \`magazine_timestamp\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX (\`magazine_slug\`)
          ) ENGINE = InnoDB;
        `);

        const statuses = ['ACTIVE', 'PUBLISHED', 'TRUE', '1', 'DRAFT', 'INACTIVE', 'ARCHIVED', 'FALSE', '0'];
        for (let i = 0; i < statuses.length; i++) {
          await dbPrisma.$executeRawUnsafe(
            `INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`) VALUES (?, ?, ?, ?, ?)`,
            `mag_${i}`, `Magazine ${i}`, `Desc ${i}`, `slug-${i}`, statuses[i]
          );
        }
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT \`status\` FROM \`magazines\` ORDER BY \`idMagazines\``);
        const values = rows.map(r => Number(r.status));
        expect(values).toEqual([1, 1, 1, 1, 0, 0, 0, 0, 0]);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario M2: Magazine unknown status → deliberate abort marker assertion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`magazines\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`magazines\` (
            \`idMagazines\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`magazine_id\` VARCHAR(255) NOT NULL, \`magazine_title\` VARCHAR(255) NOT NULL,
            \`magazine_description\` TEXT NOT NULL, \`magazine_tags\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_cover_image\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_link\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_date\` DATE NOT NULL DEFAULT '2024-01-01', \`magazine_category\` VARCHAR(255) NOT NULL DEFAULT '',
            \`MagCloudLink\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_slug\` VARCHAR(191) NOT NULL,
            \`status\` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            \`magazine_timestamp\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX (\`magazine_slug\`)
          ) ENGINE = InnoDB;
        `);

        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`)
          VALUES ('mag_u1', 'Unknown Status Mag', 'Desc', 'unknown-slug', 'PENDING_REVIEW')
        `);
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput).toContain("20260806140000_production_safety_repair");
      expect(errOutput).toContain("_abort_magazines_status_has_unknown_values");

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT \`status\` FROM \`magazines\` WHERE \`magazine_slug\` = 'unknown-slug'`);
        expect(rows.length).toBe(1);
        expect(rows[0].status).toBe("PENDING_REVIEW");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario Q1: QuizType numeric VARCHAR IDs → safe INT conversion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`quiz_types\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`quiz_types\` (
            \`id\` VARCHAR(50) NOT NULL PRIMARY KEY, \`slug\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(200) NOT NULL, \`description\` TEXT NOT NULL, \`category\` VARCHAR(255) NOT NULL,
            \`difficulty\` VARCHAR(255) NOT NULL DEFAULT 'Beginner', \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
            \`sortOrder\` INT NOT NULL DEFAULT 0,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`quiz_types\` (\`id\`, \`slug\`, \`title\`, \`description\`, \`category\`)
          VALUES ('42', 'wellness', 'Wellness Quiz', 'A quiz', 'wellness')
        `);
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const typeInfo = await checkPrisma.$queryRawUnsafe(
          `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'id'`
        );
        expect(typeInfo[0].DATA_TYPE.toLowerCase()).toBe("int");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario Q2: QuizType non-numeric VARCHAR ID → deliberate abort marker assertion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`quiz_types\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`quiz_types\` (
            \`id\` VARCHAR(50) NOT NULL PRIMARY KEY, \`slug\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(200) NOT NULL, \`description\` TEXT NOT NULL, \`category\` VARCHAR(255) NOT NULL,
            \`difficulty\` VARCHAR(255) NOT NULL DEFAULT 'Beginner', \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
            \`sortOrder\` INT NOT NULL DEFAULT 0,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`quiz_types\` (\`id\`, \`slug\`, \`title\`, \`description\`, \`category\`)
          VALUES ('legacy-slug-id', 'general', 'General Quiz', 'Desc', 'general')
        `);
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput).toContain("20260806140000_production_safety_repair");
      expect(errOutput).toContain("_abort_quiz_types_id_has_non_numeric_values");

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT \`id\`, \`slug\` FROM quiz_types`);
        expect(rows.length).toBe(1);
        expect(rows[0].id).toBe("legacy-slug-id");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario J1: _CategoryToPost orphans → deliberate abort marker assertion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`category\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`name\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`category\` (\`id\`, \`name\`) VALUES ('cat_real', 'Real Category')`);

        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`post\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`post\` (\`id\`, \`title\`) VALUES ('post_real', 'Real Post')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`_CategoryToPost\``);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE \`_CategoryToPost\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_CategoryToPost\` VALUES ('cat_ghost', 'post_real')`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_CategoryToPost\` VALUES ('cat_real', 'post_real')`);
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput).toContain("20260806140000_production_safety_repair");
      expect(errOutput).toContain("_abort_categorytopost_has_orphaned_rows");

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT A, B FROM \`_CategoryToPost\` ORDER BY A`);
        expect(rows.length).toBe(2);
        expect(rows.map(r => r.A)).toContain("cat_ghost");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario J3: _RecipeToRecipeTag orphans → deliberate abort marker assertion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`user\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`email\` VARCHAR(191) NOT NULL UNIQUE, \`passwordHash\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`user\` (\`id\`, \`email\`, \`passwordHash\`) VALUES ('u1', 'chef@test.com', 'hash')`);

        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`recipe\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL,
            \`ingredients\` JSON NOT NULL, \`steps\` JSON NOT NULL,
            \`status\` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
            \`contributorId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipe\` (\`id\`, \`title\`, \`ingredients\`, \`steps\`, \`contributorId\`, \`updatedAt\`) VALUES ('r1', 'Salad', '[]', '[]', 'u1', NOW())`);

        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`recipetag\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`name\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipetag\` (\`id\`, \`name\`) VALUES ('t1', 'Vegan')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`_RecipeToRecipeTag\``);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE \`_RecipeToRecipeTag\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeTag\` VALUES ('r1', 'tag_ghost_orphan')`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeTag\` VALUES ('r1', 't1')`);
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput).toContain("20260806140000_production_safety_repair");
      expect(errOutput).toContain("_abort_recipetorecipetag_has_orphaned_rows");

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT A, B FROM \`_RecipeToRecipeTag\` ORDER BY B`);
        expect(rows.length).toBe(2);
        expect(rows.map(r => r.B)).toContain("tag_ghost_orphan");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario J4: _RecipeToRecipeAllergen orphans → deliberate abort marker assertion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`user\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`email\` VARCHAR(191) NOT NULL UNIQUE, \`passwordHash\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`user\` (\`id\`, \`email\`, \`passwordHash\`) VALUES ('u1', 'chef2@test.com', 'hash')`);

        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS \`recipe\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL,
            \`ingredients\` JSON NOT NULL, \`steps\` JSON NOT NULL,
            \`status\` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
            \`contributorId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipe\` (\`id\`, \`title\`, \`ingredients\`, \`steps\`, \`contributorId\`, \`updatedAt\`) VALUES ('r1', 'Salad', '[]', '[]', 'u1', NOW())`);

        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`recipeallergen\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`name\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipeallergen\` (\`id\`, \`name\`) VALUES ('a1', 'Nuts')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`_RecipeToRecipeAllergen\``);
        await dbPrisma.$executeRawUnsafe(`CREATE TABLE \`_RecipeToRecipeAllergen\` (\`A\` VARCHAR(50) NOT NULL, \`B\` VARCHAR(50) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeAllergen\` VALUES ('r1', 'allergen_ghost_orphan')`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`_RecipeToRecipeAllergen\` VALUES ('r1', 'a1')`);
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput).toContain("20260806140000_production_safety_repair");
      expect(errOutput).toContain("_abort_recipetorecipeallergen_has_orphaned_rows");

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT A, B FROM \`_RecipeToRecipeAllergen\` ORDER BY B`);
        expect(rows.length).toBe(2);
        expect(rows.map(r => r.B)).toContain("allergen_ghost_orphan");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario C1: Oversized comment.postId (>50 chars) → deliberate abort marker assertion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`comment\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`comment\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`content\` TEXT NOT NULL,
            \`postId\` VARCHAR(191) NULL, \`authorName\` VARCHAR(191) NOT NULL DEFAULT 'Anon',
            \`authorEmail\` VARCHAR(191) NOT NULL DEFAULT 'anon@test.com', \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            \`siteId\` VARCHAR(191) NULL, \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        const longPostId = "x".repeat(60);
        await dbPrisma.$executeRawUnsafe(
          `INSERT INTO \`comment\` (\`id\`, \`content\`, \`postId\`) VALUES (?, ?, ?)`,
          "comment_oversized_1", "A comment with oversized postId", longPostId
        );
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput).toContain("20260806140000_production_safety_repair");
      expect(errOutput).toContain("_abort_comment_postid_exceeds_50_chars");

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const rows = await checkPrisma.$queryRawUnsafe(`SELECT postId, CHAR_LENGTH(postId) as len FROM \`comment\` WHERE id = 'comment_oversized_1'`);
        expect(rows.length).toBe(1);
        expect(Number(rows[0].len)).toBe(60);
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario C2: Orphaned comment.magazineId → deliberate abort marker assertion", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`comment\``);
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`magazines\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`magazines\` (
            \`idMagazines\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, \`magazine_id\` VARCHAR(255) NOT NULL,
            \`magazine_title\` VARCHAR(255) NOT NULL, \`magazine_description\` TEXT NOT NULL,
            \`magazine_tags\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_cover_image\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_link\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_date\` DATE NOT NULL DEFAULT '2024-01-01',
            \`magazine_category\` VARCHAR(255) NOT NULL DEFAULT '', \`MagCloudLink\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_slug\` VARCHAR(191) NOT NULL, \`status\` INT NOT NULL DEFAULT 1,
            \`magazine_timestamp\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX (\`magazine_slug\`)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`) VALUES ('m1', 'Mag One', 'Desc', 'mag-one')`);

        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`comment\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`content\` TEXT NOT NULL,
            \`postId\` VARCHAR(50) NULL, \`magazineId\` INT NULL,
            \`authorName\` VARCHAR(191) NOT NULL DEFAULT 'Anon', \`authorEmail\` VARCHAR(191) NOT NULL DEFAULT 'anon@test.com',
            \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING', \`siteId\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`comment\` (\`id\`, \`content\`, \`magazineId\`) VALUES ('c_orphan_mag', 'Orphan mag comment', 9999)`);
      } finally { await dbPrisma.$disconnect(); }

      const errOutput = expectMigrateDeployFailure(testDbUrl);
      expect(errOutput).toContain("20260806140000_production_safety_repair");
      expect(errOutput).toContain("_abort_comment_magazineid_has_orphaned_values");
    }, 60000);

    it("Scenario C3: Lowercase magazines.idmagazines FK target → repaired to idMagazines", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`comment\``);
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`magazines\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`magazines\` (
            \`idmagazines\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`magazine_id\` VARCHAR(255) NOT NULL,
            \`magazine_title\` VARCHAR(255) NOT NULL,
            \`magazine_description\` TEXT NOT NULL,
            \`magazine_slug\` VARCHAR(191) NOT NULL,
            \`status\` INT NOT NULL DEFAULT 1,
            \`magazine_timestamp\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX (\`magazine_slug\`)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`) VALUES ('m1', 'Mag One', 'Desc', 'mag-one')`);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`comment\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
            \`content\` TEXT NOT NULL,
            \`magazineId\` INT NULL,
            \`authorName\` VARCHAR(191) NOT NULL DEFAULT 'Anon',
            \`authorEmail\` VARCHAR(191) NOT NULL DEFAULT 'anon@test.com',
            \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            \`siteId\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            INDEX \`Comment_magazineId_idx\` (\`magazineId\`),
            CONSTRAINT \`Comment_magazineId_fkey\` FOREIGN KEY (\`magazineId\`) REFERENCES \`magazines\`(\`idmagazines\`) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`comment\` (\`id\`, \`content\`, \`magazineId\`) VALUES ('c_mag', 'Magazine comment', 1)`);
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const lowerColumnRows = await checkPrisma.$queryRawUnsafe(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('magazines') AND BINARY(COLUMN_NAME) = BINARY('idmagazines')`
        );
        expect(lowerColumnRows.length).toBe(0);

        const exactColumnRows = await checkPrisma.$queryRawUnsafe(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('magazines') AND BINARY(COLUMN_NAME) = BINARY('idMagazines')`
        );
        expect(exactColumnRows.length).toBe(1);

        const fkRows = await checkPrisma.$queryRawUnsafe(
          `SELECT kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE, rc.UPDATE_RULE
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
           JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
             ON rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
           WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
             AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
             AND BINARY(kcu.COLUMN_NAME) = BINARY('magazineId')`
        );
        expect(fkRows.length).toBe(1);
        expect(fkRows[0].REFERENCED_COLUMN_NAME.toLowerCase()).toBe("idmagazines");
        expect(fkRows[0].DELETE_RULE).toBe("CASCADE");
        expect(fkRows[0].UPDATE_RULE).toBe("CASCADE");
      } finally { await checkPrisma.$disconnect(); }
    }, 60000);

    it("Scenario P1: Post-23 forward repair data preservation on populated database", async () => {
      await resetDisposableDb();
      await setupAllHistoricalMigrationsHistory(testDbUrl);

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`magazines\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`magazines\` (
            \`idMagazines\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY, \`magazine_id\` VARCHAR(255) NOT NULL,
            \`magazine_title\` VARCHAR(255) NOT NULL, \`magazine_description\` TEXT NOT NULL,
            \`magazine_tags\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_cover_image\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_link\` VARCHAR(255) NOT NULL DEFAULT '', \`magazine_date\` DATE NOT NULL DEFAULT '2024-01-01',
            \`magazine_category\` VARCHAR(255) NOT NULL DEFAULT '', \`MagCloudLink\` VARCHAR(255) NOT NULL DEFAULT '',
            \`magazine_slug\` VARCHAR(191) NOT NULL, \`status\` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
            \`magazine_timestamp\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX (\`magazine_slug\`)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`) VALUES ('mag_p1', 'Preservation Mag ACTIVE', 'Desc', 'pres-mag-active', 'ACTIVE')`);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`) VALUES ('mag_p2', 'Preservation Mag DRAFT', 'Desc', 'pres-mag-draft', 'DRAFT')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`quiz_types\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`quiz_types\` (
            \`id\` VARCHAR(50) NOT NULL PRIMARY KEY, \`slug\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(200) NOT NULL, \`description\` TEXT NOT NULL, \`category\` VARCHAR(255) NOT NULL,
            \`difficulty\` VARCHAR(255) NOT NULL DEFAULT 'Beginner', \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
            \`sortOrder\` INT NOT NULL DEFAULT 0,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ) ENGINE = InnoDB;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`quiz_types\` (\`id\`, \`slug\`, \`title\`, \`description\`, \`category\`) VALUES ('10', 'pres-quiz', 'Preserved Quiz Type', 'Desc', 'health')`);

        await dbPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`user\` (\`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`email\` VARCHAR(191) NOT NULL UNIQUE, \`passwordHash\` VARCHAR(191) NOT NULL) ENGINE = InnoDB;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`user\` (\`id\`, \`email\`, \`passwordHash\`) VALUES ('u_pres', 'pres@test.com', 'hash')`);

        await dbPrisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`Recipe\``);
        await dbPrisma.$executeRawUnsafe(`
          CREATE TABLE \`Recipe\` (
            \`id\` VARCHAR(191) NOT NULL PRIMARY KEY, \`title\` VARCHAR(191) NOT NULL,
            \`ingredients\` JSON NOT NULL, \`steps\` JSON NOT NULL,
            \`status\` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
            \`contributorId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), \`updatedAt\` DATETIME(3) NOT NULL
          ) ENGINE = MyISAM;
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT INTO \`Recipe\` (\`id\`, \`title\`, \`ingredients\`, \`steps\`, \`contributorId\`, \`updatedAt\`) VALUES ('r_pres', 'Preservation Pasta', '[]', '[]', 'u_pres', NOW())`);
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
      } finally { await dbPrisma.$disconnect(); }

      runMigrateDeploy(testDbUrl);

      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const magRows = await checkPrisma.$queryRawUnsafe(`SELECT magazine_slug, status FROM magazines ORDER BY idMagazines`);
        expect(magRows.length).toBe(2);
        expect(Number(magRows[0].status)).toBe(1);
        expect(Number(magRows[0].status)).not.toBeNaN();

        const qtRows = await checkPrisma.$queryRawUnsafe(`SELECT slug, title FROM quiz_types WHERE slug = 'pres-quiz'`);
        expect(qtRows.length).toBe(1);

        const recipeRows = await checkPrisma.$queryRawUnsafe(`SELECT id, title, contributorId FROM recipe WHERE id = 'r_pres'`);
        expect(recipeRows.length).toBe(1);

        const engineRows = await checkPrisma.$queryRawUnsafe(`SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe'`);
        expect(engineRows[0].ENGINE.toUpperCase()).toBe("INNODB");
      } finally { await checkPrisma.$disconnect(); }
    }, 90000);

    it("Scenario PROD17: Real production checkpoint 17 (20260805132000_alter_post_seodescription_text) → migrations 18-25 deploy path", async () => {
      await resetDisposableDb();
      await setupPrismaMigrationsUpTo(testDbUrl, "20260806090000_repair_comment_system");

      const dbPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 0;`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`user\` (\`id\`, \`email\`, \`passwordHash\`) VALUES ('u17', 'prod17@test.com', 'hash')`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`category\` (\`id\`, \`name\`) VALUES ('c17', 'Cat 17')`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`tag\` (\`id\`, \`name\`) VALUES ('t17', 'Tag 17')`);
        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`post\` (\`id\`, \`title\`, \`slug\`, \`content\`, \`seoDescription\`, \`status\`, \`authorId\`, \`createdAt\`, \`updatedAt\`)
          VALUES ('p17', 'Post 17', 'post-17', '{"type":"doc"}', 'SEO 17', 'PUBLISHED', 'u17', NOW(), NOW())
          ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`), \`updatedAt\` = NOW()
        `);
        await dbPrisma.$executeRawUnsafe(`UPDATE \`post\` SET \`updatedAt\` = NOW(), \`createdAt\` = NOW() WHERE CAST(\`updatedAt\` AS CHAR) LIKE '0000%' OR CAST(\`createdAt\` AS CHAR) LIKE '0000%'`);
        await dbPrisma.$executeRawUnsafe(`UPDATE \`category\` SET \`updatedAt\` = NOW(), \`createdAt\` = NOW() WHERE CAST(\`updatedAt\` AS CHAR) LIKE '0000%' OR CAST(\`createdAt\` AS CHAR) LIKE '0000%'`);
        await dbPrisma.$executeRawUnsafe(`UPDATE \`tag\` SET \`updatedAt\` = NOW(), \`createdAt\` = NOW() WHERE CAST(\`updatedAt\` AS CHAR) LIKE '0000%' OR CAST(\`createdAt\` AS CHAR) LIKE '0000%'`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`_CategoryToPost\` VALUES ('c17', 'p17')`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`_PostToTag\` VALUES ('p17', 't17')`);

        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`magazines\` (\`magazine_id\`, \`magazine_title\`, \`magazine_description\`, \`magazine_slug\`, \`status\`, \`magazine_timestamp\`)
          VALUES ('m17', 'Mag 17', 'Desc 17', 'mag-17', 1, NOW())
          ON DUPLICATE KEY UPDATE \`magazine_title\` = VALUES(\`magazine_title\`)
        `);
        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`comment\` (\`id\`, \`content\`, \`postId\`, \`authorName\`, \`authorEmail\`, \`status\`, \`createdAt\`, \`updatedAt\`)
          VALUES ('comm17', 'Comment 17', 'p17', 'Anon', 'anon@test.com', 'APPROVED', NOW(), NOW())
          ON DUPLICATE KEY UPDATE \`content\` = VALUES(\`content\`), \`updatedAt\` = NOW()
        `);
        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`quiz_types\` (\`id\`, \`slug\`, \`title\`, \`description\`, \`category\`, \`createdAt\`, \`updatedAt\`)
          VALUES (17, 'quiz-17', 'Quiz 17', 'Desc', 'health', NOW(), NOW())
          ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`), \`updatedAt\` = NOW()
        `);
        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO \`recipe\` (\`id\`, \`title\`, \`ingredients\`, \`steps\`, \`status\`, \`contributorId\`, \`createdAt\`, \`updatedAt\`)
          VALUES ('r17', 'Recipe 17', '[]', '[]', 'APPROVED', 'u17', NOW(), NOW())
          ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`), \`updatedAt\` = NOW()
        `);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`recipetag\` (\`id\`, \`name\`) VALUES ('rt17', 'Tag 17')`);
        await dbPrisma.$executeRawUnsafe(`INSERT IGNORE INTO \`_RecipeToRecipeTag\` VALUES ('r17', 'rt17')`);
        await dbPrisma.$executeRawUnsafe(`SET FOREIGN_KEY_CHECKS = 1;`);
      } finally { await dbPrisma.$disconnect(); }

      // Execute migrate deploy for 18-25
      const deployOutput = runMigrateDeploy(testDbUrl);
      expect(deployOutput).toContain("20260806140000_production_safety_repair");

      // Verify preservation
      const checkPrisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
      try {
        const posts = await checkPrisma.$queryRawUnsafe(`SELECT id, title, content FROM post WHERE id = 'p17'`);
        expect(posts.length).toBe(1);

        const comments = await checkPrisma.$queryRawUnsafe(`SELECT id, content FROM comment WHERE id = 'comm17'`);
        expect(comments.length).toBe(1);

        const mags = await checkPrisma.$queryRawUnsafe(`SELECT magazine_slug, status FROM magazines WHERE magazine_slug = 'mag-17'`);
        expect(Number(mags[0].status)).toBe(1);

        const quizes = await checkPrisma.$queryRawUnsafe(`SELECT id, slug FROM quiz_types WHERE slug = 'quiz-17'`);
        expect(Number(quizes[0].id)).toBe(17);

        const recipes = await checkPrisma.$queryRawUnsafe(`SELECT id, title FROM recipe WHERE id = 'r17'`);
        expect(recipes.length).toBe(1);
      } finally { await checkPrisma.$disconnect(); }
    }, 90000);
  });


  describe("Group 4: Persistent Production Database (ahpfinal) Audit", () => {
    const prodDbUrl = process.env.DATABASE_URL;
    const isAhpFinal = prodDbUrl && prodDbUrl.toLowerCase().includes("ahpfinal");

    (isAhpFinal ? it : it.skip)("audits persistent production schema and data integrity read-only", async () => {
      const prodPrisma = new PrismaClient({ datasources: { db: { url: prodDbUrl } } });
      try {
        // 1. Audit magazine status column type
        const magCol = await prodPrisma.$queryRawUnsafe(
          `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'status'`
        );
        expect(magCol.length).toBe(1);
        expect(magCol[0].DATA_TYPE.toLowerCase()).toBe("int");

        // 2. Audit QuizType id column type
        const qtCol = await prodPrisma.$queryRawUnsafe(
          `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'id'`
        );
        expect(qtCol.length).toBe(1);
        expect(qtCol[0].DATA_TYPE.toLowerCase()).toBe("int");

        // 3. Audit Recipe storage engine
        const recipeEngine = await prodPrisma.$queryRawUnsafe(
          `SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe'`
        );
        expect(recipeEngine[0].ENGINE.toUpperCase()).toBe("INNODB");

        // 4. Audit join table casing
        const pascals = ["_CategoryToPost", "_PostToTag", "_RecipeToRecipeTag", "_RecipeToRecipeAllergen"];
        for (const p of pascals) {
          const rows = await prodPrisma.$queryRawUnsafe(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?)`, p
          );
          expect(rows.length).toBeGreaterThan(0);
        }
      } finally { await prodPrisma.$disconnect(); }
    });
  });
}
