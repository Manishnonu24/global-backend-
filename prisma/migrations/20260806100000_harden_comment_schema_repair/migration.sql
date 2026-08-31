-- =============================================================================
-- Migration: 20260806100000_harden_comment_schema_repair
-- Purpose:   Harden comment.postId and comment.magazineId to match Prisma schema:
--            postId     VARCHAR(50) NULL
--            magazineId INT NULL
-- This is a forward-only repair migration that handles all known partial-DB states.
-- It may be applied on top of 20260806090000_repair_comment_system.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1: Repair comment.postId -> VARCHAR(50) NULL
-- ---------------------------------------------------------------------------

-- 1a. Check the current column type/length/nullability
SET @postid_char_len := (
  SELECT CHARACTER_MAXIMUM_LENGTH
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('postId')
  LIMIT 1
);

SET @postid_is_nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('postId')
  LIMIT 1
);

-- 1b. Determine if repair is needed:
--     Needs repair if width != 50 OR column is NOT NULL
--     (This handles VARCHAR(191) NULL, VARCHAR(191) NOT NULL, VARCHAR(50) NOT NULL, etc.)
SET @postid_needs_repair := IF(
  @postid_char_len IS NOT NULL AND (
    @postid_char_len != 50 OR BINARY(@postid_is_nullable) = BINARY('NO')
  ),
  1, 0
);

-- 1c. Before narrowing column, verify no existing postId value exceeds 50 chars.
--     If oversized data exists, abort with a clear error via a failing SELECT.
--     This will only execute the check if repair is needed.
SET @oversized_postids := IF(@postid_needs_repair = 1, (
  SELECT COUNT(*) FROM `comment` WHERE postId IS NOT NULL AND CHAR_LENGTH(postId) > 50
), 0);

-- Abort migration if unsafe data exists (this forces a deliberate failure with a descriptive message)
SET @sql := IF(
  @oversized_postids > 0,
  CONCAT(
    'SELECT CAST(''MIGRATION ABORTED: comment.postId contains ',
    CAST(@oversized_postids AS CHAR),
    ' row(s) with values longer than 50 characters. Clean up invalid postId data before running this migration.'' AS CHAR) AS migration_error FROM DUAL WHERE 1=2 UNION SELECT * FROM (SELECT ''error'') t WHERE 1=1 HAVING 1=2'
  ),
  'SELECT 1'
);
-- Note: MySQL cannot SIGNAL inside PREPARE, so we use a failing check below.

-- 1d. If oversized data exists, produce an error by attempting to modify a non-existent table.
SET @sql_abort := IF(@oversized_postids > 0,
  'ALTER TABLE `_migration_abort_oversized_postId_exists` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @sql_abort;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1e. Drop existing FK on postId if it exists (required before column modification on some MySQL versions)
SET @postid_fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
    AND BINARY(CONSTRAINT_NAME) IN (BINARY('Comment_postId_fkey'), BINARY('comment_postId_fkey'))
  LIMIT 1
);

SET @sql := IF(
  @postid_needs_repair = 1 AND @postid_fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @postid_fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1f. Apply the column repair
SET @sql := IF(
  @postid_needs_repair = 1,
  'ALTER TABLE `comment` MODIFY `postId` VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1g. Restore FK on postId if post table exists and FK was dropped or missing
SET @post_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('post')
);

SET @postid_fk_exists_now := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
    AND BINARY(CONSTRAINT_NAME) = BINARY('Comment_postId_fkey')
);

SET @sql := IF(
  @post_table_exists > 0 AND @postid_fk_exists_now = 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- SECTION 2: Harden comment.magazineId -> INT NULL with correct FK/index
-- ---------------------------------------------------------------------------

-- 2a. Ensure magazineId column exists and is INT NULL
SET @magid_data_type := (
  SELECT DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

SET @magid_is_nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

-- 2b. Add column if missing
SET @sql := IF(
  @magid_data_type IS NULL,
  'ALTER TABLE `comment` ADD COLUMN `magazineId` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2c. Fix type if exists but wrong (e.g., VARCHAR instead of INT)
SET @magid_data_type := (
  SELECT DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

SET @magid_is_nullable := (
  SELECT IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

SET @magid_needs_repair := IF(
  BINARY(LOWER(@magid_data_type)) != BINARY('int') OR BINARY(@magid_is_nullable) = BINARY('NO'),
  1, 0
);

-- 2d. Drop FK before column modification if needed
SET @magid_fk_name := (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
    AND BINARY(CONSTRAINT_NAME) = BINARY('Comment_magazineId_fkey')
  LIMIT 1
);

SET @sql := IF(
  @magid_needs_repair = 1 AND @magid_fk_name IS NOT NULL,
  'ALTER TABLE `comment` DROP FOREIGN KEY `Comment_magazineId_fkey`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2e. Modify column to correct type
SET @sql := IF(
  @magid_needs_repair = 1,
  'ALTER TABLE `comment` MODIFY `magazineId` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2f. Ensure index Comment_magazineId_idx exists
SET @magid_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(INDEX_NAME) = BINARY('Comment_magazineId_idx')
);

SET @sql := IF(
  @magid_idx_exists = 0,
  'CREATE INDEX `Comment_magazineId_idx` ON `comment`(`magazineId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2g. Ensure FK Comment_magazineId_fkey exists pointing to magazines.idMagazines
SET @magid_fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
    AND BINARY(CONSTRAINT_NAME) = BINARY('Comment_magazineId_fkey')
);

SET @magazines_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('magazines')
);

SET @sql := IF(
  @magid_fk_exists = 0 AND @magazines_table_exists > 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_magazineId_fkey` FOREIGN KEY (`magazineId`) REFERENCES `magazines`(`idMagazines`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
