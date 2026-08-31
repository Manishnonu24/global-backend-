-- =============================================================================
-- Migration: 20260806130000_repair_recipe_schema
-- Purpose:   Production-grade, idempotent establishment and normalization of all
--            Recipe physical schema, parent/child key types, storage engines,
--            index definitions, and foreign key constraints.
--
-- Operational Order (Failure-producing validations execute BEFORE schema mutations):
--   1. Case Conflict Preflight Detection (Entity and Join Tables)
--   2. Data-Integrity Length Preflight Validation (Dynamic SQL on discovered table casing)
--   3. Orphan & Missing Parent Preflight Validation (Dynamic SQL on discovered table casing)
--   4. Table-Name Normalization (PascalCase/lowercase -> Canonical Prisma Names IF AND ONLY IF no conflict)
--   5. Creation of Missing Recipe Physical Tables with InnoDB engine & canonical columns
--   6. Dynamic Removal of ALL Foreign Keys Across ONLY the 13 Recipe Relation Columns
--   7. Storage Engine Normalization to InnoDB
--   8. Column Definition Normalization & Missing Optional Column Additions
--   9. Index Reconciliation by Exact DEFINITION (Ordered columns & Uniqueness)
--  10. Recreation of Exactly One Canonical Foreign Key Per Relationship
-- =============================================================================

SET SESSION group_concat_max_len = 1000000;


-- ---------------------------------------------------------------------------
-- STEP 1: Case Conflict Preflight Detection
-- Abort BEFORE modifying any table if both PascalCase & lowercase table variants exist.
-- ---------------------------------------------------------------------------

