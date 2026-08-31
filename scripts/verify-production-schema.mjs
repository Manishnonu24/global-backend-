#!/usr/bin/env node
/**
 * scripts/verify-production-schema.mjs
 *
 * Authoritative production schema & route query verifier.
 * Checks tables, physical columns, native column types, auto_increment attributes,
 * indexes, foreign keys, Prisma client delegates, and real route query groups.
 *
 * Exits 0 on clean success, 1 on any schema defect.
 * Never modifies database or outputs sensitive credentials/data.
 */

import mysql from "mysql2/promise";
import { prisma as prismaClient } from "../src/lib/prisma.js";

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

let conn;
const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error(`  ❌ ${msg}`);
}

function failRoute(route, model, detail) {
  const msg = `ADMIN_ROUTE_SCHEMA_FAILURE route=${route} model=${model} detail="${detail}"`;
  failures.push(msg);
  console.error(`  ❌ ${msg}`);
}

async function queryOne(sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows[0];
}

// ------------------------------------------------------------------
// 1. ALL physical tables represented by prisma/schema.prisma
// ------------------------------------------------------------------
const REQUIRED_TABLES = [
  "site", "user", "siteuser", "globalsettings", "page", "section", "post",
  "category", "tag", "media", "mediafolder", "service", "legalpage", "recipe",
  "redirect", "faq", "testimonial", "teammember", "lead", "contactformsubmission",
  "notificationalert", "systemerrorlog", "auditlog", "loginhistory", "passwordreset",
  "twofactor", "apikey", "ipblock", "newsletter", "contentversion",
  "webhooksubscription", "webhookevent", "visitorlog", "cookieconsentlog",
  "magazines", "quiz_types", "quizzes", "ip_quiz_analytic",
  "quiz_analytics", "recipetag", "recipeallergen", "reciperating", "recipelike",
  "recipecomment", "savedrecipe", "savedarticle", "importbatch", "importrecord",
  "frontendproject", "syncedroute", "integrationmanifest", "subscriber",
  "subscriberlist", "subscriberlistmember", "emailtemplate", "emailcampaign",
  "campaignlog", "emaillog", "pushnotification", "recentlyviewed", "comment", "adzone",
  "advertiser", "adcampaign", "ad", "adanalytic", "auth",
  "_CategoryToPost", "_PostToTag", "_RecipeToRecipeTag", "_RecipeToRecipeAllergen",
];

// ------------------------------------------------------------------
// 2. Physical column requirements: [table, column]
// ------------------------------------------------------------------
const REQUIRED_COLUMNS = [
  // site
  ["site", "id"], ["site", "name"], ["site", "integrationKey"], ["site", "isActive"],
  // user
  ["user", "id"], ["user", "email"], ["user", "passwordHash"], ["user", "globalRole"],
  // siteuser
  ["siteuser", "id"], ["siteuser", "siteId"], ["siteuser", "userId"], ["siteuser", "role"],
  // globalsettings
  ["globalsettings", "id"], ["globalsettings", "siteId"], ["globalsettings", "navigation"], ["globalsettings", "websiteSettings"],
  // page
  ["page", "id"], ["page", "siteId"], ["page", "title"], ["page", "slug"], ["page", "status"],
  ["page", "jsonLd"], ["page", "seoTitle"], ["page", "seoDescription"], ["page", "canonicalUrl"],
  ["page", "ogImage"], ["page", "deletedAt"], ["page", "templateKey"], ["page", "templateVersion"],
  // section
  ["section", "id"], ["section", "pageId"], ["section", "siteId"], ["section", "type"], ["section", "content"],
  // post
  ["post", "id"], ["post", "siteId"], ["post", "title"], ["post", "slug"], ["post", "seoTitle"],
  ["post", "seoDescription"], ["post", "canonicalUrl"], ["post", "ogImage"], ["post", "deletedAt"],
  // category
  ["category", "id"], ["category", "siteId"], ["category", "slug"], ["category", "deletedAt"],
  // tag
  ["tag", "id"], ["tag", "siteId"], ["tag", "slug"], ["tag", "deletedAt"],
  // service
  ["service", "id"], ["service", "siteId"], ["service", "title"], ["service", "price"],
  ["service", "visibility"], ["service", "sortOrder"], ["service", "status"], ["service", "deletedAt"],
  // legalpage
  ["legalpage", "id"], ["legalpage", "siteId"], ["legalpage", "type"], ["legalpage", "published"], ["legalpage", "deletedAt"],
  // recipe
  ["recipe", "id"], ["recipe", "siteId"], ["recipe", "title"], ["recipe", "status"],
  // emaillog
  ["emaillog", "id"], ["emaillog", "siteId"], ["emaillog", "category"], ["emaillog", "toEmail"],
  ["emaillog", "status"], ["emaillog", "createdAt"],
  // magazines (Physical database column names: status is physical status)
  ["magazines", "idMagazines"], ["magazines", "site_id"], ["magazines", "seo_title"],
  ["magazines", "seo_description"], ["magazines", "canonical_url"], ["magazines", "og_image"],
  ["magazines", "json_ld"], ["magazines", "publisher_socials"], ["magazines", "inside_issue"],
  ["magazines", "status"], ["magazines", "magazine_timestamp"], ["magazines", "magazine_slug"],
  // quiz_types
  ["quiz_types", "id"], ["quiz_types", "siteId"], ["quiz_types", "isActive"], ["quiz_types", "sortOrder"],
  ["quiz_types", "seoTitle"], ["quiz_types", "seoDescription"], ["quiz_types", "canonicalUrl"],
  ["quiz_types", "ogImage"], ["quiz_types", "jsonLd"],
  // implicit join tables
  ["_CategoryToPost", "A"], ["_CategoryToPost", "B"],
  ["_PostToTag", "A"], ["_PostToTag", "B"],
  ["_RecipeToRecipeTag", "A"], ["_RecipeToRecipeTag", "B"],
  ["_RecipeToRecipeAllergen", "A"], ["_RecipeToRecipeAllergen", "B"],
];

