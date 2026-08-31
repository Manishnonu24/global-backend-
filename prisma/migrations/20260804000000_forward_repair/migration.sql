-- ============================================================
-- Forward repair migration: 20260804000000_forward_repair
-- Additive, idempotent, safe after partial failure.
-- Handles both PascalCase (Linux fresh) and lowercase (post-normalize) table names.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. TABLE CASE NORMALIZATION (Linux case-sensitive only)
-- On lower_case_table_names=0 (Linux default), PascalCase tables
-- must be renamed to lowercase to match the Prisma schema.
-- On lower_case_table_names=1 (Windows/macOS), this is a no-op
-- because the CREATE TABLE already stored as lowercase.
-- We use INFORMATION_SCHEMA to detect each variant before acting.
-- ----------------------------------------------------------------

-- Site -> site
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Site');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'site');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Site` TO `site`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- User -> user
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'User');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'user');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `User` TO `user`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SiteUser -> siteuser
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'SiteUser');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'siteuser');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `SiteUser` TO `siteuser`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- GlobalSettings -> globalsettings
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'GlobalSettings');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'globalsettings');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `GlobalSettings` TO `globalsettings`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Page -> page
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Page');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'page');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Page` TO `page`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Section -> section
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Section');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'section');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Section` TO `section`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Post -> post
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Post');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE BINARY(TABLE_NAME) = 'post' AND TABLE_SCHEMA = DATABASE());
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Post` TO `post`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Category -> category
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Category');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'category');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Category` TO `category`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Tag -> tag
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Tag');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'tag');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Tag` TO `tag`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Media -> media
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Media');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'media');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Media` TO `media`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- MediaFolder -> mediafolder
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'MediaFolder');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'mediafolder');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `MediaFolder` TO `mediafolder`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Service -> service
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Service');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'service');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Service` TO `service`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- LegalPage -> legalpage
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'LegalPage');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'legalpage');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `LegalPage` TO `legalpage`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Recipe -> recipe
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Recipe');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'recipe');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Recipe` TO `recipe`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- AuditLog -> auditlog
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'AuditLog');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'auditlog');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `AuditLog` TO `auditlog`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- LoginHistory -> loginhistory
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'LoginHistory');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'loginhistory');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `LoginHistory` TO `loginhistory`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- TwoFactor -> twofactor
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'TwoFactor');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'twofactor');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `TwoFactor` TO `twofactor`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PasswordReset -> passwordreset
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'PasswordReset');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'passwordreset');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `PasswordReset` TO `passwordreset`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- FrontendProject -> frontendproject
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'FrontendProject');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'frontendproject');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `FrontendProject` TO `frontendproject`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SyncedRoute -> syncedroute
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'SyncedRoute');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'syncedroute');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `SyncedRoute` TO `syncedroute`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- IntegrationManifest -> integrationmanifest
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'IntegrationManifest');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'integrationmanifest');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `IntegrationManifest` TO `integrationmanifest`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- WebhookEvent -> webhookevent
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'WebhookEvent');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'webhookevent');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `WebhookEvent` TO `webhookevent`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- WebhookSubscription -> webhooksubscription
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'WebhookSubscription');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'webhooksubscription');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `WebhookSubscription` TO `webhooksubscription`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Testimonial -> testimonial
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Testimonial');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'testimonial');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Testimonial` TO `testimonial`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Faq -> faq
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Faq');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'faq');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Faq` TO `faq`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- TeamMember -> teammember
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'TeamMember');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'teammember');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `TeamMember` TO `teammember`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Redirect -> redirect
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Redirect');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'redirect');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Redirect` TO `redirect`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- VisitorLog -> visitorlog
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'VisitorLog');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'visitorlog');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `VisitorLog` TO `visitorlog`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ContactFormSubmission -> contactformsubmission
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'ContactFormSubmission');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'contactformsubmission');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `ContactFormSubmission` TO `contactformsubmission`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Lead -> lead
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Lead');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'lead');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Lead` TO `lead`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ApiKey -> apikey
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'ApiKey');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'apikey');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `ApiKey` TO `apikey`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- IpBlock -> ipblock
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'IpBlock');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'ipblock');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `IpBlock` TO `ipblock`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SystemErrorLog -> systemerrorlog
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'SystemErrorLog');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'systemerrorlog');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `SystemErrorLog` TO `systemerrorlog`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- NotificationAlert -> notificationalert
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'NotificationAlert');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'notificationalert');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `NotificationAlert` TO `notificationalert`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Newsletter -> newsletter
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Newsletter');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'newsletter');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Newsletter` TO `newsletter`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ContentVersion -> contentversion
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'ContentVersion');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'contentversion');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `ContentVersion` TO `contentversion`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Subscriber -> subscriber
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'Subscriber');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'subscriber');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `Subscriber` TO `subscriber`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SubscriberList -> subscriberlist
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'SubscriberList');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'subscriberlist');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `SubscriberList` TO `subscriberlist`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SubscriberListMember -> subscriberlistmember
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'SubscriberListMember');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'subscriberlistmember');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `SubscriberListMember` TO `subscriberlistmember`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- EmailTemplate -> emailtemplate
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'EmailTemplate');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'emailtemplate');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `EmailTemplate` TO `emailtemplate`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- EmailCampaign -> emailcampaign
SET @pascal_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'EmailCampaign');
SET @lower_exists  := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY(TABLE_NAME) = 'emailcampaign');
SET @sql := IF(@pascal_exists > 0 AND @lower_exists = 0, 'RENAME TABLE `EmailCampaign` TO `emailcampaign`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 2. MISSING COLUMNS: recipe.deletedAt
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'deletedAt');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `deletedAt` DATETIME(3) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 3. MISSING COLUMNS: post.publisherSocials (guard for PascalCase-only DBs)
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post' AND COLUMN_NAME = 'publisherSocials');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `post` ADD COLUMN `publisherSocials` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- post.jsonLd
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'post' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `post` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 4. MISSING COLUMNS: page.templateKey and page.templateVersion (guard)
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateKey');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `page` ADD COLUMN `templateKey` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateVersion');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `page` ADD COLUMN `templateVersion` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 5. FIX: templateVersion type if it was created as INT (from temp_alter_db.mjs)
--    Only change it when it is currently INTEGER type.
-- ----------------------------------------------------------------
SET @col_type := (
  SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'page' AND COLUMN_NAME = 'templateVersion'
  LIMIT 1
);
SET @sql := IF(@col_type = 'int', 'ALTER TABLE `page` MODIFY COLUMN `templateVersion` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 6. MISSING COLUMNS: section.siteId and section.regionKey (guard)
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'section');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'section' AND COLUMN_NAME = 'siteId');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `section` ADD COLUMN `siteId` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'section');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'section' AND COLUMN_NAME = 'regionKey');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `section` ADD COLUMN `regionKey` VARCHAR(191) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 7. MISSING COLUMNS: user.image, user.socialLinks, user.legacyPasswordHash (guard)
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'image');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `user` ADD COLUMN `image` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'socialLinks');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `user` ADD COLUMN `socialLinks` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'legacyPasswordHash');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `user` ADD COLUMN `legacyPasswordHash` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 8. MISSING COLUMNS: service SEO fields (guard)
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'seoTitle');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'seoDescription');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'canonicalUrl');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'ogImage');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 9. MISSING COLUMNS: legalpage SEO fields (guard)
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage' AND COLUMN_NAME = 'seoTitle');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage' AND COLUMN_NAME = 'seoDescription');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage' AND COLUMN_NAME = 'canonicalUrl');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage' AND COLUMN_NAME = 'ogImage');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legalpage' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `legalpage` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 10. MISSING COLUMNS: recipe SEO fields (guard)
-- ----------------------------------------------------------------
SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'seoTitle');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `seoTitle` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'seoDescription');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `seoDescription` TEXT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'canonicalUrl');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `canonicalUrl` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'ogImage');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `ogImage` VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @tbl_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe');
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipe' AND COLUMN_NAME = 'jsonLd');
SET @sql := IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `recipe` ADD COLUMN `jsonLd` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 11. BACKFILL: section.siteId from page.siteId (idempotent)
-- ----------------------------------------------------------------
UPDATE `section` s JOIN `page` p ON s.`pageId` = p.`id` SET s.`siteId` = p.`siteId` WHERE s.`siteId` IS NULL;