-- 1a. Recipe / recipe
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('Recipe'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipe'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_Recipe_and_recipe` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. RecipeTag / recipetag
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeTag'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipetag'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_RecipeTag_and_recipetag` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1c. RecipeAllergen / recipeallergen
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeAllergen'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipeallergen'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_RecipeAllergen_and_recipeallergen` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1d. RecipeComment / recipecomment
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeComment'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipecomment'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_RecipeComment_and_recipecomment` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1e. RecipeLike / recipelike
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeLike'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipelike'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_RecipeLike_and_recipelike` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1f. RecipeRating / reciperating
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeRating'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('reciperating'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_RecipeRating_and_reciperating` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1g. SavedRecipe / savedrecipe
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('SavedRecipe'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('savedrecipe'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_SavedRecipe_and_savedrecipe` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1h. _RecipeToRecipeTag / _recipetorecipetag
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_RecipeToRecipeTag'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_recipetorecipetag'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_RecipeToRecipeTag` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1i. _RecipeToRecipeAllergen / _recipetorecipeallergen
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_RecipeToRecipeAllergen'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_recipetorecipeallergen'));
SET @abort  := IF(@pascal > 0 AND @lower > 0, 'ALTER TABLE `_abort_migration_case_conflict_RecipeToRecipeAllergen` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 2: Data-Integrity Length Preflight Validation
-- Uses Dynamic SQL on the ACTUAL discovered physical table casing from INFORMATION_SCHEMA.
-- ---------------------------------------------------------------------------

-- 2a. recipe.id -> 50
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE id IS NOT NULL AND CHAR_LENGTH(id) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipe_id` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2b. recipetag.id -> 50, recipetag.name -> 140
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipetag') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE id IS NOT NULL AND CHAR_LENGTH(id) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipetag_id` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE name IS NOT NULL AND CHAR_LENGTH(name) > 140'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipetag_name` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2c. recipeallergen.id -> 50, recipeallergen.name -> 140
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipeallergen') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE id IS NOT NULL AND CHAR_LENGTH(id) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipeallergen_id` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE name IS NOT NULL AND CHAR_LENGTH(name) > 140'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipeallergen_name` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2d. recipecomment.recipeId -> 50, recipecomment.userId -> 191
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE recipeId IS NOT NULL AND CHAR_LENGTH(recipeId) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipecomment_recipeId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE userId IS NOT NULL AND CHAR_LENGTH(userId) > 191'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipecomment_userId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2e. recipelike.recipeId -> 50, recipelike.userId -> 191
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE recipeId IS NOT NULL AND CHAR_LENGTH(recipeId) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipelike_recipeId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE userId IS NOT NULL AND CHAR_LENGTH(userId) > 191'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_recipelike_userId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2f. reciperating.recipeId -> 50, reciperating.userId -> 191
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE recipeId IS NOT NULL AND CHAR_LENGTH(recipeId) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_reciperating_recipeId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE userId IS NOT NULL AND CHAR_LENGTH(userId) > 191'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_reciperating_userId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2g. savedrecipe.recipeId -> 50, savedrecipe.userId -> 191
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE recipeId IS NOT NULL AND CHAR_LENGTH(recipeId) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_savedrecipe_recipeId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE userId IS NOT NULL AND CHAR_LENGTH(userId) > 191'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_savedrecipe_userId` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2h. _RecipeToRecipeTag.A -> 50, B -> 50
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE A IS NOT NULL AND CHAR_LENGTH(A) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_RecipeToRecipeTag_A` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE B IS NOT NULL AND CHAR_LENGTH(B) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_RecipeToRecipeTag_B` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2i. _RecipeToRecipeAllergen.A -> 50, B -> 50
SET @tbl_name := NULL; SET @over := 0;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') LIMIT 1);
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE A IS NOT NULL AND CHAR_LENGTH(A) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_RecipeToRecipeAllergen_A` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @over FROM `', @tbl_name, '` WHERE B IS NOT NULL AND CHAR_LENGTH(B) > 50'), 'SET @over := 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@over > 0, 'ALTER TABLE `_abort_migration_data_oversized_RecipeToRecipeAllergen_B` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 3: Orphan & Missing Parent Preflight Validation
-- Uses Dynamic SQL with discovered physical table names. Handles missing parents.
-- ---------------------------------------------------------------------------

-- 3a. recipe.contributorId -> user.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('user') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.contributorId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.contributorId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE contributorId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_recipe_contributorId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3b. recipecomment.recipeId -> recipe.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.recipeId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.recipeId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE recipeId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_recipecomment_recipeId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3c. recipecomment.userId -> user.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('user') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.userId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.userId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE userId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_recipecomment_userId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3d. recipelike.recipeId -> recipe.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.recipeId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.recipeId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE recipeId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_recipelike_recipeId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3e. recipelike.userId -> user.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('user') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.userId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.userId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE userId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_recipelike_userId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3f. reciperating.recipeId -> recipe.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.recipeId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.recipeId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE recipeId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_reciperating_recipeId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3g. reciperating.userId -> user.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('user') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.userId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.userId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE userId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_reciperating_userId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3h. savedrecipe.recipeId -> recipe.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.recipeId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.recipeId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE recipeId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_savedrecipe_recipeId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3i. savedrecipe.userId -> user.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('user') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.userId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.userId)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE userId IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_savedrecipe_userId_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3j. _RecipeToRecipeTag.A -> recipe.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.A IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.A)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE A IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_RecipeToRecipeTag_A_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3k. _RecipeToRecipeTag.B -> recipetag.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipetag') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.B IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.B)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE B IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_RecipeToRecipeTag_B_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3l. _RecipeToRecipeAllergen.A -> recipe.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.A IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.A)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE A IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_RecipeToRecipeAllergen_A_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3m. _RecipeToRecipeAllergen.B -> recipeallergen.id
SET @child_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') LIMIT 1);
SET @parent_tbl := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipeallergen') LIMIT 1);
SET @orphans := 0;
SET @sql := IF(@child_tbl IS NOT NULL AND @parent_tbl IS NOT NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` c WHERE c.B IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `', @parent_tbl, '` p WHERE p.id = c.B)'), IF(@child_tbl IS NOT NULL AND @parent_tbl IS NULL, CONCAT('SELECT COUNT(*) INTO @orphans FROM `', @child_tbl, '` WHERE B IS NOT NULL'), 'SET @orphans := 0'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @abort := IF(@orphans > 0, 'ALTER TABLE `_abort_migration_RecipeToRecipeAllergen_B_orphans` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @abort; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 4: Table-Name Normalization & Missing Table Creation
-- Safely rename PascalCase/lowercase -> Canonical Prisma Names IF AND ONLY IF no conflict.
-- Create missing physical tables using CREATE TABLE IF NOT EXISTS.
-- ---------------------------------------------------------------------------

-- 4a. user table engine
SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('user') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `user` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4b. recipe table
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('Recipe'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipe'));
SET @sql := IF(@pascal > 0 AND @lower = 0, 'RENAME TABLE `Recipe` TO `recipe`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `recipe` (
  `id` VARCHAR(50) NOT NULL,
  `siteId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `ingredients` JSON NOT NULL,
  `steps` JSON NOT NULL,
  `cookingTime` INT NULL,
  `calories` INT NULL,
  `difficulty` VARCHAR(191) NULL,
  `imageUrl` TEXT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `contributorId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `protein` DOUBLE NULL,
  `carbs` DOUBLE NULL,
  `fiber` DOUBLE NULL,
  `fat` DOUBLE NULL,
  `sugar` DOUBLE NULL,
  `canonicalUrl` VARCHAR(191) NULL,
  `jsonLd` JSON NULL,
  `ogImage` VARCHAR(191) NULL,
  `seoDescription` TEXT NULL,
  `seoTitle` VARCHAR(191) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4c. recipetag table
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeTag'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipetag'));
SET @sql := IF(@pascal > 0 AND @lower = 0, 'RENAME TABLE `RecipeTag` TO `recipetag`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `recipetag` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(140) NOT NULL,
  UNIQUE INDEX `RecipeTag_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4d. recipeallergen table
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeAllergen'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipeallergen'));
SET @sql := IF(@pascal > 0 AND @lower = 0, 'RENAME TABLE `RecipeAllergen` TO `recipeallergen`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `recipeallergen` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(140) NOT NULL,
  UNIQUE INDEX `RecipeAllergen_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4e. recipecomment table
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeComment'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipecomment'));
SET @sql := IF(@pascal > 0 AND @lower = 0, 'RENAME TABLE `RecipeComment` TO `recipecomment`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `recipecomment` (
  `id` VARCHAR(191) NOT NULL,
  `recipeId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4f. recipelike table
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeLike'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('recipelike'));
SET @sql := IF(@pascal > 0 AND @lower = 0, 'RENAME TABLE `RecipeLike` TO `recipelike`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `recipelike` (
  `id` VARCHAR(191) NOT NULL,
  `recipeId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RecipeLike_recipeId_userId_key`(`recipeId`, `userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4g. reciperating table
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('RecipeRating'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('reciperating'));
SET @sql := IF(@pascal > 0 AND @lower = 0, 'RENAME TABLE `RecipeRating` TO `reciperating`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `reciperating` (
  `id` VARCHAR(191) NOT NULL,
  `recipeId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `rating` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `RecipeRating_recipeId_userId_key`(`recipeId`, `userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4h. savedrecipe table
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('SavedRecipe'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('savedrecipe'));
SET @sql := IF(@pascal > 0 AND @lower = 0, 'RENAME TABLE `SavedRecipe` TO `savedrecipe`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `savedrecipe` (
  `id` VARCHAR(191) NOT NULL,
  `recipeId` VARCHAR(50) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SavedRecipe_recipeId_userId_key`(`recipeId`, `userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4i. _RecipeToRecipeTag join table normalization & creation
SET @lctn := @@lower_case_table_names;
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_RecipeToRecipeTag'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_recipetorecipetag'));
SET @sql := IF(@lctn = 0 AND @lower > 0 AND @pascal = 0, 'RENAME TABLE `_recipetorecipetag` TO `_RecipeToRecipeTag`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `_RecipeToRecipeTag` (
  `A` VARCHAR(50) NOT NULL,
  `B` VARCHAR(50) NOT NULL,
  UNIQUE INDEX `_RecipeToRecipeTag_AB_unique`(`A`, `B`),
  INDEX `_RecipeToRecipeTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;

-- 4j. _RecipeToRecipeAllergen join table normalization & creation
SET @pascal := 0; SET @lower := 0;
SET @pascal := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_RecipeToRecipeAllergen'));
SET @lower  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(TABLE_NAME) = BINARY('_recipetorecipeallergen'));
SET @sql := IF(@lctn = 0 AND @lower > 0 AND @pascal = 0, 'RENAME TABLE `_recipetorecipeallergen` TO `_RecipeToRecipeAllergen`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `_RecipeToRecipeAllergen` (
  `A` VARCHAR(50) NOT NULL,
  `B` VARCHAR(50) NOT NULL,
  UNIQUE INDEX `_RecipeToRecipeAllergen_AB_unique`(`A`, `B`),
  INDEX `_RecipeToRecipeAllergen_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;


-- ---------------------------------------------------------------------------
-- STEP 5: Dynamic Removal of ALL Foreign Keys Across ONLY the 13 Recipe Relation Columns
-- ---------------------------------------------------------------------------

-- 5a. Drop FKs on recipe (only column: contributorId)
SET @drop_fks := NULL;
SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`') SEPARATOR ', ')
INTO @drop_fks
FROM (
  SELECT DISTINCT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE()))
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe')
    AND BINARY(COLUMN_NAME) IN (BINARY('contributorId'))
    AND REFERENCED_TABLE_NAME IS NOT NULL
) AS fks;
SET @sql := IF(@drop_fks IS NOT NULL, CONCAT('ALTER TABLE `recipe` ', @drop_fks), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5b. Drop FKs on recipecomment (only columns: recipeId, userId)
SET @drop_fks := NULL;
SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`') SEPARATOR ', ')
INTO @drop_fks
FROM (
  SELECT DISTINCT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE()))
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment')
    AND BINARY(COLUMN_NAME) IN (BINARY('recipeId'), BINARY('userId'))
    AND REFERENCED_TABLE_NAME IS NOT NULL
) AS fks;
SET @sql := IF(@drop_fks IS NOT NULL, CONCAT('ALTER TABLE `recipecomment` ', @drop_fks), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5c. Drop FKs on recipelike (only columns: recipeId, userId)
SET @drop_fks := NULL;
SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`') SEPARATOR ', ')
INTO @drop_fks
FROM (
  SELECT DISTINCT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE()))
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike')
    AND BINARY(COLUMN_NAME) IN (BINARY('recipeId'), BINARY('userId'))
    AND REFERENCED_TABLE_NAME IS NOT NULL
) AS fks;
SET @sql := IF(@drop_fks IS NOT NULL, CONCAT('ALTER TABLE `recipelike` ', @drop_fks), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5d. Drop FKs on reciperating (only columns: recipeId, userId)
SET @drop_fks := NULL;
SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`') SEPARATOR ', ')
INTO @drop_fks
FROM (
  SELECT DISTINCT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE()))
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating')
    AND BINARY(COLUMN_NAME) IN (BINARY('recipeId'), BINARY('userId'))
    AND REFERENCED_TABLE_NAME IS NOT NULL
) AS fks;
SET @sql := IF(@drop_fks IS NOT NULL, CONCAT('ALTER TABLE `reciperating` ', @drop_fks), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5e. Drop FKs on savedrecipe (only columns: recipeId, userId)
SET @drop_fks := NULL;
SELECT GROUP_CONCAT(CONCAT('DROP FOREIGN KEY `', CONSTRAINT_NAME, '`') SEPARATOR ', ')
INTO @drop_fks
FROM (
  SELECT DISTINCT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE()))
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe')
    AND BINARY(COLUMN_NAME) IN (BINARY('recipeId'), BINARY('userId'))
    AND REFERENCED_TABLE_NAME IS NOT NULL
) AS fks;
SET @sql := IF(@drop_fks IS NOT NULL, CONCAT('ALTER TABLE `savedrecipe` ', @drop_fks), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5f. Drop FKs on _RecipeToRecipeTag (only columns: A, B)
SET @tbl_name := NULL;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') LIMIT 1);
SET @drop_fks := NULL;
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT GROUP_CONCAT(CONCAT(\'DROP FOREIGN KEY `\', CONSTRAINT_NAME, \'`\') SEPARATOR \', \') INTO @drop_fks FROM (SELECT DISTINCT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY(\'_recipetorecipetag\') AND BINARY(COLUMN_NAME) IN (BINARY(\'A\'), BINARY(\'B\')) AND REFERENCED_TABLE_NAME IS NOT NULL) AS fks'), 'SET @drop_fks := NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@tbl_name IS NOT NULL AND @drop_fks IS NOT NULL, CONCAT('ALTER TABLE `', @tbl_name, '` ', @drop_fks), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5g. Drop FKs on _RecipeToRecipeAllergen (only columns: A, B)
SET @tbl_name := NULL;
SET @tbl_name := (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') LIMIT 1);
SET @drop_fks := NULL;
SET @sql := IF(@tbl_name IS NOT NULL, CONCAT('SELECT GROUP_CONCAT(CONCAT(\'DROP FOREIGN KEY `\', CONSTRAINT_NAME, \'`\') SEPARATOR \', \') INTO @drop_fks FROM (SELECT DISTINCT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY(\'_recipetorecipeallergen\') AND BINARY(COLUMN_NAME) IN (BINARY(\'A\'), BINARY(\'B\')) AND REFERENCED_TABLE_NAME IS NOT NULL) AS fks'), 'SET @drop_fks := NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@tbl_name IS NOT NULL AND @drop_fks IS NOT NULL, CONCAT('ALTER TABLE `', @tbl_name, '` ', @drop_fks), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 6: Storage Engine Normalization to InnoDB
-- ---------------------------------------------------------------------------

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `recipe` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipetag') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `recipetag` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipeallergen') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `recipeallergen` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `recipecomment` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `recipelike` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `reciperating` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `savedrecipe` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `_RecipeToRecipeTag` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @eng := NULL;
SET @eng := (SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') LIMIT 1);
SET @sql := IF(@eng IS NOT NULL AND BINARY(UPPER(@eng)) != BINARY('INNODB'), 'ALTER TABLE `_RecipeToRecipeAllergen` ENGINE = InnoDB', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 7: Column Definition Normalization & Missing Optional Column Additions
-- ---------------------------------------------------------------------------

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('siteId'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `siteId` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('description'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `description` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('cookingTime'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `cookingTime` INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('calories'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `calories` INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('difficulty'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `difficulty` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('imageUrl'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `imageUrl` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('status'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `status` ENUM(\'PENDING\', \'APPROVED\', \'REJECTED\') NOT NULL DEFAULT \'PENDING\'', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('deletedAt'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `deletedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('protein'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `protein` DOUBLE NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('carbs'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `carbs` DOUBLE NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('fiber'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `fiber` DOUBLE NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('fat'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `fat` DOUBLE NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('sugar'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `sugar` DOUBLE NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('canonicalUrl'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `canonicalUrl` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('jsonLd'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('ogImage'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `ogImage` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('seoDescription'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := 0; SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('seoTitle'));
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `seoTitle` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `recipe` MODIFY `id` VARCHAR(50) NOT NULL;
ALTER TABLE `recipetag` MODIFY `id` VARCHAR(50) NOT NULL, MODIFY `name` VARCHAR(140) NOT NULL;
ALTER TABLE `recipeallergen` MODIFY `id` VARCHAR(50) NOT NULL, MODIFY `name` VARCHAR(140) NOT NULL;

ALTER TABLE `recipecomment` MODIFY `recipeId` VARCHAR(50) NOT NULL, MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `recipelike` MODIFY `recipeId` VARCHAR(50) NOT NULL, MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `reciperating` MODIFY `recipeId` VARCHAR(50) NOT NULL, MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `savedrecipe` MODIFY `recipeId` VARCHAR(50) NOT NULL, MODIFY `userId` VARCHAR(191) NOT NULL;

ALTER TABLE `_RecipeToRecipeTag` MODIFY `A` VARCHAR(50) NOT NULL, MODIFY `B` VARCHAR(50) NOT NULL;
ALTER TABLE `_RecipeToRecipeAllergen` MODIFY `A` VARCHAR(50) NOT NULL, MODIFY `B` VARCHAR(50) NOT NULL;


-- ---------------------------------------------------------------------------
-- STEP 8: Index & Unique Constraint Reconciliation by DEFINITION
-- ---------------------------------------------------------------------------

-- 8a. recipe indexes
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(INDEX_NAME) = BINARY('Recipe_contributorId_idx');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('contributorId') OR @is_unique != 0), 'ALTER TABLE `recipe` DROP INDEX `Recipe_contributorId_idx`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(INDEX_NAME) = BINARY('Recipe_contributorId_idx'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `Recipe_contributorId_idx` ON `recipe`(`contributorId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(INDEX_NAME) = BINARY('Recipe_siteId_idx');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('siteId') OR @is_unique != 0), 'ALTER TABLE `recipe` DROP INDEX `Recipe_siteId_idx`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(INDEX_NAME) = BINARY('Recipe_siteId_idx'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `Recipe_siteId_idx` ON `recipe`(`siteId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(INDEX_NAME) = BINARY('Recipe_status_idx');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('status') OR @is_unique != 0), 'ALTER TABLE `recipe` DROP INDEX `Recipe_status_idx`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(INDEX_NAME) = BINARY('Recipe_status_idx'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `Recipe_status_idx` ON `recipe`(`status`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8b. recipecomment indexes
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') AND BINARY(INDEX_NAME) = BINARY('RecipeComment_recipeId_fkey');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('recipeId') OR @is_unique != 0), 'ALTER TABLE `recipecomment` DROP INDEX `RecipeComment_recipeId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') AND BINARY(INDEX_NAME) = BINARY('RecipeComment_recipeId_fkey'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `RecipeComment_recipeId_fkey` ON `recipecomment`(`recipeId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') AND BINARY(INDEX_NAME) = BINARY('RecipeComment_userId_fkey');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('userId') OR @is_unique != 0), 'ALTER TABLE `recipecomment` DROP INDEX `RecipeComment_userId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') AND BINARY(INDEX_NAME) = BINARY('RecipeComment_userId_fkey'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `RecipeComment_userId_fkey` ON `recipecomment`(`userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8c. recipelike indexes
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(INDEX_NAME) = BINARY('RecipeLike_recipeId_userId_key');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('recipeId,userId') OR @is_unique != 1), 'ALTER TABLE `recipelike` DROP INDEX `RecipeLike_recipeId_userId_key`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(INDEX_NAME) = BINARY('RecipeLike_recipeId_userId_key'));
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `RecipeLike_recipeId_userId_key` ON `recipelike`(`recipeId`, `userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(INDEX_NAME) = BINARY('RecipeLike_recipeId_idx');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('recipeId') OR @is_unique != 0), 'ALTER TABLE `recipelike` DROP INDEX `RecipeLike_recipeId_idx`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(INDEX_NAME) = BINARY('RecipeLike_recipeId_idx'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `RecipeLike_recipeId_idx` ON `recipelike`(`recipeId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(INDEX_NAME) = BINARY('RecipeLike_userId_fkey');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('userId') OR @is_unique != 0), 'ALTER TABLE `recipelike` DROP INDEX `RecipeLike_userId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(INDEX_NAME) = BINARY('RecipeLike_userId_fkey'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `RecipeLike_userId_fkey` ON `recipelike`(`userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8d. reciperating indexes
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(INDEX_NAME) = BINARY('RecipeRating_recipeId_userId_key');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('recipeId,userId') OR @is_unique != 1), 'ALTER TABLE `reciperating` DROP INDEX `RecipeRating_recipeId_userId_key`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(INDEX_NAME) = BINARY('RecipeRating_recipeId_userId_key'));
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `RecipeRating_recipeId_userId_key` ON `reciperating`(`recipeId`, `userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(INDEX_NAME) = BINARY('RecipeRating_recipeId_idx');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('recipeId') OR @is_unique != 0), 'ALTER TABLE `reciperating` DROP INDEX `RecipeRating_recipeId_idx`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(INDEX_NAME) = BINARY('RecipeRating_recipeId_idx'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `RecipeRating_recipeId_idx` ON `reciperating`(`recipeId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(INDEX_NAME) = BINARY('RecipeRating_userId_fkey');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('userId') OR @is_unique != 0), 'ALTER TABLE `reciperating` DROP INDEX `RecipeRating_userId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(INDEX_NAME) = BINARY('RecipeRating_userId_fkey'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `RecipeRating_userId_fkey` ON `reciperating`(`userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8e. savedrecipe indexes
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(INDEX_NAME) = BINARY('SavedRecipe_recipeId_userId_key');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('recipeId,userId') OR @is_unique != 1), 'ALTER TABLE `savedrecipe` DROP INDEX `SavedRecipe_recipeId_userId_key`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(INDEX_NAME) = BINARY('SavedRecipe_recipeId_userId_key'));
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `SavedRecipe_recipeId_userId_key` ON `savedrecipe`(`recipeId`, `userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(INDEX_NAME) = BINARY('SavedRecipe_recipeId_idx');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('recipeId') OR @is_unique != 0), 'ALTER TABLE `savedrecipe` DROP INDEX `SavedRecipe_recipeId_idx`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(INDEX_NAME) = BINARY('SavedRecipe_recipeId_idx'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `SavedRecipe_recipeId_idx` ON `savedrecipe`(`recipeId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(INDEX_NAME) = BINARY('SavedRecipe_userId_fkey');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('userId') OR @is_unique != 0), 'ALTER TABLE `savedrecipe` DROP INDEX `SavedRecipe_userId_fkey`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(INDEX_NAME) = BINARY('SavedRecipe_userId_fkey'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `SavedRecipe_userId_fkey` ON `savedrecipe`(`userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8f. _RecipeToRecipeTag indexes
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeTag_AB_unique');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('A,B') OR @is_unique != 1), 'ALTER TABLE `_RecipeToRecipeTag` DROP INDEX `_RecipeToRecipeTag_AB_unique`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeTag_AB_unique'));
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `_RecipeToRecipeTag_AB_unique` ON `_RecipeToRecipeTag`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeTag_B_index');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('B') OR @is_unique != 0), 'ALTER TABLE `_RecipeToRecipeTag` DROP INDEX `_RecipeToRecipeTag_B_index`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeTag_B_index'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `_RecipeToRecipeTag_B_index` ON `_RecipeToRecipeTag`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8g. _RecipeToRecipeAllergen indexes
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeAllergen_AB_unique');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('A,B') OR @is_unique != 1), 'ALTER TABLE `_RecipeToRecipeAllergen` DROP INDEX `_RecipeToRecipeAllergen_AB_unique`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeAllergen_AB_unique'));
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `_RecipeToRecipeAllergen_AB_unique` ON `_RecipeToRecipeAllergen`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeAllergen_B_index');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('B') OR @is_unique != 0), 'ALTER TABLE `_RecipeToRecipeAllergen` DROP INDEX `_RecipeToRecipeAllergen_B_index`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') AND BINARY(INDEX_NAME) = BINARY('_RecipeToRecipeAllergen_B_index'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `_RecipeToRecipeAllergen_B_index` ON `_RecipeToRecipeAllergen`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8h. recipetag unique index
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipetag') AND BINARY(INDEX_NAME) = BINARY('RecipeTag_name_key');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('name') OR @is_unique != 1), 'ALTER TABLE `recipetag` DROP INDEX `RecipeTag_name_key`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipetag') AND BINARY(INDEX_NAME) = BINARY('RecipeTag_name_key'));
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `RecipeTag_name_key` ON `recipetag`(`name`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8i. recipeallergen unique index
SET @idx_cols := NULL; SET @is_unique := NULL;
SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ','), MAX(IF(NON_UNIQUE = 0, 1, 0))
INTO @idx_cols, @is_unique FROM INFORMATION_SCHEMA.STATISTICS
WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipeallergen') AND BINARY(INDEX_NAME) = BINARY('RecipeAllergen_name_key');
SET @sql := IF(@idx_cols IS NOT NULL AND (BINARY(@idx_cols) != BINARY('name') OR @is_unique != 1), 'ALTER TABLE `recipeallergen` DROP INDEX `RecipeAllergen_name_key`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipeallergen') AND BINARY(INDEX_NAME) = BINARY('RecipeAllergen_name_key'));
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `RecipeAllergen_name_key` ON `recipeallergen`(`name`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---------------------------------------------------------------------------
-- STEP 9: Recreation of Exactly One Canonical Foreign Key Per Relationship
-- ---------------------------------------------------------------------------

-- 9a. recipe.contributorId -> user(id) ON DELETE RESTRICT ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipe') AND BINARY(COLUMN_NAME) = BINARY('contributorId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `recipe` ADD CONSTRAINT `Recipe_contributorId_fkey` FOREIGN KEY (`contributorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9b. recipecomment.recipeId -> recipe(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') AND BINARY(COLUMN_NAME) = BINARY('recipeId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `recipecomment` ADD CONSTRAINT `RecipeComment_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9c. recipecomment.userId -> user(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipecomment') AND BINARY(COLUMN_NAME) = BINARY('userId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `recipecomment` ADD CONSTRAINT `RecipeComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9d. recipelike.recipeId -> recipe(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(COLUMN_NAME) = BINARY('recipeId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `recipelike` ADD CONSTRAINT `RecipeLike_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9e. recipelike.userId -> user(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('recipelike') AND BINARY(COLUMN_NAME) = BINARY('userId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `recipelike` ADD CONSTRAINT `RecipeLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9f. reciperating.recipeId -> recipe(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(COLUMN_NAME) = BINARY('recipeId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `reciperating` ADD CONSTRAINT `RecipeRating_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9g. reciperating.userId -> user(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('reciperating') AND BINARY(COLUMN_NAME) = BINARY('userId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `reciperating` ADD CONSTRAINT `RecipeRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9h. savedrecipe.recipeId -> recipe(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(COLUMN_NAME) = BINARY('recipeId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `savedrecipe` ADD CONSTRAINT `SavedRecipe_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9i. savedrecipe.userId -> user(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('savedrecipe') AND BINARY(COLUMN_NAME) = BINARY('userId') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `savedrecipe` ADD CONSTRAINT `SavedRecipe_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9j. _RecipeToRecipeTag.A -> recipe(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') AND BINARY(COLUMN_NAME) = BINARY('A') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `_RecipeToRecipeTag` ADD CONSTRAINT `_RecipeToRecipeTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9k. _RecipeToRecipeTag.B -> recipetag(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipetag') AND BINARY(COLUMN_NAME) = BINARY('B') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `_RecipeToRecipeTag` ADD CONSTRAINT `_RecipeToRecipeTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `recipetag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9l. _RecipeToRecipeAllergen.A -> recipe(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') AND BINARY(COLUMN_NAME) = BINARY('A') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `_RecipeToRecipeAllergen` ADD CONSTRAINT `_RecipeToRecipeAllergen_A_fkey` FOREIGN KEY (`A`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9m. _RecipeToRecipeAllergen.B -> recipeallergen(id) ON DELETE CASCADE ON UPDATE CASCADE
SET @fk := 0; SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE BINARY(LOWER(TABLE_SCHEMA)) = BINARY(LOWER(DATABASE())) AND BINARY(LOWER(TABLE_NAME)) = BINARY('_recipetorecipeallergen') AND BINARY(COLUMN_NAME) = BINARY('B') AND REFERENCED_TABLE_NAME IS NOT NULL);
SET @sql := IF(@fk = 0, 'ALTER TABLE `_RecipeToRecipeAllergen` ADD CONSTRAINT `_RecipeToRecipeAllergen_B_fkey` FOREIGN KEY (`B`) REFERENCES `recipeallergen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
