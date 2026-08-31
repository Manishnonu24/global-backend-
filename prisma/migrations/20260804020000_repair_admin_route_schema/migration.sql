-- Route-critical admin schema repair migration: 20260804020000_repair_admin_route_schema
-- Additive, guarded, idempotent repair for all Global Backend routes:
-- /dashboard/pages, /dashboard/blogs, /dashboard/services, /dashboard/seo.

-- ============================================================
-- 1. Unmapped Table-Case Normalization Guards
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
-- 2. Page & GlobalSettings Schema Verification & Columns
-- ============================================================

-- page.templateKey
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateKey');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `page` ADD COLUMN `templateKey` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- page.templateVersion (VARCHAR)
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateVersion');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `page` ADD COLUMN `templateVersion` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- globalsettings.websiteSettings
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'globalsettings' AND COLUMN_NAME = 'websiteSettings');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `globalsettings` ADD COLUMN `websiteSettings` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 3. Service Model Columns Guard
-- ============================================================

-- service.seoTitle
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'seoTitle');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `seoTitle` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service.seoDescription
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'seoDescription');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service.canonicalUrl
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'canonicalUrl');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `canonicalUrl` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service.ogImage
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'ogImage');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `ogImage` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service.jsonLd
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service.deletedAt
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'deletedAt');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `deletedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 4. SEO Manager Mapped Model Columns Guard
-- ============================================================

-- magazines.site_id
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'site_id');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `site_id` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- magazines.seo_title
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'seo_title');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `seo_title` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- magazines.seo_description
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'seo_description');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `seo_description` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- magazines.og_image
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'og_image');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `og_image` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- magazines.canonical_url
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'canonical_url');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `canonical_url` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- magazines.json_ld
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'json_ld');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `json_ld` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- magazines.publisher_socials
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'publisher_socials');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `publisher_socials` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- magazines.inside_issue
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'magazines' AND COLUMN_NAME = 'inside_issue');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `magazines` ADD COLUMN `inside_issue` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- quiz_types.siteId
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'siteId');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `siteId` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- quiz_types.seoTitle
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'seoTitle');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- quiz_types.seoDescription
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'seoDescription');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- quiz_types.ogImage
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'ogImage');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- quiz_types.canonicalUrl
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'canonicalUrl');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- quiz_types.jsonLd
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_types' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `quiz_types` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- recipe.deletedAt
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'deletedAt');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `deletedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- legalpage.deletedAt
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage' AND COLUMN_NAME = 'deletedAt');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `deletedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================
-- 5. Foreign Key Constraints Repair for importrecord and savedarticle
-- ============================================================

-- importrecord.batchId -> importbatch.id
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'importrecord' AND CONSTRAINT_NAME = 'ImportRecord_batchId_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `importrecord` ADD CONSTRAINT `ImportRecord_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `importbatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- savedarticle.postId -> post.id
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'savedarticle' AND CONSTRAINT_NAME = 'SavedArticle_postId_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `savedarticle` ADD CONSTRAINT `SavedArticle_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- savedarticle.userId -> user.id
SET @fk_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'savedarticle' AND CONSTRAINT_NAME = 'SavedArticle_userId_fkey'
);
SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE `savedarticle` ADD CONSTRAINT `SavedArticle_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
