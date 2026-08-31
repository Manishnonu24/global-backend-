-- =============================================================================
-- Migration: 20260806110000_normalize_comment_foreign_keys
-- Purpose:   Idempotently normalise comment FK constraints so ALL databases
--            converge to exactly:
--
--              comment.postId     -> post(id)            ON DELETE CASCADE
--              comment.magazineId -> magazines(idMagazines) ON DELETE CASCADE
--
--            regardless of prior migration history (clean DB, VARCHAR(191) DB,
--            SET NULL DB, or already-correct DB).
--
-- Safety rules
-- * Never drops the comment table, truncates rows, or modifies data.
-- * Checks for orphaned FKs (dangling postId / magazineId) before applying.
-- * Aborts with a deliberate error if orphaned data exists.
-- * All steps are guarded by INFORMATION_SCHEMA queries; safe to re-run.
-- * Works under MySQL 8 and MariaDB >= 10.4.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1:  Verify comment.postId is VARCHAR(50) NULL
--             (should already be correct after the previous migration, but we
--             guard here so this migration also handles a completely fresh DB
--             where only the initial Prisma migration has run)
-- ---------------------------------------------------------------------------

-- 1a. Detect current postId definition
SET @postid_type := (
  SELECT DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('postId')
  LIMIT 1
);

SET @postid_len := (
  SELECT CHARACTER_MAXIMUM_LENGTH
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('postId')
  LIMIT 1
);

SET @postid_nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('postId')
  LIMIT 1
);

-- Column must be: varchar, length <= 50, nullable
SET @postid_needs_fix := IF(
  @postid_type IS NOT NULL AND (
    BINARY(LOWER(@postid_type)) != BINARY('varchar')
    OR COALESCE(@postid_len, 0) != 50
    OR BINARY(@postid_nullable) = BINARY('NO')
  ),
  1, 0
);

-- 1b. Abort if fixing would truncate data
SET @oversized_postids := IF(@postid_needs_fix = 1, (
  SELECT COUNT(*) FROM `comment` WHERE postId IS NOT NULL AND CHAR_LENGTH(postId) > 50
), 0);

