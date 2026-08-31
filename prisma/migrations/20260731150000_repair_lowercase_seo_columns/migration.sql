-- Repair lower-case tables that may have missed the additive SEO migration.
-- Some deployments reached the normalized lower-case table names without all
-- SEO columns from 20260730160000 being present.

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post'
    AND COLUMN_NAME = 'jsonLd'
);
SET @table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `post` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'seoTitle'
);
SET @table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `service` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'seoDescription'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `service` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'canonicalUrl'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `service` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'ogImage'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `service` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND COLUMN_NAME = 'jsonLd'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `service` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'legalpage'
    AND COLUMN_NAME = 'seoTitle'
);
SET @table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'legalpage'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'legalpage'
    AND COLUMN_NAME = 'seoDescription'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'legalpage'
    AND COLUMN_NAME = 'canonicalUrl'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'legalpage'
    AND COLUMN_NAME = 'ogImage'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'legalpage'
    AND COLUMN_NAME = 'jsonLd'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recipe'
    AND COLUMN_NAME = 'seoTitle'
);
SET @table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recipe'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recipe'
    AND COLUMN_NAME = 'seoDescription'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recipe'
    AND COLUMN_NAME = 'canonicalUrl'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recipe'
    AND COLUMN_NAME = 'ogImage'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recipe'
    AND COLUMN_NAME = 'jsonLd'
);
SET @sql := IF(@table_exists > 0 AND @column_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
