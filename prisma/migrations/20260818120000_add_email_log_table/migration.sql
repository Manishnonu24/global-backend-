-- Migration: 20260818120000_add_email_log_table
-- Purpose: Add emaillog table and indexes for unified transactional, campaign, and system email logging.

CREATE TABLE IF NOT EXISTS `emaillog` (
  `id` VARCHAR(50) NOT NULL,
  `siteId` VARCHAR(100) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `triggerKey` VARCHAR(100) NULL,
  `campaignId` VARCHAR(100) NULL,
  `templateId` VARCHAR(100) NULL,
  `toEmail` VARCHAR(191) NOT NULL,
  `toName` VARCHAR(191) NULL,
  `fromEmail` VARCHAR(191) NULL,
  `subject` TEXT NULL,
  `provider` VARCHAR(50) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'queued',
  `errorMessage` TEXT NULL,
  `bodyPreview` TEXT NULL,
  `meta` JSON NULL,
  `sentAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `EmailLog_siteId_createdAt_idx` (`siteId`, `createdAt`),
  INDEX `EmailLog_siteId_status_idx` (`siteId`, `status`),
  INDEX `EmailLog_toEmail_idx` (`toEmail`),
  INDEX `EmailLog_triggerKey_idx` (`triggerKey`),
  CONSTRAINT `EmailLog_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `emailcampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
