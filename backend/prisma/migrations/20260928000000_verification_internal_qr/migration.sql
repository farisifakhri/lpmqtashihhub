ALTER TABLE `verification_documents` ADD COLUMN `qr_token` VARCHAR(191) NULL;
UPDATE `verification_documents` SET `qr_token` = UUID();
ALTER TABLE `verification_documents` MODIFY COLUMN `qr_token` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `verification_documents_qr_token_key` ON `verification_documents`(`qr_token`);
ALTER TABLE `verification_document_signatories` ALTER COLUMN `method` SET DEFAULT 'INTERNAL_APPROVAL';
