-- Forward migration: 20260804030000_repair_taxonomy_and_admin_schema
-- Complete, safe, guarded repair for admin routes, unmapped table case normalization, implicit relation tables, and foreign keys.

-- ============================================================
-- 1. Table Case Normalization Guards (Unmapped Models)
-- ============================================================

-- CampaignLog -> campaignlog
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'CampaignLog');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'campaignlog');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `CampaignLog` TO `campaignlog`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PushNotification -> pushnotification
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'PushNotification');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'pushnotification');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `PushNotification` TO `pushnotification`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- CookieConsentLog -> cookieconsentlog
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'CookieConsentLog');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'cookieconsentlog');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `CookieConsentLog` TO `cookieconsentlog`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Comment -> comment
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Comment');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'comment');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Comment` TO `comment`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- AdZone -> adzone
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'AdZone');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'adzone');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `AdZone` TO `adzone`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Advertiser -> advertiser
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Advertiser');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'advertiser');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Advertiser` TO `advertiser`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- AdCampaign -> adcampaign
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'AdCampaign');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'adcampaign');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `AdCampaign` TO `adcampaign`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ad -> ad
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Ad');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'ad');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Ad` TO `ad`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- AdAnalytic -> adanalytic
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'AdAnalytic');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'adanalytic');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `AdAnalytic` TO `adanalytic`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- RecipeTag -> recipetag
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'RecipeTag');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'recipetag');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `RecipeTag` TO `recipetag`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- RecipeAllergen -> recipeallergen
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'RecipeAllergen');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'recipeallergen');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `RecipeAllergen` TO `recipeallergen`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- RecipeRating -> reciperating
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'RecipeRating');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'reciperating');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `RecipeRating` TO `reciperating`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- RecipeLike -> recipelike
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'RecipeLike');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'recipelike');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `RecipeLike` TO `recipelike`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- RecipeComment -> recipecomment
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'RecipeComment');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'recipecomment');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `RecipeComment` TO `recipecomment`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SavedRecipe -> savedrecipe
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'SavedRecipe');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'savedrecipe');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `SavedRecipe` TO `savedrecipe`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SavedArticle -> savedarticle
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'SavedArticle');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'savedarticle');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `SavedArticle` TO `savedarticle`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ImportBatch -> importbatch
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'ImportBatch');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'importbatch');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `ImportBatch` TO `importbatch`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ImportRecord -> importrecord
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'ImportRecord');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'importrecord');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `ImportRecord` TO `importrecord`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 2. Implicit Relation Join Tables Repair
-- ============================================================

-- _CategoryToPost
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

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CategoryToPost' AND CONSTRAINT_NAME = '_CategoryToPost_A_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_CategoryToPost` ADD CONSTRAINT `_CategoryToPost_A_fkey` FOREIGN KEY (`A`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_CategoryToPost' AND CONSTRAINT_NAME = '_CategoryToPost_B_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_CategoryToPost` ADD CONSTRAINT `_CategoryToPost_B_fkey` FOREIGN KEY (`B`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- _PostToTag
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

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_PostToTag' AND CONSTRAINT_NAME = '_PostToTag_A_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_PostToTag` ADD CONSTRAINT `_PostToTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_PostToTag' AND CONSTRAINT_NAME = '_PostToTag_B_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_PostToTag` ADD CONSTRAINT `_PostToTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- _RecipeToRecipeTag
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

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeTag' AND CONSTRAINT_NAME = '_RecipeToRecipeTag_A_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_RecipeToRecipeTag` ADD CONSTRAINT `_RecipeToRecipeTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeTag' AND CONSTRAINT_NAME = '_RecipeToRecipeTag_B_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_RecipeToRecipeTag` ADD CONSTRAINT `_RecipeToRecipeTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `recipetag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- _RecipeToRecipeAllergen
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

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeAllergen' AND CONSTRAINT_NAME = '_RecipeToRecipeAllergen_A_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_RecipeToRecipeAllergen` ADD CONSTRAINT `_RecipeToRecipeAllergen_A_fkey` FOREIGN KEY (`A`) REFERENCES `recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_RecipeToRecipeAllergen' AND CONSTRAINT_NAME = '_RecipeToRecipeAllergen_B_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `_RecipeToRecipeAllergen` ADD CONSTRAINT `_RecipeToRecipeAllergen_B_fkey` FOREIGN KEY (`B`) REFERENCES `recipeallergen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
