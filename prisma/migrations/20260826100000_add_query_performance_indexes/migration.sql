-- Migration: 20260826100000_add_query_performance_indexes
-- Purpose: Add production-safe query performance indexes for post, page, recipe, notificationalert, comment, and service

-- 1. Index: Post_siteId_status_deletedAt_publishedAt_createdAt_idx on post
SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post'
    AND INDEX_NAME = 'Post_siteId_status_deletedAt_publishedAt_createdAt_idx'
);

SET @statement := IF(
  @index_exists = 0,
  'CREATE INDEX `Post_siteId_status_deletedAt_publishedAt_createdAt_idx` ON `post`(`siteId`, `status`, `deletedAt`, `publishedAt`, `createdAt`)',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Index: Page_siteId_deletedAt_updatedAt_idx on page
SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'page'
    AND INDEX_NAME = 'Page_siteId_deletedAt_updatedAt_idx'
);

SET @statement := IF(
  @index_exists = 0,
  'CREATE INDEX `Page_siteId_deletedAt_updatedAt_idx` ON `page`(`siteId`, `deletedAt`, `updatedAt`)',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Index: Recipe_siteId_status_createdAt_idx on recipe
SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'recipe'
    AND INDEX_NAME = 'Recipe_siteId_status_createdAt_idx'
);

SET @statement := IF(
  @index_exists = 0,
  'CREATE INDEX `Recipe_siteId_status_createdAt_idx` ON `recipe`(`siteId`, `status`, `createdAt`)',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Index: NotificationAlert_siteId_createdAt_idx on notificationalert
SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notificationalert'
    AND INDEX_NAME = 'NotificationAlert_siteId_createdAt_idx'
);

SET @statement := IF(
  @index_exists = 0,
  'CREATE INDEX `NotificationAlert_siteId_createdAt_idx` ON `notificationalert`(`siteId`, `createdAt`)',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Index: NotificationAlert_siteId_isRead_idx on notificationalert
SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notificationalert'
    AND INDEX_NAME = 'NotificationAlert_siteId_isRead_idx'
);

SET @statement := IF(
  @index_exists = 0,
  'CREATE INDEX `NotificationAlert_siteId_isRead_idx` ON `notificationalert`(`siteId`, `isRead`)',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Index: Comment_siteId_postId_status_createdAt_idx on comment
SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'comment'
    AND INDEX_NAME = 'Comment_siteId_postId_status_createdAt_idx'
);

SET @statement := IF(
  @index_exists = 0,
  'CREATE INDEX `Comment_siteId_postId_status_createdAt_idx` ON `comment`(`siteId`, `postId`, `status`, `createdAt`)',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. Index: Service_siteId_status_visible_deletedAt_sortOrder_idx on service
SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'service'
    AND INDEX_NAME = 'Service_siteId_status_visible_deletedAt_sortOrder_idx'
);

SET @statement := IF(
  @index_exists = 0,
  'CREATE INDEX `Service_siteId_status_visible_deletedAt_sortOrder_idx` ON `service`(`siteId`, `status`, `visible`, `deletedAt`, `sortOrder`)',
  'SELECT 1'
);

PREPARE stmt FROM @statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
