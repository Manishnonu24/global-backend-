-- =============================================================================
-- Migration: 20260806140000_production_safety_repair
-- Purpose:   Forward-only production-grade safety repair migration.
--            All 23 prior migrations are applied to production and IMMUTABLE.
--            This migration:
--              1. Provides correct magazine status mapping (abort on unknown)
--              2. Provides safe QuizType VARCHAR→INT guard (abort on non-numeric
--                 IDs when quiz_types has non-numeric values)
--              3. Provides abort-before-delete for join-table orphans
--                 (_CategoryToPost, _PostToTag, _RecipeToRecipeTag,
--                 _RecipeToRecipeAllergen)
--              4. Guards comment.postId narrowing with oversized-data preflight
--              5. Guards comment.magazineId FK creation with orphan preflight
--              6. Handles case-sensitive join-table conflicts on Linux MySQL
--                 (_CategoryToPost/_categorytopost, _PostToTag/_posttotag)
--              7. Uses INFORMATION_SCHEMA guards and dynamic SQL for all operations
--                 to prevent table-missing errors on partial database schemas.
--
--  Safety rules:
--  * Does NOT modify any previously applied migration files.
--  * Never deletes data.
--  * Never silently coerces business data.
--  * Aborts cleanly with a deliberate error when unsafe data exists.
--  * Every statement is guarded by INFORMATION_SCHEMA conditions and dynamic SQL.
--  * Every session variable is explicitly initialized before use.
--  * Idempotent: safe to run multiple times.
--  * Compatible with MySQL 8 and MariaDB >= 10.4.
-- =============================================================================

SET SESSION group_concat_max_len = 1000000;

-- Global helper initializations
SET @category_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('category'));
SET @post_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('post'));
SET @tag_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('tag'));
SET @recipe_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe'));
SET @recipetag_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipetag'));
SET @recipeallergen_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipeallergen'));
SET @magazines_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('magazines'));
SET @comment_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('comment'));


-- =============================================================================
-- SECTION 1: Magazine Status — Semantic Mapping with Unknown-Value Abort
-- =============================================================================

SET @mag_status_is_varchar := IF(@magazines_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('magazines')
    AND BINARY(COLUMN_NAME) = BINARY('status') AND BINARY(DATA_TYPE) = BINARY('varchar')
), 0);

SET @sql := IF(@mag_status_is_varchar > 0,
  'SET @unknown_mag_status_count := (SELECT COUNT(*) FROM `magazines` WHERE `status` IS NOT NULL AND UPPER(`status`) NOT IN ("1", "ACTIVE", "PUBLISHED", "TRUE", "0", "DRAFT", "INACTIVE", "ARCHIVED", "FALSE"))',
  'SET @unknown_mag_status_count := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_unknown_status := IF(
  @unknown_mag_status_count > 0,
  'ALTER TABLE `_abort_magazines_status_has_unknown_values` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_unknown_status; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@mag_status_is_varchar > 0,
  'UPDATE `magazines` SET `status` = "1" WHERE UPPER(`status`) IN ("1", "ACTIVE", "PUBLISHED", "TRUE")',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@mag_status_is_varchar > 0,
  'UPDATE `magazines` SET `status` = "0" WHERE UPPER(`status`) IN ("0", "DRAFT", "INACTIVE", "ARCHIVED", "FALSE")',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@mag_status_is_varchar > 0,
  'ALTER TABLE `magazines` MODIFY COLUMN `status` INT NOT NULL DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 2: QuizType ID — Guard VARCHAR→INT Conversion
-- =============================================================================

SET @quiz_types_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('quiz_types'));

SET @qt_id_is_varchar := IF(@quiz_types_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('quiz_types')
    AND BINARY(COLUMN_NAME) = BINARY('id') AND BINARY(DATA_TYPE) = BINARY('varchar')
), 0);

