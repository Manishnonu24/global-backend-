-- Migration: 20260824130000_add_page_seo_keywords
-- Purpose: Add editable meta keywords/tags for CMS pages.

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'page'
    AND COLUMN_NAME = 'seoKeywords'
);

SET @statement := IF(
  @column_exists = 0,
  'ALTER TABLE `page` ADD COLUMN `seoKeywords` TEXT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
