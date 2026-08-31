-- Add template metadata fields used by code-template CMS pages.
-- Uses INFORMATION_SCHEMA check for MySQL 8 compatibility.

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateKey');
SET @sql := IF(@col = 0, 'ALTER TABLE `page` ADD COLUMN `templateKey` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateVersion');
SET @sql := IF(@col = 0, 'ALTER TABLE `page` ADD COLUMN `templateVersion` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
