-- AlterTable
ALTER TABLE `registrations` MODIFY `status` ENUM('DRAFT', 'READY_FOR_VERIFICATION', 'VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'REVISION_REQUIRED', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED', 'AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `verification_assignments` ADD COLUMN `assigned_by_id` VARCHAR(191) NULL,
    ADD COLUMN `assignment_notes` VARCHAR(191) NULL,
    ADD COLUMN `due_at` DATETIME(3) NULL,
    ADD COLUMN `started_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `physical_master_intakes` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `format` VARCHAR(191) NOT NULL DEFAULT 'A4',
    `binding_method` VARCHAR(191) NOT NULL DEFAULT 'PER_JUZ',
    `volume_count` INTEGER NULL,
    `sent_at` DATETIME(3) NULL,
    `delivery_method` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'RECEIVED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    `received_by_id` VARCHAR(191) NULL,
    `received_at` DATETIME(3) NULL,
    `condition` VARCHAR(191) NULL,
    `receipt_no` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `physical_master_intakes_registration_id_key`(`registration_id`),
    UNIQUE INDEX `physical_master_intakes_receipt_no_key`(`receipt_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_documents` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `assignment_id` VARCHAR(191) NULL,
    `document_type` ENUM('NOTA_DINAS_VERIFIKASI', 'SURAT_HASIL_VERIFIKASI') NOT NULL,
    `document_no` VARCHAR(191) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'ISSUED', 'APPROVED', 'SIGNED', 'SENT', 'RETURNED') NOT NULL DEFAULT 'DRAFT',
    `content_snapshot` JSON NULL,
    `file_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `approved_by_id` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `signed_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `sent_channel` VARCHAR(191) NULL,
    `sent_to` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verification_documents_document_no_key`(`document_no`),
    UNIQUE INDEX `verification_documents_registration_id_document_type_version_key`(`registration_id`, `document_type`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `physical_manuscript_handovers` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `from_user_id` VARCHAR(191) NOT NULL,
    `to_user_id` VARCHAR(191) NOT NULL,
    `stage` VARCHAR(191) NOT NULL DEFAULT 'VERIFICATION_TO_DISTRIBUTION',
    `receipt_no` VARCHAR(191) NULL,
    `condition` VARCHAR(191) NULL,
    `volume_count` INTEGER NULL,
    `handed_over_at` DATETIME(3) NULL,
    `received_at` DATETIME(3) NULL,
    `tashih_due_at` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'RECEIVED', 'RETURNED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `physical_manuscript_handovers_receipt_no_key`(`receipt_no`),
    INDEX `physical_manuscript_handovers_registration_id_status_idx`(`registration_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `verification_assignments_registration_id_status_idx` ON `verification_assignments`(`registration_id`, `status`);

-- AddForeignKey
ALTER TABLE `verification_assignments` ADD CONSTRAINT `verification_assignments_assigned_by_id_fkey` FOREIGN KEY (`assigned_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `physical_master_intakes` ADD CONSTRAINT `physical_master_intakes_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `physical_master_intakes` ADD CONSTRAINT `physical_master_intakes_received_by_id_fkey` FOREIGN KEY (`received_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_documents` ADD CONSTRAINT `verification_documents_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_documents` ADD CONSTRAINT `verification_documents_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `verification_assignments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_documents` ADD CONSTRAINT `verification_documents_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_documents` ADD CONSTRAINT `verification_documents_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `physical_manuscript_handovers` ADD CONSTRAINT `physical_manuscript_handovers_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `physical_manuscript_handovers` ADD CONSTRAINT `physical_manuscript_handovers_from_user_id_fkey` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `physical_manuscript_handovers` ADD CONSTRAINT `physical_manuscript_handovers_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
