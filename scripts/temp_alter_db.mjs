/**
 * scripts/temp_alter_db.mjs — REMOVED
 *
 * This file was a temporary one-off script that:
 *   - Used PascalCase table names (Section, Page) which fail on Linux
 *   - Set templateVersion as INT while Prisma schema defines it as String
 *   - Caught ALL SQL errors and labeled them "already applied" (unsafe)
 *
 * Its valid logic has been absorbed into the Prisma migration:
 *   prisma/migrations/20260804000000_forward_repair/migration.sql
 *
 * That migration safely adds siteId/regionKey to section and
 * templateKey/templateVersion (as VARCHAR) to page, using INFORMATION_SCHEMA
 * guards and COLLATE utf8mb4_bin for precise case-sensitive table detection.
 *
 * Do NOT restore this file or run it against any database.
 */

console.error("ERROR: temp_alter_db.mjs has been superseded by the forward_repair migration.");
console.error("Run: npx prisma migrate deploy --schema=prisma/schema.prisma");
process.exit(1);
