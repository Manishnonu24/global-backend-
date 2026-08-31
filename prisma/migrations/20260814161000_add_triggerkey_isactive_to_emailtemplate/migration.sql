-- Migration: 20260814161000_add_triggerkey_isactive_to_emailtemplate
-- Purpose: Safely add triggerKey and isActive columns to emailtemplate table, plus composite index EmailTemplate_siteId_triggerKey_idx.
-- Production Safety: Idempotent with INFORMATION_SCHEMA checks to prevent data loss or duplicate column/index errors.

SET @emailtemplate_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(LOWER(TABLE_NAME)) = BINARY('emailtemplate'));

-- 1. Add triggerKey column if it does not exist
SET @triggerkey_exists := IF(@emailtemplate_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('emailtemplate')
    AND BINARY(COLUMN_NAME) = BINARY('triggerKey')
), 0);

SET @sql := IF(
  @emailtemplate_exists > 0 AND @triggerkey_exists = 0,
  'ALTER TABLE `emailtemplate` ADD COLUMN `triggerKey` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Add isActive column if it does not exist
SET @isactive_exists := IF(@emailtemplate_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('emailtemplate')
    AND BINARY(COLUMN_NAME) = BINARY('isActive')
), 0);

SET @sql := IF(
  @emailtemplate_exists > 0 AND @isactive_exists = 0,
  'ALTER TABLE `emailtemplate` ADD COLUMN `isActive` TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Add EmailTemplate_siteId_triggerKey_idx index if it does not exist
SET @idx_exists := IF(@emailtemplate_exists > 0, (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(LOWER(TABLE_NAME)) = BINARY('emailtemplate')
    AND BINARY(INDEX_NAME) = BINARY('EmailTemplate_siteId_triggerKey_idx')
), 0);

SET @sql := IF(
  @emailtemplate_exists > 0 AND @idx_exists = 0,
  'CREATE INDEX `EmailTemplate_siteId_triggerKey_idx` ON `emailtemplate`(`siteId`, `triggerKey`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
