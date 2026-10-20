-- CreateTable
CREATE TABLE `publisher_registrations` (
    `id` VARCHAR(191) NOT NULL,
    `registration_code` VARCHAR(64) NOT NULL,
    `publisher_type` ENUM('PERUSAHAAN', 'YAYASAN', 'LEMBAGA_PEMERINTAH') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NOT NULL,
    `pic_name` VARCHAR(255) NOT NULL,
    `pic_phone` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `npwp` VARCHAR(50) NOT NULL,
    `nib` VARCHAR(50) NULL,
    `active_npwp` VARCHAR(50) NULL,
    `active_nib` VARCHAR(50) NULL,
    `status` ENUM('DIAJUKAN', 'PERLU_PERBAIKAN', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'DIAJUKAN',
    `reason` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `decided_at` DATETIME(3) NULL,
    `decided_by_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `publisher_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pub_reg_code_key`(`registration_code`),
    UNIQUE INDEX `pub_reg_active_npwp_key`(`active_npwp`),
    UNIQUE INDEX `pub_reg_active_nib_key`(`active_nib`),
    UNIQUE INDEX `pub_reg_user_id_key`(`user_id`),
    UNIQUE INDEX `pub_reg_publisher_id_key`(`publisher_id`),
    INDEX `pub_reg_status_created_idx`(`status`, `created_at`),
    INDEX `pub_reg_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publisher_registration_documents` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `document_type` ENUM('SURAT_PENDAFTARAN', 'AKTA_NOTARIS', 'PROFIL', 'NPWP', 'NIB', 'KTP_PENANGGUNG_JAWAB') NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_hash` VARCHAR(64) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    `has_links` BOOLEAN NOT NULL DEFAULT false,
    `detected_links` JSON NULL,
    `is_replaced` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `pub_reg_docs_reg_doc_type_idx`(`registration_id`, `document_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publisher_revision_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pub_rev_tokens_token_hash_key`(`token_hash`),
    INDEX `pub_rev_tokens_reg_expires_idx`(`registration_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `publisher_registrations` ADD CONSTRAINT `publisher_registrations_decided_by_id_fkey` FOREIGN KEY (`decided_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publisher_registrations` ADD CONSTRAINT `publisher_registrations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publisher_registrations` ADD CONSTRAINT `publisher_registrations_publisher_id_fkey` FOREIGN KEY (`publisher_id`) REFERENCES `publishers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publisher_registration_documents` ADD CONSTRAINT `publisher_registration_documents_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `publisher_registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publisher_revision_tokens` ADD CONSTRAINT `publisher_revision_tokens_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `publisher_registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

