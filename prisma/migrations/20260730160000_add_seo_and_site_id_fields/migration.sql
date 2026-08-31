-- Additive SEO and site ownership migration

-- Post
ALTER TABLE `Post` ADD COLUMN `jsonLd` JSON NULL;

-- Service
ALTER TABLE `Service` ADD COLUMN `seoTitle` VARCHAR(255) NULL,
    ADD COLUMN `seoDescription` TEXT NULL,
    ADD COLUMN `canonicalUrl` VARCHAR(255) NULL,
    ADD COLUMN `ogImage` VARCHAR(255) NULL,
    ADD COLUMN `jsonLd` JSON NULL;

-- LegalPage
ALTER TABLE `LegalPage` ADD COLUMN `seoTitle` VARCHAR(255) NULL,
    ADD COLUMN `seoDescription` TEXT NULL,
    ADD COLUMN `canonicalUrl` VARCHAR(255) NULL,
    ADD COLUMN `ogImage` VARCHAR(255) NULL,
    ADD COLUMN `jsonLd` JSON NULL;

-- quiz_types
ALTER TABLE `quiz_types` ADD COLUMN `siteId` VARCHAR(191) NULL,
    ADD COLUMN `seoTitle` VARCHAR(255) NULL,
    ADD COLUMN `seoDescription` TEXT NULL,
    ADD COLUMN `canonicalUrl` VARCHAR(255) NULL,
    ADD COLUMN `ogImage` VARCHAR(255) NULL,
    ADD COLUMN `jsonLd` JSON NULL;

-- magazines
ALTER TABLE `magazines` ADD COLUMN `site_id` VARCHAR(191) NULL,
    ADD COLUMN `seo_title` VARCHAR(255) NULL,
    ADD COLUMN `seo_description` TEXT NULL,
    ADD COLUMN `canonical_url` VARCHAR(255) NULL,
    ADD COLUMN `og_image` VARCHAR(255) NULL,
    ADD COLUMN `json_ld` JSON NULL;

-- Recipe
ALTER TABLE `Recipe` ADD COLUMN `seoTitle` VARCHAR(255) NULL,
    ADD COLUMN `seoDescription` TEXT NULL,
    ADD COLUMN `canonicalUrl` VARCHAR(255) NULL,
    ADD COLUMN `ogImage` VARCHAR(255) NULL,
    ADD COLUMN `jsonLd` JSON NULL;
