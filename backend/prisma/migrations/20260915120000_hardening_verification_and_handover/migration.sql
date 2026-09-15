-- Update existing rows from APPROVED to PASSED if any
UPDATE `verification_assignments` SET `decision` = 'PASSED' WHERE `decision` = 'APPROVED';

-- AlterTable verification_assignments
ALTER TABLE `verification_assignments` MODIFY `decision` ENUM('PASSED', 'REVISION_REQUIRED', 'REJECTED') NULL;

-- AlterTable verification_documents
ALTER TABLE `verification_documents` ADD COLUMN `signature_status` ENUM('NOT_REQUESTED', 'PENDING', 'SIGNED', 'FAILED') NOT NULL DEFAULT 'NOT_REQUESTED';

