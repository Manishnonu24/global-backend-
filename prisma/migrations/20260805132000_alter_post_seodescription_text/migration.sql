-- Alter post.seoDescription to TEXT and post.slug to VARCHAR(191) to safely allow longer fields in MySQL database table
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post'
    AND COLUMN_NAME = 'seoDescription'
);
SET @table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post'
);
SET @sql := IF(@table_exists > 0 AND @column_exists > 0, 'ALTER TABLE `post` MODIFY COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Expand post.slug column to VARCHAR(191)
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post'
    AND COLUMN_NAME = 'slug'
);
SET @sql := IF(@table_exists > 0 AND @column_exists > 0, 'ALTER TABLE `post` MODIFY COLUMN `slug` VARCHAR(191) NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
