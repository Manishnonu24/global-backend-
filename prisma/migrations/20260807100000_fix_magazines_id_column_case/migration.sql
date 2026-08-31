-- Fix production state where magazines primary key was physically named
-- `idmagazines`, causing comment.magazineId FK verification to fail.

SET @comment_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
);

SET @magazines_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('magazines')
);

-- Drop the named FK first when it exists, even if it points at the wrong case.
SET @named_comment_mag_fk := IF(@comment_exists > 0, (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
    AND BINARY(CONSTRAINT_NAME) = BINARY('Comment_magazineId_fkey')
  LIMIT 1
), NULL);

SET @sql := IF(
  @named_comment_mag_fk IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @named_comment_mag_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop one remaining legacy FK on comment.magazineId, if a differently named
-- constraint exists.
SET @comment_mag_fk := IF(@comment_exists > 0, (
  SELECT kcu.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('magazineId')
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
), NULL);

SET @sql := IF(
  @comment_mag_fk IS NOT NULL,
  CONCAT('ALTER TABLE `comment` DROP FOREIGN KEY `', @comment_mag_fk, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @mag_id_lower_exists := IF(@magazines_exists > 0, (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('magazines')
    AND BINARY(COLUMN_NAME) = BINARY('idmagazines')
), 0);

SET @mag_id_exact_exists := IF(@magazines_exists > 0, (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('magazines')
    AND BINARY(COLUMN_NAME) = BINARY('idMagazines')
), 0);

SET @sql := IF(
  @mag_id_lower_exists > 0 AND @mag_id_exact_exists = 0,
  'ALTER TABLE `magazines` CHANGE COLUMN `idmagazines` `idMagazines` INT NOT NULL AUTO_INCREMENT',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @comment_mag_id_exists := IF(@comment_exists > 0, (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('comment')
    AND BINARY(COLUMN_NAME) = BINARY('magazineId')
), 0);

SET @mag_id_exact_exists := IF(@magazines_exists > 0, (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE BINARY(TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(TABLE_NAME) = BINARY('magazines')
    AND BINARY(COLUMN_NAME) = BINARY('idMagazines')
), 0);

SET @sql := IF(
  @comment_exists > 0 AND @magazines_exists > 0 AND @comment_mag_id_exists > 0 AND @mag_id_exact_exists > 0,
  'SET @orphaned_magids := (SELECT COUNT(*) FROM `comment` c WHERE c.`magazineId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `magazines` m WHERE m.`idMagazines` = c.`magazineId`))',
  'SET @orphaned_magids := 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @abort_mag_orphans := IF(
  @orphaned_magids > 0,
  'ALTER TABLE `_abort_comment_magazineId_has_orphaned_values` ENGINE = InnoDB',
  'SELECT 1'
);
PREPARE stmt FROM @abort_mag_orphans;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @mag_fk_count := IF(@comment_exists > 0, (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME = kcu.TABLE_NAME
   AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND BINARY(tc.CONSTRAINT_TYPE) = BINARY('FOREIGN KEY')
  WHERE BINARY(kcu.TABLE_SCHEMA) = BINARY(DATABASE())
    AND BINARY(kcu.TABLE_NAME) = BINARY('comment')
    AND BINARY(kcu.COLUMN_NAME) = BINARY('magazineId')
    AND BINARY(LOWER(kcu.REFERENCED_TABLE_NAME)) = BINARY('magazines')
    AND BINARY(kcu.REFERENCED_COLUMN_NAME) = BINARY('idMagazines')
), 0);

SET @sql := IF(
  @comment_exists > 0 AND @magazines_exists > 0 AND @comment_mag_id_exists > 0 AND @mag_id_exact_exists > 0 AND @mag_fk_count = 0,
  'ALTER TABLE `comment` ADD CONSTRAINT `Comment_magazineId_fkey` FOREIGN KEY (`magazineId`) REFERENCES `magazines`(`idMagazines`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