// ------------------------------------------------------------------
// 3. Native Data Type and Attribute Verifications
// ------------------------------------------------------------------
async function checkNativeDataTypes() {
  console.log("\n📋 Verifying native data types and column attributes...");

  const nativeTypeChecks = [
    { table: "magazines", column: "idMagazines", expectedType: "int", checkAutoIncrement: true },
    { table: "magazines", column: "status", expectedType: "int" },
    { table: "magazines", column: "magazine_timestamp", expectedType: "datetime" },
    { table: "quiz_types", column: "id", expectedType: "int", checkAutoIncrement: true },
    { table: "page", column: "templateVersion", expectedType: "varchar" },
    { table: "_CategoryToPost", column: "A", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
    { table: "_CategoryToPost", column: "B", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
    { table: "_PostToTag", column: "A", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
    { table: "_PostToTag", column: "B", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
    { table: "_RecipeToRecipeTag", column: "A", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
    { table: "_RecipeToRecipeTag", column: "B", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
    { table: "_RecipeToRecipeAllergen", column: "A", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
    { table: "_RecipeToRecipeAllergen", column: "B", expectedType: "varchar", expectedLength: 50, expectedNullable: "NO" },
  ];

  for (const c of nativeTypeChecks) {
    const row = await queryOne(
      `SELECT DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [c.table, c.column]
    );

    if (!row) {
      fail(`Native type check failed: missing column ${c.table}.${c.column}`);
      continue;
    }

    if (row.DATA_TYPE.toLowerCase() !== c.expectedType.toLowerCase()) {
      fail(`Native type mismatch for ${c.table}.${c.column}: expected ${c.expectedType}, got ${row.DATA_TYPE}`);
    }

    if (c.expectedLength !== undefined && row.CHARACTER_MAXIMUM_LENGTH !== c.expectedLength) {
      fail(`Length mismatch for ${c.table}.${c.column}: expected ${c.expectedLength}, got ${row.CHARACTER_MAXIMUM_LENGTH}`);
    }

    if (c.expectedNullable !== undefined && row.IS_NULLABLE !== c.expectedNullable) {
      fail(`Nullability mismatch for ${c.table}.${c.column}: expected IS_NULLABLE=${c.expectedNullable}, got ${row.IS_NULLABLE}`);
    }

    if (c.checkAutoIncrement && !row.EXTRA.includes("auto_increment")) {
      fail(`Column ${c.table}.${c.column} must have AUTO_INCREMENT attribute, got EXTRA="${row.EXTRA}"`);
    }
  }
}

async function checkTableCaseConflicts() {
  console.log("\n📋 Checking table casing and case conflict safety...");
  const pascalTables = [
    "Site", "User", "SiteUser", "GlobalSettings", "Page", "Section",
    "Post", "Category", "Tag", "Media", "MediaFolder", "Service",
    "LegalPage", "Recipe", "AuditLog", "LoginHistory", "TwoFactor",
    "PasswordReset", "FrontendProject", "SyncedRoute", "IntegrationManifest",
    "WebhookEvent", "WebhookSubscription", "Testimonial", "Faq", "TeamMember",
    "Redirect", "VisitorLog", "ContactFormSubmission", "Lead", "ApiKey", "IpBlock",
    "SystemErrorLog", "NotificationAlert", "Newsletter", "ContentVersion",
    "Subscriber", "SubscriberList", "SubscriberListMember", "EmailTemplate",
    "EmailCampaign", "PushNotification", "CookieConsentLog", "ImportBatch",
    "ImportRecord", "AdZone", "Advertiser", "AdCampaign", "Ad", "AdAnalytic",
    "RecentlyViewed", "Comment", "RecipeTag", "RecipeAllergen", "RecipeRating",
    "RecipeLike", "RecipeComment", "SavedRecipe", "SavedArticle", "CampaignLog",
    "EmailLog",
  ];

  for (const pascal of pascalTables) {
    const lower = pascal.toLowerCase();
    const [rows] = await conn.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = ?`,
      [pascal]
    );
    if (rows.length > 0) {
      const [lowerRows] = await conn.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = ?`,
        [lower]
      );
      if (lowerRows.length > 0) {
        fail(`TABLE CASE CONFLICT: both \`${pascal}\` and \`${lower}\` exist in the same database.`);
      } else {
        fail(`PascalCase table \`${pascal}\` exists but lowercase \`${lower}\` does not — normalization migration has not run.`);
      }
    }
  }
}

async function checkRequiredTables() {
  console.log("\n📋 Verifying all required physical tables...");
  for (const tbl of REQUIRED_TABLES) {
    const row = await queryOne(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tbl]
    );
    if (row.cnt === 0) {
      fail(`Missing table: \`${tbl}\``);
    }
  }
}

async function checkRequiredColumns() {
  console.log("\n📋 Verifying required columns...");
  for (const [tbl, col] of REQUIRED_COLUMNS) {
    const row = await queryOne(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tbl, col]
    );
    if (row.cnt === 0) {
      fail(`Column missing: ${tbl}.${col}`);
    }
  }
}

async function checkCommentSchema() {
  console.log("\n📋 Verifying comment table schema and FK constraints...");

  // ------------------------------------------------------------------
  // Column: comment.postId — must be VARCHAR(50) NULL
  // ------------------------------------------------------------------
  const postIdCol = await queryOne(
    `SELECT DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'comment'
       AND COLUMN_NAME  = 'postId'`
  );

  if (!postIdCol) {
    fail("comment.postId column is missing");
  } else {
    if (postIdCol.DATA_TYPE.toLowerCase() !== "varchar") {
      fail(`comment.postId DATA_TYPE must be varchar, got ${postIdCol.DATA_TYPE}`);
    }
    // CHARACTER_MAXIMUM_LENGTH may be a BigInt in node mysql2
    const postIdLen = Number(postIdCol.CHARACTER_MAXIMUM_LENGTH);
    if (postIdLen !== 50) {
      fail(`comment.postId length must be 50, got ${postIdLen} — VARCHAR(191) postId detected`);
    }
    if (postIdCol.IS_NULLABLE !== "YES") {
      fail(`comment.postId must be nullable (NULL), got IS_NULLABLE=${postIdCol.IS_NULLABLE}`);
    }
  }

  // ------------------------------------------------------------------
  // Column: comment.magazineId — must be INT NULL
  // ------------------------------------------------------------------
  const magIdCol = await queryOne(
    `SELECT DATA_TYPE, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'comment'
       AND COLUMN_NAME  = 'magazineId'`
  );

  if (!magIdCol) {
    fail("comment.magazineId column is missing");
  } else {
    if (magIdCol.DATA_TYPE.toLowerCase() !== "int") {
      fail(`comment.magazineId DATA_TYPE must be int, got ${magIdCol.DATA_TYPE}`);
    }
    if (magIdCol.IS_NULLABLE !== "YES") {
      fail(`comment.magazineId must be nullable (NULL), got IS_NULLABLE=${magIdCol.IS_NULLABLE}`);
    }
  }

  // ------------------------------------------------------------------
  // FK: Comment_postId_fkey — must be exactly:
  //   comment.postId -> post(id)  DELETE_RULE=CASCADE  UPDATE_RULE=CASCADE
  // Detect by column (not by name) to catch renamed/legacy FKs.
  // Also detect duplicate FKs on the same column.
  // ------------------------------------------------------------------
  const [postFkRows] = await conn.execute(
    `SELECT kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME,
            rc.DELETE_RULE, rc.UPDATE_RULE
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
     JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
       ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
      AND tc.TABLE_NAME      = kcu.TABLE_NAME
      AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
     JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
      AND rc.CONSTRAINT_NAME   = kcu.CONSTRAINT_NAME
     WHERE kcu.TABLE_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME   = 'comment'
       AND kcu.COLUMN_NAME  = 'postId'`
  );

  if (postFkRows.length === 0) {
    fail("comment.postId FK is missing — no foreign key constraint found on comment.postId");
  } else if (postFkRows.length > 1) {
    fail(`comment.postId has ${postFkRows.length} duplicate FK constraints — expected exactly 1`);
  } else {
    const fk = postFkRows[0];
    if (fk.REFERENCED_TABLE_NAME.toLowerCase() !== "post") {
      fail(`Comment_postId_fkey references wrong table: ${fk.REFERENCED_TABLE_NAME}, expected post`);
    }
    if (fk.REFERENCED_COLUMN_NAME !== "id") {
      fail(`Comment_postId_fkey references wrong column: ${fk.REFERENCED_COLUMN_NAME}, expected id`);
    }
    if (fk.DELETE_RULE !== "CASCADE") {
      fail(`Comment_postId_fkey DELETE_RULE must be CASCADE, got ${fk.DELETE_RULE} — SET NULL postId FK detected`);
    }
    if (fk.UPDATE_RULE !== "CASCADE") {
      fail(`Comment_postId_fkey UPDATE_RULE must be CASCADE, got ${fk.UPDATE_RULE}`);
    }
  }

  // ------------------------------------------------------------------
  // FK: Comment_magazineId_fkey — must be exactly:
  //   comment.magazineId -> magazines(idMagazines)  DELETE_RULE=CASCADE
  // ------------------------------------------------------------------
  const [magFkRows] = await conn.execute(
    `SELECT kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME,
            rc.DELETE_RULE, rc.UPDATE_RULE
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
     JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
       ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
      AND tc.TABLE_NAME      = kcu.TABLE_NAME
      AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
     JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
      AND rc.CONSTRAINT_NAME   = kcu.CONSTRAINT_NAME
     WHERE kcu.TABLE_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME   = 'comment'
       AND kcu.COLUMN_NAME  = 'magazineId'`
  );

  if (magFkRows.length === 0) {
    fail("comment.magazineId FK is missing — no foreign key constraint found on comment.magazineId");
  } else if (magFkRows.length > 1) {
    fail(`comment.magazineId has ${magFkRows.length} duplicate FK constraints — expected exactly 1`);
  } else {
    const fk = magFkRows[0];
    if (fk.REFERENCED_TABLE_NAME.toLowerCase() !== "magazines") {
      fail(`Comment_magazineId_fkey references wrong table: ${fk.REFERENCED_TABLE_NAME}, expected magazines`);
    }
    // MySQL column identifiers are case-insensitive and FK metadata may normalize casing.
    if (fk.REFERENCED_COLUMN_NAME.toLowerCase() !== "idmagazines") {
      fail(`Comment_magazineId_fkey references wrong column: ${fk.REFERENCED_COLUMN_NAME}, expected idMagazines (case-insensitive)`);
    }
    if (fk.DELETE_RULE !== "CASCADE") {
      fail(`Comment_magazineId_fkey DELETE_RULE must be CASCADE, got ${fk.DELETE_RULE} — wrong magazine FK detected`);
    }
    if (fk.UPDATE_RULE !== "CASCADE") {
      fail(`Comment_magazineId_fkey UPDATE_RULE must be CASCADE, got ${fk.UPDATE_RULE}`);
    }
  }

  // ------------------------------------------------------------------
  // Engine check: both comment and magazines must be InnoDB
  // (MyISAM tables cannot hold FK constraints)
  // ------------------------------------------------------------------
  const [engineRows] = await conn.execute(
    `SELECT TABLE_NAME, ENGINE FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('comment', 'magazines')`
  );
  for (const row of engineRows) {
    if (row.ENGINE.toUpperCase() !== "INNODB") {
      fail(`Table '${row.TABLE_NAME}' must use InnoDB engine for FK support, got ${row.ENGINE}`);
    }
  }
}

async function checkRecipeSchema() {
  console.log("\n📋 Verifying recipe tables, columns, indexes, engines, and FK constraints...");

  const recipeTables = [
    "recipe", "recipetag", "recipeallergen", "reciperating",
    "recipelike", "recipecomment", "savedrecipe",
    "_RecipeToRecipeTag", "_RecipeToRecipeAllergen"
  ];

  // 0. Verify no PascalCase / lowercase physical table conflicts
  const pascalPairs = ["Recipe", "RecipeTag", "RecipeAllergen", "RecipeComment", "RecipeLike", "RecipeRating", "SavedRecipe", "_RecipeToRecipeTag", "_RecipeToRecipeAllergen"];
  for (const pascal of pascalPairs) {
    const lower = pascal.toLowerCase();
    const [rows] = await conn.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME IN (?, ?)`,
      [pascal, lower]
    );
    if (rows.length > 1) {
      fail(`Case conflict detected: both '${pascal}' and '${lower}' physical tables exist in database.`);
    }
  }

  // 1. Verify storage engines (all must be InnoDB)
  const [engineRows] = await conn.execute(
    `SELECT TABLE_NAME, ENGINE FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) IN (${recipeTables.map(() => '?').join(',')})`,
    recipeTables
  );
  for (const row of engineRows) {
    if (row.ENGINE.toUpperCase() !== "INNODB") {
      fail(`Recipe table '${row.TABLE_NAME}' must use InnoDB engine, got ${row.ENGINE}`);
    }
  }

  // 2. Native column specs
  const columnSpecs = [
    { table: "recipe", col: "id", expectedType: "varchar", expectedLen: 50 },
    { table: "recipetag", col: "id", expectedType: "varchar", expectedLen: 50 },
    { table: "recipetag", col: "name", expectedType: "varchar", expectedLen: 140 },
    { table: "recipeallergen", col: "id", expectedType: "varchar", expectedLen: 50 },
    { table: "recipeallergen", col: "name", expectedType: "varchar", expectedLen: 140 },
    { table: "recipecomment", col: "recipeId", expectedType: "varchar", expectedLen: 50 },
    { table: "recipecomment", col: "userId", expectedType: "varchar", expectedLen: 191 },
    { table: "recipelike", col: "recipeId", expectedType: "varchar", expectedLen: 50 },
    { table: "recipelike", col: "userId", expectedType: "varchar", expectedLen: 191 },
    { table: "reciperating", col: "recipeId", expectedType: "varchar", expectedLen: 50 },
    { table: "reciperating", col: "userId", expectedType: "varchar", expectedLen: 191 },
    { table: "savedrecipe", col: "recipeId", expectedType: "varchar", expectedLen: 50 },
    { table: "savedrecipe", col: "userId", expectedType: "varchar", expectedLen: 191 },
    { table: "_RecipeToRecipeTag", col: "A", expectedType: "varchar", expectedLen: 50 },
    { table: "_RecipeToRecipeTag", col: "B", expectedType: "varchar", expectedLen: 50 },
    { table: "_RecipeToRecipeAllergen", col: "A", expectedType: "varchar", expectedLen: 50 },
    { table: "_RecipeToRecipeAllergen", col: "B", expectedType: "varchar", expectedLen: 50 },
  ];

  for (const spec of columnSpecs) {
    const colRow = await queryOne(
      `SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND COLUMN_NAME = ?`,
      [spec.table, spec.col]
    );

    if (!colRow) {
      fail(`Missing column ${spec.table}.${spec.col}`);
    } else {
      if (colRow.DATA_TYPE.toLowerCase() !== spec.expectedType) {
        fail(`Column type mismatch for ${spec.table}.${spec.col}: expected ${spec.expectedType}, got ${colRow.DATA_TYPE}`);
      }
      const charLen = Number(colRow.CHARACTER_MAXIMUM_LENGTH);
      if (spec.expectedLen && charLen !== spec.expectedLen) {
        fail(`Column length mismatch for ${spec.table}.${spec.col}: expected ${spec.expectedLen}, got ${charLen}`);
      }
    }
  }

  // 3. Index & Unique Constraint verification (All 20 Prisma-declared Recipe indexes)
  const allIndexSpecs = [
    { table: "recipe", index: "Recipe_contributorId_idx", columns: ["contributorId"], nonUnique: 1 },
    { table: "recipe", index: "Recipe_siteId_idx", columns: ["siteId"], nonUnique: 1 },
    { table: "recipe", index: "Recipe_status_idx", columns: ["status"], nonUnique: 1 },
    { table: "recipecomment", index: "RecipeComment_recipeId_fkey", columns: ["recipeId"], nonUnique: 1 },
    { table: "recipecomment", index: "RecipeComment_userId_fkey", columns: ["userId"], nonUnique: 1 },
    { table: "recipelike", index: "RecipeLike_recipeId_userId_key", columns: ["recipeId", "userId"], nonUnique: 0 },
    { table: "recipelike", index: "RecipeLike_recipeId_idx", columns: ["recipeId"], nonUnique: 1 },
    { table: "recipelike", index: "RecipeLike_userId_fkey", columns: ["userId"], nonUnique: 1 },
    { table: "reciperating", index: "RecipeRating_recipeId_userId_key", columns: ["recipeId", "userId"], nonUnique: 0 },
    { table: "reciperating", index: "RecipeRating_recipeId_idx", columns: ["recipeId"], nonUnique: 1 },
    { table: "reciperating", index: "RecipeRating_userId_fkey", columns: ["userId"], nonUnique: 1 },
    { table: "savedrecipe", index: "SavedRecipe_recipeId_userId_key", columns: ["recipeId", "userId"], nonUnique: 0 },
    { table: "savedrecipe", index: "SavedRecipe_recipeId_idx", columns: ["recipeId"], nonUnique: 1 },
    { table: "savedrecipe", index: "SavedRecipe_userId_fkey", columns: ["userId"], nonUnique: 1 },
    { table: "_RecipeToRecipeTag", index: "_RecipeToRecipeTag_AB_unique", columns: ["A", "B"], nonUnique: 0 },
    { table: "_RecipeToRecipeTag", index: "_RecipeToRecipeTag_B_index", columns: ["B"], nonUnique: 1 },
    { table: "_RecipeToRecipeAllergen", index: "_RecipeToRecipeAllergen_AB_unique", columns: ["A", "B"], nonUnique: 0 },
    { table: "_RecipeToRecipeAllergen", index: "_RecipeToRecipeAllergen_B_index", columns: ["B"], nonUnique: 1 },
    { table: "recipetag", index: "RecipeTag_name_key", columns: ["name"], nonUnique: 0 },
    { table: "recipeallergen", index: "RecipeAllergen_name_key", columns: ["name"], nonUnique: 0 },
  ];

  for (const idx of allIndexSpecs) {
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME, NON_UNIQUE
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND INDEX_NAME = ?
       ORDER BY SEQ_IN_INDEX`,
      [idx.table, idx.index]
    );

    if (rows.length === 0) {
      fail(`Missing required index \`${idx.index}\` on table \`${idx.table}\``);
    } else {
      const actualCols = rows.map(r => r.COLUMN_NAME);
      const actualNonUnique = Number(rows[0].NON_UNIQUE);

      if (actualNonUnique !== idx.nonUnique) {
        fail(`Index \`${idx.index}\` on table \`${idx.table}\` uniqueness mismatch: expected non_unique=${idx.nonUnique}, got ${actualNonUnique}`);
      }

      if (actualCols.length !== idx.columns.length || actualCols.some((col, i) => col !== idx.columns[i])) {
        fail(`Index \`${idx.index}\` on table \`${idx.table}\` column mismatch: expected [${idx.columns.join(", ")}], got [${actualCols.join(", ")}]`);
      }
    }
  }

  // 4. Foreign Keys verification
  const fkSpecs = [
    { table: "recipe", col: "contributorId", refTable: "user", refCol: "id", deleteRule: "RESTRICT" },
    { table: "recipecomment", col: "recipeId", refTable: "recipe", refCol: "id", deleteRule: "CASCADE" },
    { table: "recipecomment", col: "userId", refTable: "user", refCol: "id", deleteRule: "CASCADE" },
    { table: "recipelike", col: "recipeId", refTable: "recipe", refCol: "id", deleteRule: "CASCADE" },
    { table: "recipelike", col: "userId", refTable: "user", refCol: "id", deleteRule: "CASCADE" },
    { table: "reciperating", col: "recipeId", refTable: "recipe", refCol: "id", deleteRule: "CASCADE" },
    { table: "reciperating", col: "userId", refTable: "user", refCol: "id", deleteRule: "CASCADE" },
    { table: "savedrecipe", col: "recipeId", refTable: "recipe", refCol: "id", deleteRule: "CASCADE" },
    { table: "savedrecipe", col: "userId", refTable: "user", refCol: "id", deleteRule: "CASCADE" },
    { table: "_RecipeToRecipeTag", col: "A", refTable: "recipe", refCol: "id", deleteRule: "CASCADE" },
    { table: "_RecipeToRecipeTag", col: "B", refTable: "recipetag", refCol: "id", deleteRule: "CASCADE" },
    { table: "_RecipeToRecipeAllergen", col: "A", refTable: "recipe", refCol: "id", deleteRule: "CASCADE" },
    { table: "_RecipeToRecipeAllergen", col: "B", refTable: "recipeallergen", refCol: "id", deleteRule: "CASCADE" },
  ];

  for (const fk of fkSpecs) {
    const [rows] = await conn.execute(
      `SELECT kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME,
              rc.DELETE_RULE, rc.UPDATE_RULE
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
         ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
        AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
       JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
         ON rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
       WHERE kcu.TABLE_SCHEMA = DATABASE()
         AND LOWER(kcu.TABLE_NAME) = LOWER(?)
         AND kcu.COLUMN_NAME = ?`,
      [fk.table, fk.col]
    );

    if (rows.length === 0) {
      fail(`Missing foreign key constraint on ${fk.table}.${fk.col}`);
    } else if (rows.length > 1) {
      fail(`Duplicate foreign key constraints on ${fk.table}.${fk.col} (found ${rows.length})`);
    } else {
      const row = rows[0];
      if (row.REFERENCED_TABLE_NAME.toLowerCase() !== fk.refTable.toLowerCase()) {
        fail(`FK on ${fk.table}.${fk.col} references wrong table: ${row.REFERENCED_TABLE_NAME}, expected ${fk.refTable}`);
      }
      if (row.REFERENCED_COLUMN_NAME !== fk.refCol) {
        fail(`FK on ${fk.table}.${fk.col} references wrong column: ${row.REFERENCED_COLUMN_NAME}, expected ${fk.refCol}`);
      }
      if (row.DELETE_RULE.toUpperCase() !== fk.deleteRule) {
        fail(`FK on ${fk.table}.${fk.col} DELETE_RULE must be ${fk.deleteRule}, got ${row.DELETE_RULE}`);
      }
      if (row.UPDATE_RULE.toUpperCase() !== "CASCADE") {
        fail(`FK on ${fk.table}.${fk.col} UPDATE_RULE must be CASCADE, got ${row.UPDATE_RULE}`);
      }
    }
  }
}

async function checkJoinTablesAndForeignKeys() {
  console.log("\n📋 Verifying relation join tables and foreign key constraints...");
  const joinTables = [
    {
      table: "_CategoryToPost",
      fks: [
        { constraint: "_CategoryToPost_A_fkey", col: "A", refTables: ["category"], refCol: "id" },
        { constraint: "_CategoryToPost_B_fkey", col: "B", refTables: ["post"], refCol: "id" },
      ],
    },
    {
      table: "_PostToTag",
      fks: [
        { constraint: "_PostToTag_A_fkey", col: "A", refTables: ["post"], refCol: "id" },
        { constraint: "_PostToTag_B_fkey", col: "B", refTables: ["tag"], refCol: "id" },
      ],
    },
    {
      table: "_RecipeToRecipeTag",
      fks: [
        { constraint: "_RecipeToRecipeTag_A_fkey", col: "A", refTables: ["recipe"], refCol: "id" },
        { constraint: "_RecipeToRecipeTag_B_fkey", col: "B", refTables: ["recipetag"], refCol: "id" },
      ],
    },
    {
      table: "_RecipeToRecipeAllergen",
      fks: [
        { constraint: "_RecipeToRecipeAllergen_A_fkey", col: "A", refTables: ["recipe"], refCol: "id" },
        { constraint: "_RecipeToRecipeAllergen_B_fkey", col: "B", refTables: ["recipeallergen"], refCol: "id" },
      ],
    },
  ];

  for (const jt of joinTables) {
    for (const fk of jt.fks) {
      const fkRow = await queryOne(
        `SELECT REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = LOWER(?) AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [jt.table, fk.col]
      );
      if (!fkRow) {
        fail(`Missing foreign key constraint: ${fk.constraint} on ${jt.table}.${fk.col}`);
      } else {
        const refMatch = fk.refTables.some(
          (rt) => rt.toLowerCase() === fkRow.REFERENCED_TABLE_NAME.toLowerCase()
        );
        if (!refMatch || fkRow.REFERENCED_COLUMN_NAME !== fk.refCol) {
          fail(`Foreign key ${fk.constraint} references ${fkRow.REFERENCED_TABLE_NAME}.${fkRow.REFERENCED_COLUMN_NAME}, expected ${fk.refTables.join("/")}.${fk.refCol}`);
        }
      }
    }
  }
}

async function runRouteSmokeQueries() {
  console.log("\n📋 Running Global Backend route query groups...");

  // 1. Pages Manager (/dashboard/pages)
  console.log("\n  🔹 [Pages Manager] /dashboard/pages");
  try {
    await prismaClient.page.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 1,
    });
    await prismaClient.globalsettings.findFirst({ select: { id: true, siteId: true, websiteSettings: true } });
    await prismaClient.section.findMany({ take: 1 });
    console.log("     ✅ Pages Manager queries succeeded.");
  } catch (err) {
    failRoute("/dashboard/pages", "page/globalsettings/section", err.message);
  }

  // 2. Blogs Manager (/dashboard/blogs)
  console.log("\n  🔹 [Blogs Manager] /dashboard/blogs");
  try {
    await prismaClient.post.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        author: { select: { id: true, email: true, name: true } },
        categories: true,
        tags: true,
        featuredImage: true,
      },
    });
    await prismaClient.category.count();
    await prismaClient.tag.count();
    console.log("     ✅ Blogs Manager queries succeeded.");
  } catch (err) {
    failRoute("/dashboard/blogs", "post/category/tag", err.message);
  }

  // 3. Services Manager (/dashboard/services)
  console.log("\n  🔹 [Services Manager] /dashboard/services");
  try {
    await prismaClient.service.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      take: 1,
      select: {
        id: true, siteId: true, title: true, description: true, price: true,
        ctaButtonText: true, ctaButtonLink: true, sortOrder: true, status: true,
        visibility: true, slug: true, accessToken: true, faqs: true, visible: true,
        featuredImageId: true, createdAt: true, updatedAt: true, deletedAt: true,
        seoTitle: true, seoDescription: true, canonicalUrl: true, ogImage: true, jsonLd: true,
      },
    });
    console.log("     ✅ Services Manager query succeeded.");
  } catch (err) {
    failRoute("/dashboard/services", "service", err.message);
  }

  // 4. Magazines Manager (/dashboard/magazines)
  console.log("\n  🔹 [Magazines Manager] /dashboard/magazines");
  try {
    await prismaClient.magazine.findMany({
      where: { status: 1 },
      orderBy: { timestamp: "desc" },
      take: 1,
      select: {
        id: true, siteId: true, status: true, timestamp: true, slug: true, title: true,
        seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true,
        publisherSocials: true, insideIssue: true,
      },
    });
    console.log("     ✅ Magazines Manager query succeeded.");
  } catch (err) {
    failRoute("/dashboard/magazines", "Magazine", err.message);
  }

  // 5. Legal Pages Manager (/dashboard/legal)
  console.log("\n  🔹 [Legal Pages Manager] /dashboard/legal");
  try {
    await prismaClient.legalPage.findMany({
      where: { deletedAt: null },
      orderBy: { lastUpdated: "desc" },
      take: 1,
      select: {
        id: true, siteId: true, title: true, type: true, published: true, deletedAt: true,
        seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true, updatedAt: true,
      },
    });
    console.log("     ✅ Legal Pages Manager query succeeded.");
  } catch (err) {
    failRoute("/dashboard/legal", "legalpage", err.message);
  }

  // 6. SEO Manager (/dashboard/seo) - Independent model execution
  console.log("\n  🔹 [SEO Manager] /dashboard/seo");

  try {
    await prismaClient.page.findMany({ take: 1, select: { id: true, siteId: true, title: true, slug: true, seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true, updatedAt: true } });
    console.log("     ✅ SEO: page — ok");
  } catch (err) {
    failRoute("/dashboard/seo", "page", err.message);
  }

  try {
    await prismaClient.post.findMany({ take: 1, select: { id: true, siteId: true, title: true, slug: true, seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true, updatedAt: true } });
    console.log("     ✅ SEO: post — ok");
  } catch (err) {
    failRoute("/dashboard/seo", "post", err.message);
  }

  try {
    await prismaClient.service.findMany({ take: 1, select: { id: true, siteId: true, title: true, slug: true, visibility: true, seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true, updatedAt: true } });
    console.log("     ✅ SEO: service — ok");
  } catch (err) {
    failRoute("/dashboard/seo", "service", err.message);
  }

  try {
    await prismaClient.magazine.findMany({ take: 1, select: { id: true, siteId: true, status: true, timestamp: true, slug: true, title: true, seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true, publisherSocials: true, insideIssue: true } });
    console.log("     ✅ SEO: Magazine — ok");
  } catch (err) {
    failRoute("/dashboard/seo", "Magazine", err.message);
  }

  try {
    await prismaClient.quizType.findMany({ take: 1, select: { id: true, siteId: true, isActive: true, sortOrder: true, updatedAt: true, title: true, slug: true, seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true } });
    console.log("     ✅ SEO: QuizType — ok");
  } catch (err) {
    failRoute("/dashboard/seo", "QuizType", err.message);
  }

  try {
    await prismaClient.recipe.findMany({ take: 1, select: { id: true, siteId: true, title: true, status: true, seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true, updatedAt: true } });
    console.log("     ✅ SEO: recipe — ok");
  } catch (err) {
    failRoute("/dashboard/seo", "recipe", err.message);
  }

  try {
    await prismaClient.legalPage.findMany({ take: 1, select: { id: true, siteId: true, title: true, type: true, published: true, deletedAt: true, seoTitle: true, seoDescription: true, ogImage: true, canonicalUrl: true, jsonLd: true, updatedAt: true } });
    console.log("     ✅ SEO: legalpage — ok");
  } catch (err) {
    failRoute("/dashboard/seo", "legalpage", err.message);
  }

  // 7. Email Logs (/crm/email-logs)
  console.log("\n  🔹 [Email Logs] /crm/email-logs");
  try {
    await prismaClient.emailLog.findMany({
      take: 1,
      select: {
        id: true,
        siteId: true,
        category: true,
        triggerKey: true,
        toEmail: true,
        status: true,
        createdAt: true,
      },
    });
    await prismaClient.emailLog.count();
    console.log("     ✅ Email Logs query succeeded.");
  } catch (err) {
    failRoute("/crm/email-logs", "emaillog", err.message);
  }
}

async function main() {
  console.log("🔍 AHP Production Schema Verifier");
  console.log("   Read-only verification of physical schema & route queries.\n");

  try {
    conn = await mysql.createConnection(parseDbUrl(DB_URL));
  } catch (err) {
    console.error(`❌ Database connection failed: ${err.message}`);
    process.exit(1);
  }

  const recipeOnly = process.argv.includes("--recipe-only") || process.env.RECIPE_ONLY === "true";

  try {
    await checkTableCaseConflicts();
    if (!recipeOnly) {
      await checkRequiredTables();
      await checkRequiredColumns();
      await checkNativeDataTypes();
      await checkCommentSchema();
    }
    await checkRecipeSchema();
    if (!recipeOnly) {
      await checkJoinTablesAndForeignKeys();
      await runRouteSmokeQueries();
    }
  } finally {
    await conn.end().catch(() => {});
    await prismaClient.$disconnect().catch(() => {});
  }

  if (failures.length > 0) {
    console.error(`\n❌ Schema Verification Failed. Missing elements:`);
    for (const f of failures) {
      console.error(`  - ${f}`);
    }
    process.exit(1);
  }

  console.log("\n✅ Schema verification passed — all physical tables, columns, native types, join tables, and route query groups are valid.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Verifier crashed unexpectedly:", err.message);
  process.exit(1);
});
