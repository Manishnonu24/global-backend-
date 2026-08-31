-- =============================================================================
-- Migration: 20260806120000_fix_comment_engine_and_foreign_keys
-- Purpose:   The `comment` table was created with ENGINE=MyISAM.
--            MyISAM does not support foreign keys, so all previous FK attempts
--            silently no-oped.  Additionally, `magazines` uses MyISAM which
--            prevents InnoDB FKs referencing it.  This migration:
--              1. Converts magazines -> InnoDB (FK target must be InnoDB).
--              2. Converts comment   -> InnoDB (FK source must be InnoDB).
--              3. Normalises postId -> VARCHAR(50) NULL.
--              4. Normalises magazineId -> INT NULL.
--              5. Creates FKs with ON DELETE CASCADE matching schema.prisma.
--
--  Safety rules
--  * Never drops, truncates, or modifies table data.
--  * Orphan check before FK creation; aborts clearly if invalid data exists.
--  * All steps guarded by INFORMATION_SCHEMA; idempotent (safe to re-run).
--  * ENGINE conversion for MyISAM tables preserves all row data.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Convert `magazines` to InnoDB
--         Required so InnoDB comment table can reference it with a FK.
-- ---------------------------------------------------------------------------

SET @magazines_engine := (
  SELECT ENGINE
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('magazines')
  LIMIT 1
);

SET @sql := IF(
  BINARY(UPPER(COALESCE(@magazines_engine, ''))) != BINARY('INNODB'),
  'ALTER TABLE `magazines` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 2: Convert `comment` to InnoDB
-- ---------------------------------------------------------------------------

SET @comment_engine := (
  SELECT ENGINE
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
  LIMIT 1
);

SET @sql := IF(
  BINARY(UPPER(COALESCE(@comment_engine, ''))) != BINARY('INNODB'),
  'ALTER TABLE `comment` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 3: Normalise postId -> VARCHAR(50) NULL
-- ---------------------------------------------------------------------------

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

-- Abort if narrowing the column would truncate existing data
SET @oversized_postids := IF(
  COALESCE(@postid_len, 0) != 50 OR BINARY(@postid_nullable) = BINARY('NO'),
  (SELECT COUNT(*) FROM `comment` WHERE postId IS NOT NULL AND CHAR_LENGTH(postId) > 50),
  0
);

SET @abort_oversized := IF(
  @oversized_postids > 0,
  'ALTER TABLE `_migration_abort_postId_values_exceed_50_chars` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_oversized;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  COALESCE(@postid_len, 0) != 50 OR BINARY(@postid_nullable) = BINARY('NO'),
  'ALTER TABLE `comment` MODIFY `postId` VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 4: Normalise magazineId -> INT NULL (add if missing)
-- ---------------------------------------------------------------------------

SET @magid_type := (
  SELECT DATA_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
  LIMIT 1
);

SET @sql := IF(
  @magid_type IS NULL,
  'ALTER TABLE `comment` ADD COLUMN `magazineId` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Re-read
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

SET @sql := IF(
  BINARY(LOWER(@magid_type)) != BINARY('int') OR BINARY(@magid_nullable) = BINARY('NO'),
  'ALTER TABLE `comment` MODIFY `magazineId` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure magazineId index
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


-- ---------------------------------------------------------------------------
-- STEP 5: Normalise postId FK -> post(id) ON DELETE CASCADE
-- ---------------------------------------------------------------------------

-- 5a. Drop any FK on postId pointing to wrong table/column
SET @wrong_post_fk := (
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

SET @sql := IF(
  @wrong_post_fk IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @wrong_post_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5b. Find correct-target FK on postId and check its DELETE_RULE
SET @correct_post_fk := (
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

SET @correct_post_fk_rule := (
  SELECT DELETE_RULE
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE BINARY(CONSTRAINT_SCHEMA) = BINARY(DATABASE())
    AND CONSTRAINT_NAME   = @correct_post_fk
  LIMIT 1
);

-- 5c. Drop if wrong DELETE_RULE
SET @sql := IF(
  @correct_post_fk IS NOT NULL AND BINARY(UPPER(COALESCE(@correct_post_fk_rule, ''))) != BINARY('CASCADE'),
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @correct_post_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5d. Orphan check
SET @orphaned_postids := (
  SELECT COUNT(*)
  FROM `comment` c
  WHERE c.postId IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM `post` p WHERE p.id = c.postId)
);

SET @abort_postid_orphans := IF(
  @orphaned_postids > 0,
  'ALTER TABLE `_migration_abort_comment_has_orphaned_postId_values` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_postid_orphans;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5e. Create FK if absent
SET @post_fk_count := (
  SELECT COUNT(*)
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
);

SET @post_table_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('post')
);

SET @sql := IF(
  @post_fk_count = 0 AND @post_table_exists > 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 6: Normalise magazineId FK -> magazines(idMagazines) ON DELETE CASCADE
-- ---------------------------------------------------------------------------

-- 6a. Drop any FK on magazineId pointing to wrong table/column
SET @wrong_mag_fk := (
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
  @wrong_mag_fk IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @wrong_mag_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6b. Find correct-target FK on magazineId and check DELETE_RULE
SET @correct_mag_fk := (
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

SET @correct_mag_fk_rule := (
  SELECT DELETE_RULE
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE BINARY(CONSTRAINT_SCHEMA) = BINARY(DATABASE())
    AND CONSTRAINT_NAME   = @correct_mag_fk
  LIMIT 1
);

-- 6c. Drop if wrong rule
SET @sql := IF(
  @correct_mag_fk IS NOT NULL AND BINARY(UPPER(COALESCE(@correct_mag_fk_rule, ''))) != BINARY('CASCADE'),
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @correct_mag_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6d. Orphan check
SET @magazines_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('magazines')
);

SET @orphaned_magids := IF(@magazines_exists > 0, (
  SELECT COUNT(*)
  FROM `comment` c
  WHERE c.magazineId IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM `magazines` m WHERE m.idMagazines = c.magazineId)
), 0);

SET @abort_mag_orphans := IF(
  @orphaned_magids > 0,
  'ALTER TABLE `_migration_abort_comment_has_orphaned_magazineId_values` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_mag_orphans;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6e. Create FK if absent
SET @mag_fk_count := (
  SELECT COUNT(*)
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
);

SET @sql := IF(
  @mag_fk_count = 0 AND @magazines_exists > 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_magazineId_fkey` FOREIGN KEY (`magazineId`) REFERENCES `magazines`(`idMagazines`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================================================
-- END OF MIGRATION
--
-- Final guaranteed state (all supported starting DB conditions):
--   magazines ENGINE             = InnoDB
--   comment ENGINE               = InnoDB
--   comment.postId               = VARCHAR(50) NULL
--   comment.magazineId           = INT NULL
--   comment.postId     -> post(id)               ON DELETE CASCADE ON UPDATE CASCADE
--   comment.magazineId -> magazines(idMagazines)  ON DELETE CASCADE ON UPDATE CASCADE
-- =============================================================================
