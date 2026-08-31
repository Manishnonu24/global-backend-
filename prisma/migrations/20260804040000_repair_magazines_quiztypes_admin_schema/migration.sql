-- Forward migration: 20260804040000_repair_magazines_quiztypes_admin_schema
-- Authoritative, non-destructive forward repair for Magazines, QuizType, Admin routes, Implicit relation tables, and Foreign Keys.

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
-- 2. Magazines Table Repair & Safeguards
-- ============================================================

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines');
SET @sql := IF(@tbl_exists = 0,
  'CREATE TABLE `magazines` ( `idMagazines` INT NOT NULL AUTO_INCREMENT, `magazine_id` VARCHAR(255) NOT NULL, `magazine_title` VARCHAR(255) NOT NULL, `magazine_description` TEXT NOT NULL, `magazine_introduction` TEXT NULL, `magazine_back_image` VARCHAR(255) NULL, `magazine_spine_image` VARCHAR(255) NULL, `magazine_tags` VARCHAR(255) NOT NULL, `magazine_cover_image` VARCHAR(255) NOT NULL, `magazine_link` VARCHAR(255) NOT NULL, `magazine_date` DATE NOT NULL, `magazine_category` VARCHAR(255) NOT NULL, `MagCloudLink` VARCHAR(255) NOT NULL, `magazine_slug` VARCHAR(191) NOT NULL, `status` INT NOT NULL DEFAULT 1, `magazine_timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `publisher_socials` JSON NULL, `inside_issue` JSON NULL, `canonical_url` VARCHAR(255) NULL, `json_ld` JSON NULL, `og_image` VARCHAR(255) NULL, `seo_description` TEXT NULL, `seo_title` VARCHAR(255) NULL, `site_id` VARCHAR(255) NULL, UNIQUE INDEX `magazines_magazine_slug_key`(`magazine_slug`), PRIMARY KEY (`idMagazines`) ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.site_id exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'site_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `site_id` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.seo_title exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'seo_title');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `seo_title` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.seo_description exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'seo_description');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `seo_description` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.og_image exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'og_image');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `og_image` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.canonical_url exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'canonical_url');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `canonical_url` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.json_ld exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'json_ld');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `json_ld` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.publisher_socials exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'publisher_socials');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `publisher_socials` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure magazines.inside_issue exists
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'inside_issue');
SET @sql := IF(@col = 0, 'ALTER TABLE `magazines` ADD COLUMN `inside_issue` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Check and safely convert magazines.status column type if it was created as VARCHAR
SET @status_is_varchar := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'status' AND DATA_TYPE = 'varchar'
);
SET @sql := IF(@status_is_varchar > 0,
  'UPDATE `magazines` SET `status` = IF(`status` REGEXP "^[0-9]+$", CAST(`status` AS UNSIGNED), 1) WHERE `status` IS NOT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@status_is_varchar > 0,
  'ALTER TABLE `magazines` MODIFY COLUMN `status` INT NOT NULL DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 3. QuizType Table Repair & Safeguards
-- ============================================================

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types');
SET @sql := IF(@tbl_exists = 0,
  'CREATE TABLE `quiz_types` ( `id` INT NOT NULL AUTO_INCREMENT, `slug` VARCHAR(191) NOT NULL, `title` VARCHAR(200) NOT NULL, `subtitle` VARCHAR(300) NULL, `description` TEXT NOT NULL, `category` VARCHAR(255) NOT NULL, `categoryColor` VARCHAR(20) NOT NULL DEFAULT "#0f7c85", `imageUrl` VARCHAR(500) NULL, `icon` VARCHAR(10) NULL, `estimatedMinutes` INT NOT NULL DEFAULT 5, `difficulty` VARCHAR(255) NOT NULL DEFAULT "Beginner", `isActive` TINYINT(1) NOT NULL DEFAULT 1, `sortOrder` INT NOT NULL DEFAULT 0, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), `canonicalUrl` VARCHAR(255) NULL, `jsonLd` JSON NULL, `ogImage` VARCHAR(255) NULL, `seoDescription` TEXT NULL, `seoTitle` VARCHAR(255) NULL, `siteId` VARCHAR(255) NULL, UNIQUE INDEX `quiz_types_slug_key`(`slug`), PRIMARY KEY (`id`) ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Check and safely convert quiz_types.id column type if it was created as VARCHAR
SET @id_is_varchar := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'id' AND DATA_TYPE = 'varchar'
);
SET @sql := IF(@id_is_varchar > 0,
  'ALTER TABLE `quiz_types` MODIFY COLUMN `id` INT NOT NULL AUTO_INCREMENT',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure quiz_types columns exist
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'siteId');
SET @sql := IF(@col = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `siteId` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'seoTitle');
SET @sql := IF(@col = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'seoDescription');
SET @sql := IF(@col = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'ogImage');
SET @sql := IF(@col = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'canonicalUrl');
SET @sql := IF(@col = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@col = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 4. Admin Route Columns Repair (page, service, legalpage, recipe, globalsettings)
-- ============================================================

-- page
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateKey');
SET @sql := IF(@col = 0, 'ALTER TABLE `page` ADD COLUMN `templateKey` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateVersion');
SET @sql := IF(@col = 0, 'ALTER TABLE `page` ADD COLUMN `templateVersion` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'price');
SET @sql := IF(@col = 0, 'ALTER TABLE `service` ADD COLUMN `price` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'seoTitle');
SET @sql := IF(@col = 0, 'ALTER TABLE `service` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'seoDescription');
SET @sql := IF(@col = 0, 'ALTER TABLE `service` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'canonicalUrl');
SET @sql := IF(@col = 0, 'ALTER TABLE `service` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'ogImage');
SET @sql := IF(@col = 0, 'ALTER TABLE `service` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@col = 0, 'ALTER TABLE `service` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- legalpage
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage' AND COLUMN_NAME = 'deletedAt');
SET @sql := IF(@col = 0, 'ALTER TABLE `legalpage` ADD COLUMN `deletedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- recipe
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'deletedAt');
SET @sql := IF(@col = 0, 'ALTER TABLE `recipe` ADD COLUMN `deletedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- globalsettings
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'globalsettings' AND COLUMN_NAME = 'websiteSettings');
SET @sql := IF(@col = 0, 'ALTER TABLE `globalsettings` ADD COLUMN `websiteSettings` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 5. Implicit Relation Join Tables Repair
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
