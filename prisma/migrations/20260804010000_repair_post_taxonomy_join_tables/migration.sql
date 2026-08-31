-- Forward repair migration: 20260804010000_repair_post_taxonomy_join_tables
-- Additive, guarded, idempotent repair for implicit relation tables and missing foreign key constraints.

-- ============================================================
-- 1. _CategoryToPost relation table
-- ============================================================
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CategoryToPost');
SET @sql := IF(@tbl_exists = 0,
  'CREATE TABLE `_CategoryToPost` ( `A` VARCHAR(50) NOT NULL, `B` VARCHAR(50) NOT NULL, UNIQUE INDEX `_CategoryToPost_AB_unique`(`A`, `B`), INDEX `_CategoryToPost_B_index`(`B`) ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CategoryToPost' AND INDEX_NAME = '_CategoryToPost_AB_unique');
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `_CategoryToPost_AB_unique` ON `_CategoryToPost`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CategoryToPost' AND INDEX_NAME = '_CategoryToPost_B_index');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `_CategoryToPost_B_index` ON `_CategoryToPost`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @category_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'category' OR TABLE_NAME = 'Category')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CategoryToPost' AND CONSTRAINT_NAME = '_CategoryToPost_A_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @category_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_CategoryToPost` ADD CONSTRAINT `_CategoryToPost_A_fkey` FOREIGN KEY (`A`) REFERENCES `', @category_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @post_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'post' OR TABLE_NAME = 'Post')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CategoryToPost' AND CONSTRAINT_NAME = '_CategoryToPost_B_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @post_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_CategoryToPost` ADD CONSTRAINT `_CategoryToPost_B_fkey` FOREIGN KEY (`B`) REFERENCES `', @post_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 2. _PostToTag relation table
-- ============================================================
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_PostToTag');
SET @sql := IF(@tbl_exists = 0,
  'CREATE TABLE `_PostToTag` ( `A` VARCHAR(50) NOT NULL, `B` VARCHAR(50) NOT NULL, UNIQUE INDEX `_PostToTag_AB_unique`(`A`, `B`), INDEX `_PostToTag_B_index`(`B`) ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_PostToTag' AND INDEX_NAME = '_PostToTag_AB_unique');
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `_PostToTag_AB_unique` ON `_PostToTag`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_PostToTag' AND INDEX_NAME = '_PostToTag_B_index');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `_PostToTag_B_index` ON `_PostToTag`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @post_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'post' OR TABLE_NAME = 'Post')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_PostToTag' AND CONSTRAINT_NAME = '_PostToTag_A_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @post_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_PostToTag` ADD CONSTRAINT `_PostToTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `', @post_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tag_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'tag' OR TABLE_NAME = 'Tag')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_PostToTag' AND CONSTRAINT_NAME = '_PostToTag_B_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @tag_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_PostToTag` ADD CONSTRAINT `_PostToTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `', @tag_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 3. _RecipeToRecipeTag relation table
-- ============================================================
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeTag');
SET @sql := IF(@tbl_exists = 0,
  'CREATE TABLE `_RecipeToRecipeTag` ( `A` VARCHAR(50) NOT NULL, `B` VARCHAR(50) NOT NULL, UNIQUE INDEX `_RecipeToRecipeTag_AB_unique`(`A`, `B`), INDEX `_RecipeToRecipeTag_B_index`(`B`) ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeTag' AND INDEX_NAME = '_RecipeToRecipeTag_AB_unique');
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `_RecipeToRecipeTag_AB_unique` ON `_RecipeToRecipeTag`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeTag' AND INDEX_NAME = '_RecipeToRecipeTag_B_index');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `_RecipeToRecipeTag_B_index` ON `_RecipeToRecipeTag`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @recipe_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'recipe' OR TABLE_NAME = 'Recipe')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeTag' AND CONSTRAINT_NAME = '_RecipeToRecipeTag_A_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @recipe_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_RecipeToRecipeTag` ADD CONSTRAINT `_RecipeToRecipeTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `', @recipe_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @recipetag_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'recipetag' OR TABLE_NAME = 'RecipeTag')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeTag' AND CONSTRAINT_NAME = '_RecipeToRecipeTag_B_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @recipetag_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_RecipeToRecipeTag` ADD CONSTRAINT `_RecipeToRecipeTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `', @recipetag_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 4. _RecipeToRecipeAllergen relation table
-- ============================================================
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeAllergen');
SET @sql := IF(@tbl_exists = 0,
  'CREATE TABLE `_RecipeToRecipeAllergen` ( `A` VARCHAR(50) NOT NULL, `B` VARCHAR(50) NOT NULL, UNIQUE INDEX `_RecipeToRecipeAllergen_AB_unique`(`A`, `B`), INDEX `_RecipeToRecipeAllergen_B_index`(`B`) ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeAllergen' AND INDEX_NAME = '_RecipeToRecipeAllergen_AB_unique');