SET @abort_postid := IF(
  @oversized_postids > 0,
  'ALTER TABLE `_migration_abort_postId_oversized_data_exists` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_postid;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1c. Drop any existing FK on postId before column modification (required in MySQL)
SET @postid_fk_to_drop := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('postId')
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @sql := IF(
  @postid_needs_fix = 1 AND @postid_fk_to_drop IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @postid_fk_to_drop, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @postid_fk_to_drop := NULL;   -- cleared after conditional drop

-- 1d. Fix column definition
SET @sql := IF(
  @postid_needs_fix = 1,
  'ALTER TABLE `comment` MODIFY `postId` VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- SECTION 2:  Normalise comment.postId FK -> post(id) ON DELETE CASCADE
--
--  Logic:
--    A.  Identify ANY existing FK on comment.postId (regardless of name).
--    B.  If it exists, read its DELETE_RULE.
--    C.  If DELETE_RULE != CASCADE → drop it, recreate with CASCADE.
--    D.  If it does not exist at all → create it (after orphan check).
--    E.  If already CASCADE → no-op.
-- ---------------------------------------------------------------------------

-- 2a. Find the constraint name of any FK on comment.postId (by column, not name)
SET @post_fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('postId')
    AND BINARY(LOWER(kcu.REFERENCED_TABLE_NAME)) = BINARY('post')
    AND BINARY(kcu.REFERENCED_COLUMN_NAME) = BINARY('id')
  LIMIT 1
);

-- 2b. Read its DELETE_RULE (NULL if FK doesn't exist)
SET @post_fk_delete_rule := (
  SELECT rc.DELETE_RULE
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
  WHERE BINARY(rc.CONSTRAINT_SCHEMA) = BINARY(DATABASE())
    AND rc.CONSTRAINT_NAME   = @post_fk_name
  LIMIT 1
);

-- 2c. Detect whether the FK is wrong (wrong rule, wrong table, any other FK on the column)
--     Also detect any FK on postId that does NOT point to post(id) — we must drop those too
SET @wrong_postid_fk := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('postId')
    AND (
      BINARY(LOWER(COALESCE(kcu.REFERENCED_TABLE_NAME, ''))) != BINARY('post')
      OR BINARY(kcu.REFERENCED_COLUMN_NAME) != BINARY('id')
    )
  LIMIT 1
);

-- Drop any FK on postId pointing to the wrong table/column
SET @sql := IF(
  @wrong_postid_fk IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @wrong_postid_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2d. Decide: does the correct FK need to be dropped and recreated?
--     TRUE  if: FK exists with wrong DELETE_RULE (i.e. != 'CASCADE')
SET @post_fk_needs_recreate := IF(
  @post_fk_name IS NOT NULL AND BINARY(UPPER(COALESCE(@post_fk_delete_rule, ''))) != BINARY('CASCADE'),
  1, 0
);

-- Drop the incorrect-rule FK
SET @sql := IF(
  @post_fk_needs_recreate = 1,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @post_fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2e. Check for orphaned postId values before creating/recreating FK
--     An orphan is a non-null postId that has no matching post.id
SET @orphaned_postids := (
  SELECT COUNT(*)
  FROM `comment` c
  WHERE c.postId IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM `post` p WHERE p.id = c.postId)
);

-- Abort if orphaned data exists (fail with a clear error)
SET @abort_orphan_post := IF(
  @orphaned_postids > 0 AND (
    @post_fk_name IS NULL           -- FK was absent
    OR @post_fk_needs_recreate = 1  -- FK was wrong and just dropped
  ),
  'ALTER TABLE `_migration_abort_comment_has_orphaned_postId_rows` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_orphan_post;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2f. Determine if we need to create the FK
--     Create when: FK was absent to begin with, OR was just dropped for repair
SET @post_fk_final_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('postId')
    AND BINARY(LOWER(kcu.REFERENCED_TABLE_NAME)) = BINARY('post')
  LIMIT 1
);

SET @post_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('post')
);

SET @sql := IF(
  @post_fk_final_name IS NULL AND @post_table_exists > 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- SECTION 3:  Normalise comment.magazineId FK -> magazines(idMagazines) ON DELETE CASCADE
--
--  Same logic as Section 2, applied to magazineId.
-- ---------------------------------------------------------------------------

-- 3a. Ensure magazineId column exists and is INT NULL
SET @magid_type := (
  SELECT DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

SET @magid_nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

-- Add column if completely missing
SET @sql := IF(
  @magid_type IS NULL,
  'ALTER TABLE `comment` ADD COLUMN `magazineId` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Re-read after potential ADD
SET @magid_type := (
  SELECT DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);
SET @magid_nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

SET @magid_needs_fix := IF(
  BINARY(LOWER(@magid_type)) != BINARY('int') OR BINARY(@magid_nullable) = BINARY('NO'),
  1, 0
);

-- 3b. Drop existing FK on magazineId before any column modification
SET @magid_fk_to_drop := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('magazineId')
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);

SET @sql := IF(
  @magid_needs_fix = 1 AND @magid_fk_to_drop IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @magid_fk_to_drop, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3c. Fix column type
SET @sql := IF(
  @magid_needs_fix = 1,
  'ALTER TABLE `comment` MODIFY `magazineId` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3d. Ensure magazineId index
SET @magid_idx := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(INDEX_NAME) = BINARY('Comment_magazineId_idx')
);
SET @sql := IF(
  @magid_idx = 0,
  'CREATE INDEX `Comment_magazineId_idx` ON `comment`(`magazineId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3e. Find any wrong FK on magazineId (wrong referenced table/column)
SET @wrong_magid_fk := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('magazineId')
    AND (
      BINARY(LOWER(COALESCE(kcu.REFERENCED_TABLE_NAME, ''))) != BINARY('magazines')
      OR BINARY(kcu.REFERENCED_COLUMN_NAME) != BINARY('idMagazines')
    )
  LIMIT 1
);

SET @sql := IF(
  @wrong_magid_fk IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @wrong_magid_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3f. Find the correct FK on magazineId (if any)
SET @mag_fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('magazineId')
    AND BINARY(LOWER(kcu.REFERENCED_TABLE_NAME)) = BINARY('magazines')
    AND BINARY(kcu.REFERENCED_COLUMN_NAME) = BINARY('idMagazines')
  LIMIT 1
);

-- 3g. Read its DELETE_RULE
SET @mag_fk_delete_rule := (
  SELECT rc.DELETE_RULE
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
  WHERE BINARY(rc.CONSTRAINT_SCHEMA) = BINARY(DATABASE())
    AND rc.CONSTRAINT_NAME   = @mag_fk_name
  LIMIT 1
);

SET @mag_fk_needs_recreate := IF(
  @mag_fk_name IS NOT NULL AND BINARY(UPPER(COALESCE(@mag_fk_delete_rule, ''))) != BINARY('CASCADE'),
  1, 0
);

-- Drop the incorrect-rule Magazine FK
SET @sql := IF(
  @mag_fk_needs_recreate = 1,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @mag_fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3h. Orphan check for magazineId
SET @magazines_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('magazines')
);

SET @orphaned_magids := IF(@magazines_table_exists > 0, (
  SELECT COUNT(*)
  FROM `comment` c
  WHERE c.magazineId IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM `magazines` m WHERE m.idMagazines = c.magazineId)
), 0);

SET @abort_orphan_mag := IF(
  @orphaned_magids > 0 AND (
    @mag_fk_name IS NULL
    OR @mag_fk_needs_recreate = 1
  ),
  'ALTER TABLE `_migration_abort_comment_has_orphaned_magazineId_rows` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_orphan_mag;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3i. Create or recreate the Magazine FK
SET @mag_fk_final_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA    = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME      = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('magazineId')
    AND BINARY(LOWER(kcu.REFERENCED_TABLE_NAME)) = BINARY('magazines')
    AND BINARY(kcu.REFERENCED_COLUMN_NAME) = BINARY('idMagazines')
  LIMIT 1
);

SET @sql := IF(
  @mag_fk_final_name IS NULL AND @magazines_table_exists > 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_magazineId_fkey` FOREIGN KEY (`magazineId`) REFERENCES `magazines`(`idMagazines`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- END OF MIGRATION
-- Final state on all supported starting DB states:
--
--   comment.postId     VARCHAR(50) NULL -> post(id)            ON DELETE CASCADE
--   comment.magazineId INT NULL         -> magazines(idMagazines) ON DELETE CASCADE
-- =============================================================================
