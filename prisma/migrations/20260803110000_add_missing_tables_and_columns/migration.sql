-- Safe additive forward migration for missing tables and columns

-- Create Table community_events if not exists
CREATE TABLE IF NOT EXISTS `community_events` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'MINDFULNESS WALK',
    `description` TEXT NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `eventDate` VARCHAR(191) NULL DEFAULT 'Sat, 27 July 2024',
    `eventTime` VARCHAR(191) NULL DEFAULT '9:00 AM – 11:30 AM',
    `location` VARCHAR(191) NULL DEFAULT 'City Nature Park',
    `tags` VARCHAR(191) NULL DEFAULT 'Mindfulness, Outdoor, Beginner Friendly',
    `reservedSeats` INTEGER NOT NULL DEFAULT 45,
    `totalSeats` INTEGER NOT NULL DEFAULT 60,
    `isFeatured` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `community_events_siteId_isFeatured_idx`(`siteId`, `isFeatured`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Table importbatch if not exists
CREATE TABLE IF NOT EXISTS `importbatch` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(20) NOT NULL,
    `targetModel` VARCHAR(50) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `successRows` INTEGER NOT NULL DEFAULT 0,
    `failedRows` INTEGER NOT NULL DEFAULT 0,
    `errorLog` JSON NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `rolledBackAt` DATETIME(3) NULL,

    INDEX `ImportBatch_siteId_idx`(`siteId`),
    INDEX `ImportBatch_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Table importrecord if not exists
CREATE TABLE IF NOT EXISTS `importrecord` (
    `id` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `targetModel` VARCHAR(50) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `previousData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportRecord_batchId_idx`(`batchId`),
    INDEX `ImportRecord_targetModel_recordId_idx`(`targetModel`, `recordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Table recentlyviewed if not exists
CREATE TABLE IF NOT EXISTS `recentlyviewed` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `contentType` VARCHAR(50) NOT NULL,
    `contentId` VARCHAR(100) NOT NULL,
    `viewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RecentlyViewed_userId_contentType_contentId_key`(`userId`, `contentType`, `contentId`),
    INDEX `RecentlyViewed_userId_viewedAt_idx`(`userId`, `viewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create Table savedarticle if not exists
CREATE TABLE IF NOT EXISTS `savedarticle` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SavedArticle_postId_idx`(`postId`),
    INDEX `SavedArticle_userId_fkey`(`userId`),
    UNIQUE INDEX `SavedArticle_postId_userId_key`(`postId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add missing columns to ad table safely
SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ad' AND COLUMN_NAME = 'headline');
SET @sql := IF(@column_exists = 0, 'ALTER TABLE `ad` ADD COLUMN `headline` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ad' AND COLUMN_NAME = 'description');
SET @sql := IF(@column_exists = 0, 'ALTER TABLE `ad` ADD COLUMN `description` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ad' AND COLUMN_NAME = 'ctaText');
SET @sql := IF(@column_exists = 0, 'ALTER TABLE `ad` ADD COLUMN `ctaText` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ad' AND COLUMN_NAME = 'maxClicks');
SET @sql := IF(@column_exists = 0, 'ALTER TABLE `ad` ADD COLUMN `maxClicks` INTEGER NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ad' AND COLUMN_NAME = 'ctaColor');
SET @sql := IF(@column_exists = 0, 'ALTER TABLE `ad` ADD COLUMN `ctaColor` VARCHAR(20) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill section.siteId from page.siteId if section.siteId is null
UPDATE `section` s JOIN `page` p ON s.`pageId` = p.`id` SET s.`siteId` = p.`siteId` WHERE s.`siteId` IS NULL;