SET @sql := IF(@idx_exists = 0, 'CREATE UNIQUE INDEX `_RecipeToRecipeAllergen_AB_unique` ON `_RecipeToRecipeAllergen`(`A`, `B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeAllergen' AND INDEX_NAME = '_RecipeToRecipeAllergen_B_index');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `_RecipeToRecipeAllergen_B_index` ON `_RecipeToRecipeAllergen`(`B`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @recipe_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'recipe' OR TABLE_NAME = 'Recipe')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeAllergen' AND CONSTRAINT_NAME = '_RecipeToRecipeAllergen_A_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @recipe_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_RecipeToRecipeAllergen` ADD CONSTRAINT `_RecipeToRecipeAllergen_A_fkey` FOREIGN KEY (`A`) REFERENCES `', @recipe_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @recipeallergen_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'recipeallergen' OR TABLE_NAME = 'RecipeAllergen')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeAllergen' AND CONSTRAINT_NAME = '_RecipeToRecipeAllergen_B_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @recipeallergen_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `_RecipeToRecipeAllergen` ADD CONSTRAINT `_RecipeToRecipeAllergen_B_fkey` FOREIGN KEY (`B`) REFERENCES `', @recipeallergen_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 5. Foreign Key Repair for importrecord and savedarticle
-- ============================================================

-- importrecord.batchId -> importbatch.id
SET @importbatch_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'importbatch' OR TABLE_NAME = 'ImportBatch')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @importrecord_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'importrecord' OR TABLE_NAME = 'ImportRecord')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @importrecord_tbl AND CONSTRAINT_NAME = 'ImportRecord_batchId_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @importrecord_tbl IS NOT NULL AND @importbatch_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `', @importrecord_tbl, '` ADD CONSTRAINT `ImportRecord_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `', @importbatch_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- savedarticle.postId -> post.id
SET @post_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'post' OR TABLE_NAME = 'Post')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @savedarticle_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'savedarticle' OR TABLE_NAME = 'SavedArticle')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @savedarticle_tbl AND CONSTRAINT_NAME = 'SavedArticle_postId_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @savedarticle_tbl IS NOT NULL AND @post_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `', @savedarticle_tbl, '` ADD CONSTRAINT `SavedArticle_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `', @post_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- savedarticle.userId -> user.id
SET @user_tbl := (
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME = 'user' OR TABLE_NAME = 'User')
  ORDER BY TABLE_NAME DESC LIMIT 1
);
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @savedarticle_tbl AND CONSTRAINT_NAME = 'SavedArticle_userId_fkey'
);
SET @sql := IF(@fk_exists = 0 AND @savedarticle_tbl IS NOT NULL AND @user_tbl IS NOT NULL,
  CONCAT('ALTER TABLE `', @savedarticle_tbl, '` ADD CONSTRAINT `SavedArticle_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `', @user_tbl, '`(`id`) ON DELETE CASCADE ON UPDATE CASCADE'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
