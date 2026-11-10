-- CreateTable
CREATE TABLE `master_mushaf_requests` (
    `id` VARCHAR(191) NOT NULL,
    `request_code` VARCHAR(40) NOT NULL,
    `applicant_name` VARCHAR(255) NOT NULL,
    `address` TEXT NOT NULL,
    `province_code` VARCHAR(16) NOT NULL,
    `province_name` VARCHAR(120) NOT NULL,
    `regency_code` VARCHAR(16) NOT NULL,
    `regency_name` VARCHAR(120) NOT NULL,
    `district_code` VARCHAR(16) NOT NULL,
    `district_name` VARCHAR(120) NOT NULL,
    `postal_code` VARCHAR(10) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `institution` VARCHAR(255) NOT NULL,
    `mushaf_type` VARCHAR(80) NOT NULL,
    `mushaf_type_label` VARCHAR(255) NOT NULL,
    `intended_use` TEXT NOT NULL,
    `statement_agreed_at` DATETIME(3) NOT NULL,
    `status` ENUM('DIAJUKAN', 'DIPROSES', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'DIAJUKAN',
    `admin_note` TEXT NULL,
    `processed_at` DATETIME(3) NULL,
    `processed_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `master_req_code_key`(`request_code`),
    INDEX `master_req_status_created_idx`(`status`, `created_at`),
    INDEX `master_req_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_mushaf_request_documents` (
    `id` VARCHAR(191) NOT NULL,
    `request_id` VARCHAR(191) NOT NULL,
    `document_type` ENUM('SURAT_PERMOHONAN', 'PROFIL_PEMOHON') NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_hash` VARCHAR(64) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `master_req_docs_req_type_idx`(`request_id`, `document_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `master_mushaf_requests` ADD CONSTRAINT `master_mushaf_requests_processed_by_id_fkey` FOREIGN KEY (`processed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_mushaf_request_documents` ADD CONSTRAINT `master_mushaf_request_documents_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `master_mushaf_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

