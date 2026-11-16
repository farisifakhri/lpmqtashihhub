-- B-22: Alur Hasil Verifikasi: SLA 3 Hasil, Pengiriman Otomatis, dan Dispatch Error Tracking

-- AlterTable verification_assignments
ALTER TABLE `verification_assignments`
    ADD COLUMN `result_sent_at` DATETIME(3) NULL,
    ADD COLUMN `sla_outcome` ENUM('EARLY', 'ON_TIME', 'LATE') NULL,
    ADD COLUMN `sla_working_days_used` INTEGER NULL;

-- CreateIndex
CREATE INDEX `verification_assignments_verifier_id_sla_outcome_idx` ON `verification_assignments`(`verifier_id`, `sla_outcome`);

-- AlterTable verification_documents
ALTER TABLE `verification_documents`
    ADD COLUMN `dispatch_error` TEXT NULL;
