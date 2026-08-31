-- Guarded repair migration for comment system

-- 1. Ensure table casing: rename `Comment` -> `comment` if PascalCase exists and lower_case does not exist
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('Comment'));
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment'));
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Comment` TO `comment`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ensure `postId` is nullable VARCHAR(50)
SET @col_is_not_null := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(COLUMN_NAME) = BINARY('postId') AND BINARY(IS_NULLABLE) = BINARY('NO'));
SET @sql := IF(@col_is_not_null > 0, 'ALTER TABLE `comment` MODIFY `postId` VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Ensure `magazineId` column exists
SET @mag_col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(COLUMN_NAME) = BINARY('magazineId'));
SET @sql := IF(@mag_col_exists = 0, 'ALTER TABLE `comment` ADD COLUMN `magazineId` INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Ensure index `Comment_magazineId_idx` exists
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(INDEX_NAME) = BINARY('Comment_magazineId_idx'));
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `Comment_magazineId_idx` ON `comment`(`magazineId`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Ensure foreign key `Comment_magazineId_fkey` exists
SET @fk_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE()) AND BINARY(TABLE_NAME) = BINARY('comment') AND BINARY(CONSTRAINT_NAME) = BINARY('Comment_magazineId_fkey'));
SET @sql := IF(@fk_exists = 0, 'ALTER TABLE `comment` ADD CONSTRAINT `Comment_magazineId_fkey` FOREIGN KEY (`magazineId`) REFERENCES `magazines`(`idMagazines`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
