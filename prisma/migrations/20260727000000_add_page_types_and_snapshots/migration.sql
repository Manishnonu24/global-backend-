-- AlterTable
ALTER TABLE `Page` ADD COLUMN `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pageType` ENUM('CODE_TEMPLATE', 'CMS_BUILT', 'SYSTEM') NOT NULL DEFAULT 'CMS_BUILT',
    ADD COLUMN `publishedSnapshot` JSON NULL,
    ADD COLUMN `showInNav` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Service` MODIFY `slug` VARCHAR(50) NULL;

-- CreateIndex
CREATE INDEX `Page_siteId_status_isEnabled_deletedAt_idx` ON `Page`(`siteId`, `status`, `isEnabled`, `deletedAt`);