-- ----------------------------------------------------------------
-- 12. NEW TABLE: componentcontent
-- Required by src/lib/componentContent.js and /api/dashboard/component-content
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `componentcontent` (
    `id`           VARCHAR(191) NOT NULL,
    `siteId`       VARCHAR(50)  NOT NULL,
    `pageSlug`     VARCHAR(100) NOT NULL,
    `componentKey` VARCHAR(50)  NOT NULL,
    `data`         JSON        NOT NULL,
    `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ComponentContent_siteId_pageSlug_componentKey_key`(`siteId`, `pageSlug`, `componentKey`),
    INDEX `ComponentContent_siteId_idx`(`siteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ----------------------------------------------------------------
-- 13. MISSING INDEX on WebhookSubscription.userId (guard)
-- ----------------------------------------------------------------
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'webhooksubscription' AND INDEX_NAME = 'WebhookSubscription_userId_fkey');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `WebhookSubscription_userId_fkey` ON `webhooksubscription`(`userId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 14. MISSING INDEX on media.folderId (guard)
-- ----------------------------------------------------------------
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND INDEX_NAME = 'Media_folderId_fkey');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `Media_folderId_fkey` ON `media`(`folderId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------
-- 15. MISSING INDEX on mediafolder.parentId (guard)
-- ----------------------------------------------------------------
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mediafolder' AND INDEX_NAME = 'MediaFolder_parentId_fkey');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `MediaFolder_parentId_fkey` ON `mediafolder`(`parentId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
