-- AlterTable registrations
ALTER TABLE `registrations` 
    MODIFY `status` ENUM('DRAFT', 'READY_FOR_VERIFICATION', 'VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'REVISION_REQUIRED', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED', 'AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED') NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `revision_source` VARCHAR(191) NULL;

-- AlterTable verification_documents
ALTER TABLE `verification_documents`
    MODIFY `document_type` ENUM('NOTA_DINAS_VERIFIKASI', 'SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI', 'LAMPIRAN_HASIL_VERIFIKASI') NOT NULL,
    MODIFY `status` ENUM('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'SIGNING', 'SIGNED', 'EMAIL_QUEUED', 'SENT', 'EMAIL_FAILED', 'REVOKED', 'ISSUED') NOT NULL DEFAULT 'DRAFT';

-- CreateTable verification_document_signatories
CREATE TABLE `verification_document_signatories` (
    `id` VARCHAR(191) NOT NULL,
    `document_id` VARCHAR(191) NOT NULL,
    `signer_user_id` VARCHAR(191) NOT NULL,
    `name_position_snapshot` VARCHAR(191) NOT NULL,
    `sign_order` INTEGER NOT NULL DEFAULT 1,
    `method` VARCHAR(191) NOT NULL DEFAULT 'DIGITAL',
    `status` ENUM('PENDING', 'SIGNED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `signed_at` DATETIME(3) NULL,
    `document_hash` VARCHAR(191) NULL,
    `external_signature_id` VARCHAR(191) NULL,
    `failure_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `verification_document_signatories_document_id_signer_user_idx`(`document_id`, `signer_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable email_outbox
CREATE TABLE `email_outbox` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NULL,
    `document_id` VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `recipient_email` VARCHAR(191) NOT NULL,
    `recipient_name` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `template` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `attachments_json` JSON NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'SYSTEM',
    `provider_message_id` VARCHAR(191) NULL,
    `status` ENUM('QUEUED', 'SENT', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `max_retries` INTEGER NOT NULL DEFAULT 3,
    `failure_reason` TEXT NULL,
    `queued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sent_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `email_outbox_idempotency_key_key`(`idempotency_key`),
    INDEX `email_outbox_registration_id_status_idx`(`registration_id`, `status`),
    INDEX `email_outbox_idempotency_key_idx`(`idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `verification_document_signatories` ADD CONSTRAINT `verification_document_signatories_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `verification_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_document_signatories` ADD CONSTRAINT `verification_document_signatories_signer_user_id_fkey` FOREIGN KEY (`signer_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

