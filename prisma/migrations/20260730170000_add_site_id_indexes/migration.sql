-- Additive index creation for QuizType siteId and Magazine site_id

CREATE INDEX `quiz_types_siteId_idx` ON `quiz_types`(`siteId`);
CREATE INDEX `magazines_site_id_idx` ON `magazines`(`site_id`);