SET @sql := IF(@qt_id_is_varchar > 0,
  'SET @non_numeric_qt_ids := (SELECT COUNT(*) FROM `quiz_types` WHERE `id` IS NOT NULL AND `id` REGEXP "[^0-9]")',
  'SET @non_numeric_qt_ids := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_non_numeric_qt := IF(
  @non_numeric_qt_ids > 0,
  'ALTER TABLE `_abort_quiz_types_id_has_non_numeric_values` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_non_numeric_qt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@qt_id_is_varchar > 0 AND @non_numeric_qt_ids = 0,
  'ALTER TABLE `quiz_types` MODIFY COLUMN `id` INT NOT NULL AUTO_INCREMENT',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 3: Parent Table ENGINE Guards
-- =============================================================================

SET @tbl := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('category') LIMIT 1);
SET @sql := IF(@tbl IS NOT NULL AND BINARY(UPPER(@tbl)) != BINARY('INNODB'), 'ALTER TABLE `category` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('post') LIMIT 1);
SET @sql := IF(@tbl IS NOT NULL AND BINARY(UPPER(@tbl)) != BINARY('INNODB'), 'ALTER TABLE `post` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('tag') LIMIT 1);
SET @sql := IF(@tbl IS NOT NULL AND BINARY(UPPER(@tbl)) != BINARY('INNODB'), 'ALTER TABLE `tag` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('recipe') LIMIT 1);
SET @sql := IF(@tbl IS NOT NULL AND BINARY(UPPER(@tbl)) != BINARY('INNODB'), 'ALTER TABLE `recipe` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('recipetag') LIMIT 1);
SET @sql := IF(@tbl IS NOT NULL AND BINARY(UPPER(@tbl)) != BINARY('INNODB'), 'ALTER TABLE `recipetag` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('recipeallergen') LIMIT 1);
SET @sql := IF(@tbl IS NOT NULL AND BINARY(UPPER(@tbl)) != BINARY('INNODB'), 'ALTER TABLE `recipeallergen` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('magazines') LIMIT 1);
SET @sql := IF(@tbl IS NOT NULL AND BINARY(UPPER(@tbl)) != BINARY('INNODB'), 'ALTER TABLE `magazines` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 4: Join-Table Case-Conflict Detection and Normalization
-- =============================================================================

SET @cat_pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_CategoryToPost'));
SET @cat_lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_categorytopost'));

SET @abort_cat_conflict := IF(
  @cat_pascal > 0 AND @cat_lower > 0 AND @@lower_case_table_names = 0,
  'ALTER TABLE `_abort_CategoryToPost_case_conflict` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_cat_conflict; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @cat_lower > 0 AND @cat_pascal = 0 AND @@lower_case_table_names = 0,
  'RENAME TABLE `_categorytopost` TO `_CategoryToPost`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @pt_pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_PostToTag'));
SET @pt_lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_posttotag'));

SET @abort_pt_conflict := IF(
  @pt_pascal > 0 AND @pt_lower > 0 AND @@lower_case_table_names = 0,
  'ALTER TABLE `_abort_PostToTag_case_conflict` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_pt_conflict; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @pt_lower > 0 AND @pt_pascal = 0 AND @@lower_case_table_names = 0,
  'RENAME TABLE `_posttotag` TO `_PostToTag`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 5: Join-Table Orphan Abort (Replaces Silent DELETE Logic)
-- =============================================================================

-- 5a. _CategoryToPost orphan check
SET @cat_a_fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(LOWER(kcu.TABLE_NAME)) = BINARY('_categorytopost')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('A') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
);
SET @cat_tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_categorytopost'));

SET @sql := IF(
  @cat_tbl_exists > 0 AND @cat_a_fk_exists = 0 AND @category_exists > 0 AND @post_exists > 0,
  'SET @cat_orphan_count := (SELECT COUNT(*) FROM `_CategoryToPost` WHERE `A` NOT IN (SELECT `id` FROM `category`) OR `B` NOT IN (SELECT `id` FROM `post`))',
  'SET @cat_orphan_count := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_cat_orphans := IF(
  @cat_orphan_count > 0,
  'ALTER TABLE `_abort_CategoryToPost_has_orphaned_rows` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_cat_orphans; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 5b. _PostToTag orphan check
SET @pt_a_fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(LOWER(kcu.TABLE_NAME)) = BINARY('_posttotag')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('A') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
);
SET @pt_tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_posttotag'));

SET @sql := IF(
  @pt_tbl_exists > 0 AND @pt_a_fk_exists = 0 AND @post_exists > 0 AND @tag_exists > 0,
  'SET @pt_orphan_count := (SELECT COUNT(*) FROM `_PostToTag` WHERE `A` NOT IN (SELECT `id` FROM `post`) OR `B` NOT IN (SELECT `id` FROM `tag`))',
  'SET @pt_orphan_count := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_pt_orphans := IF(
  @pt_orphan_count > 0,
  'ALTER TABLE `_abort_PostToTag_has_orphaned_rows` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_pt_orphans; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 5c. _RecipeToRecipeTag orphan check
SET @rrt_a_fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(LOWER(kcu.TABLE_NAME)) = BINARY('_recipetorecipetag')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('A') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
);
SET @rrt_tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag'));

SET @sql := IF(
  @rrt_tbl_exists > 0 AND @rrt_a_fk_exists = 0 AND @recipe_exists > 0 AND @recipetag_exists > 0,
  'SET @rrt_orphan_count := (SELECT COUNT(*) FROM `_RecipeToRecipeTag` WHERE `A` NOT IN (SELECT `id` FROM `recipe`) OR `B` NOT IN (SELECT `id` FROM `recipetag`))',
  'SET @rrt_orphan_count := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_rrt_orphans := IF(
  @rrt_orphan_count > 0,
  'ALTER TABLE `_abort_RecipeToRecipeTag_has_orphaned_rows` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_rrt_orphans; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 5d. _RecipeToRecipeAllergen orphan check
SET @rra_a_fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(LOWER(kcu.TABLE_NAME)) = BINARY('_recipetorecipeallergen')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('A') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
);
SET @rra_tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen'));

SET @sql := IF(
  @rra_tbl_exists > 0 AND @rra_a_fk_exists = 0 AND @recipe_exists > 0 AND @recipeallergen_exists > 0,
  'SET @rra_orphan_count := (SELECT COUNT(*) FROM `_RecipeToRecipeAllergen` WHERE `A` NOT IN (SELECT `id` FROM `recipe`) OR `B` NOT IN (SELECT `id` FROM `recipeallergen`))',
  'SET @rra_orphan_count := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_rra_orphans := IF(
  @rra_orphan_count > 0,
  'ALTER TABLE `_abort_RecipeToRecipeAllergen_has_orphaned_rows` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_rra_orphans; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 6: Comment postId — Oversized-Data Preflight Before Narrowing
-- =============================================================================

SET @postid_len := IF(@comment_exists > 0, (
  SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(COLUMN_NAME) = BINARY('postId') LIMIT 1
), NULL);
SET @postid_nullable := IF(@comment_exists > 0, (
  SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(COLUMN_NAME) = BINARY('postId') LIMIT 1
), NULL);

SET @postid_needs_narrow := IF(
  @comment_exists > 0 AND @postid_len IS NOT NULL AND (COALESCE(@postid_len, 0) > 50 OR BINARY(@postid_nullable) = BINARY('NO')),
  1, 0
);

SET @sql := IF(@postid_needs_narrow = 1,
  'SET @oversized_postids := (SELECT COUNT(*) FROM `comment` WHERE `postId` IS NOT NULL AND CHAR_LENGTH(`postId`) > 50)',
  'SET @oversized_postids := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_oversized_postid := IF(
  @oversized_postids > 0,
  'ALTER TABLE `_abort_comment_postId_exceeds_50_chars` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_oversized_postid; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @postid_fk_to_drop := IF(@comment_exists > 0, (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('postId') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
), NULL);

SET @sql := IF(
  @postid_needs_narrow = 1 AND @postid_fk_to_drop IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @postid_fk_to_drop, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @postid_needs_narrow = 1,
  'ALTER TABLE `comment` MODIFY `postId` VARCHAR(50) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 7: Comment magazineId — Orphan Check Before FK Creation
-- =============================================================================

SET @mag_fk_already_exists := IF(@comment_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(CONSTRAINT_TYPE) = BINARY('FOREIGN KEY') AND BINARY(CONSTRAINT_NAME) = BINARY('Comment_magazineId_fkey')
), 0);

SET @magid_col_exists := IF(@comment_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(COLUMN_NAME) = BINARY('magazineId')
), 0);

SET @sql := IF(
  @mag_fk_already_exists = 0 AND @magazines_exists > 0 AND @magid_col_exists > 0,
  'SET @orphaned_mag_comments := (SELECT COUNT(*) FROM `comment` c WHERE c.`magazineId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `magazines` m WHERE m.`idMagazines` = c.`magazineId`))',
  'SET @orphaned_mag_comments := 0'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @abort_orphaned_mag := IF(
  @orphaned_mag_comments > 0,
  'ALTER TABLE `_abort_comment_magazineId_has_orphaned_values` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_orphaned_mag; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@comment_exists > 0 AND @magid_col_exists = 0, 'ALTER TABLE `comment` ADD COLUMN `magazineId` INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @magid_idx := IF(@comment_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(INDEX_NAME) = BINARY('Comment_magazineId_idx')
), 0);
SET @sql := IF(@comment_exists > 0 AND @magid_idx = 0, 'CREATE INDEX `Comment_magazineId_idx` ON `comment`(`magazineId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @comment_exists > 0 AND @mag_fk_already_exists = 0 AND @magazines_exists > 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_magazineId_fkey` FOREIGN KEY (`magazineId`) REFERENCES `magazines`(`idMagazines`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 8: _CategoryToPost FK Enforcement
-- =============================================================================

SET @cat_final_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_CategoryToPost'));

SET @sql := IF(@cat_final_exists > 0 AND @category_exists > 0 AND @post_exists > 0,
  'ALTER TABLE `_CategoryToPost` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := IF(@cat_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_CategoryToPost') AND BINARY(INDEX_NAME) = BINARY('_CategoryToPost_AB_unique')), 1);
SET @sql := IF(@idx = 0 AND @cat_final_exists > 0, 'CREATE UNIQUE INDEX `_CategoryToPost_AB_unique` ON `_CategoryToPost`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := IF(@cat_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_CategoryToPost') AND BINARY(INDEX_NAME) = BINARY('_CategoryToPost_B_index')), 1);
SET @sql := IF(@idx = 0 AND @cat_final_exists > 0, 'CREATE INDEX `_CategoryToPost_B_index` ON `_CategoryToPost`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk := IF(@cat_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(kcu.TABLE_NAME) = BINARY('_CategoryToPost') AND BINARY(kcu.COLUMN_NAME) = BINARY('A') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL), 1);
SET @sql := IF(@fk = 0 AND @cat_final_exists > 0 AND @category_exists > 0,
  'ALTER TABLE `_CategoryToPost` ADD CONSTRAINT `_CategoryToPost_A_fkey` FOREIGN KEY (`A`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk := IF(@cat_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(kcu.TABLE_NAME) = BINARY('_CategoryToPost') AND BINARY(kcu.COLUMN_NAME) = BINARY('B') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL), 1);
SET @sql := IF(@fk = 0 AND @cat_final_exists > 0 AND @post_exists > 0,
  'ALTER TABLE `_CategoryToPost` ADD CONSTRAINT `_CategoryToPost_B_fkey` FOREIGN KEY (`B`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 9: _PostToTag FK Enforcement
-- =============================================================================

SET @pt_final_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_PostToTag'));

SET @sql := IF(@pt_final_exists > 0 AND @post_exists > 0 AND @tag_exists > 0,
  'ALTER TABLE `_PostToTag` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := IF(@pt_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_PostToTag') AND BINARY(INDEX_NAME) = BINARY('_PostToTag_AB_unique')), 1);
SET @sql := IF(@idx = 0 AND @pt_final_exists > 0, 'CREATE UNIQUE INDEX `_PostToTag_AB_unique` ON `_PostToTag`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := IF(@pt_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('_PostToTag') AND BINARY(INDEX_NAME) = BINARY('_PostToTag_B_index')), 1);
SET @sql := IF(@idx = 0 AND @pt_final_exists > 0, 'CREATE INDEX `_PostToTag_B_index` ON `_PostToTag`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk := IF(@pt_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(kcu.TABLE_NAME) = BINARY('_PostToTag') AND BINARY(kcu.COLUMN_NAME) = BINARY('A') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL), 1);
SET @sql := IF(@fk = 0 AND @pt_final_exists > 0 AND @post_exists > 0,
  'ALTER TABLE `_PostToTag` ADD CONSTRAINT `_PostToTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk := IF(@pt_final_exists > 0, (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(kcu.TABLE_NAME) = BINARY('_PostToTag') AND BINARY(kcu.COLUMN_NAME) = BINARY('B') AND kcu.REFERENCED_TABLE_NAME IS NOT NULL), 1);
SET @sql := IF(@fk = 0 AND @pt_final_exists > 0 AND @tag_exists > 0,
  'ALTER TABLE `_PostToTag` ADD CONSTRAINT `_PostToTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- SECTION 10: Recipe relation table indexes
-- =============================================================================

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('recipelike') AND BINARY(INDEX_NAME) = BINARY('RecipeLike_recipeId_idx'));
SET @tbl := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('recipelike'));
SET @sql := IF(@idx = 0 AND @tbl > 0, 'CREATE INDEX `RecipeLike_recipeId_idx` ON `recipelike`(`recipeId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('reciperating') AND BINARY(INDEX_NAME) = BINARY('RecipeRating_recipeId_idx'));
SET @tbl := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('reciperating'));
SET @sql := IF(@idx = 0 AND @tbl > 0, 'CREATE INDEX `RecipeRating_recipeId_idx` ON `reciperating`(`recipeId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('savedrecipe') AND BINARY(INDEX_NAME) = BINARY('SavedRecipe_recipeId_idx'));
SET @tbl := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('savedrecipe'));
SET @sql := IF(@idx = 0 AND @tbl > 0, 'CREATE INDEX `SavedRecipe_recipeId_idx` ON `savedrecipe`(`recipeId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
