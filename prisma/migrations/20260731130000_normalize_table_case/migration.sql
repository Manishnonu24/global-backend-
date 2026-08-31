-- Safe table name normalization from PascalCase to canonical lowercase
-- Works safely on Linux (lower_case_table_names=0) and Windows/macOS (lower_case_table_names=1/2)

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Site');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'site');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Site` TO `_tmp_rename_site`, `_tmp_rename_site` TO `site`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'User');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'user');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `User` TO `_tmp_rename_user`, `_tmp_rename_user` TO `user`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'SiteUser');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'siteuser');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `SiteUser` TO `_tmp_rename_siteuser`, `_tmp_rename_siteuser` TO `siteuser`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Page');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'page');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Page` TO `_tmp_rename_page`, `_tmp_rename_page` TO `page`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Section');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'section');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Section` TO `_tmp_rename_section`, `_tmp_rename_section` TO `section`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Post');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'post');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Post` TO `_tmp_rename_post`, `_tmp_rename_post` TO `post`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Category');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'category');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Category` TO `_tmp_rename_category`, `_tmp_rename_category` TO `category`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Comment');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'comment');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Comment` TO `_tmp_rename_comment`, `_tmp_rename_comment` TO `comment`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Tag');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'tag');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Tag` TO `_tmp_rename_tag`, `_tmp_rename_tag` TO `tag`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'MediaFolder');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'mediafolder');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `MediaFolder` TO `_tmp_rename_mediafolder`, `_tmp_rename_mediafolder` TO `mediafolder`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Media');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'media');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Media` TO `_tmp_rename_media`, `_tmp_rename_media` TO `media`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Service');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'service');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Service` TO `_tmp_rename_service`, `_tmp_rename_service` TO `service`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Recipe');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'recipe');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Recipe` TO `_tmp_rename_recipe`, `_tmp_rename_recipe` TO `recipe`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'LegalPage');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'legalpage');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `LegalPage` TO `_tmp_rename_legalpage`, `_tmp_rename_legalpage` TO `legalpage`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_upper := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'Ad');
SET @has_lower := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = 'ad');
SET @sql := IF(@has_upper > 0 AND @has_lower = 0, 'RENAME TABLE `Ad` TO `_tmp_rename_ad`, `_tmp_rename_ad` TO `ad`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
