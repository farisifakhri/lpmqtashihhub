-- Sistem Pengaduan: pengaduan kesalahan cetak mushaf & pelayanan Surat Tanda Tashih/Izin Edar
-- beserta item kesalahan, lampiran, dan riwayat status (dilacak publik melalui kode pengaduan).

-- CreateTable
CREATE TABLE `complaints` (
    `id` VARCHAR(191) NOT NULL,
    `complaint_code` VARCHAR(40) NOT NULL,
    `type` ENUM('KESALAHAN_CETAK', 'PELAYANAN') NOT NULL,
    `status` ENUM('MENUNGGU_VERIFIKASI', 'DITERIMA', 'DITOLAK', 'DALAM_PROSES', 'MENUNGGU_TINDAK_LANJUT', 'SELESAI') NOT NULL DEFAULT 'MENUNGGU_VERIFIKASI',
    `reporter_name` VARCHAR(255) NOT NULL,
    `reporter_gender` ENUM('LAKI_LAKI', 'PEREMPUAN') NOT NULL,
    `reporter_age` INTEGER NOT NULL,
    `reporter_occupation` VARCHAR(120) NOT NULL,
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
    `publisher_name` VARCHAR(255) NULL,
    `mushaf_name` VARCHAR(255) NULL,
    `tashih_number` VARCHAR(120) NULL,
    `registration_number` VARCHAR(120) NULL,
    `registrant_publisher` VARCHAR(255) NULL,
    `service_category` ENUM('BIAYA_PNBP', 'KETERLAMBATAN_PENTASHIHAN', 'LAINNYA') NULL,
    `description` TEXT NULL,
    `rejection_reason` TEXT NULL,
    `decided_at` DATETIME(3) NULL,
    `decided_by_id` VARCHAR(191) NULL,
    `final_result` VARCHAR(255) NULL,
    `final_explanation` TEXT NULL,
    `resolved_on` DATE NULL,
    `final_report_at` DATETIME(3) NULL,
    `final_report_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `complaints_code_key`(`complaint_code`),
    INDEX `complaints_type_status_created_idx`(`type`, `status`, `created_at`),
    INDEX `complaints_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_error_items` (
    `id` VARCHAR(191) NOT NULL,
    `complaint_id` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `surah_ayat` VARCHAR(255) NOT NULL,
    `error_type` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,

    UNIQUE INDEX `complaint_error_items_position_key`(`complaint_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `complaint_id` VARCHAR(191) NOT NULL,
    `error_item_id` VARCHAR(191) NULL,
    `attachment_type` ENUM('SURAT_TANDA_TASHIH', 'COVER_MUSHAF', 'HALAMAN_SALAH') NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `file_hash` VARCHAR(64) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `complaint_attachments_type_idx`(`complaint_id`, `attachment_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_status_histories` (
    `id` VARCHAR(191) NOT NULL,
    `complaint_id` VARCHAR(191) NOT NULL,
    `status` ENUM('MENUNGGU_VERIFIKASI', 'DITERIMA', 'DITOLAK', 'DALAM_PROSES', 'MENUNGGU_TINDAK_LANJUT', 'SELESAI') NOT NULL,
    `note` TEXT NULL,
    `changed_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `complaint_histories_created_idx`(`complaint_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_decided_by_id_fkey` FOREIGN KEY (`decided_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_final_report_by_id_fkey` FOREIGN KEY (`final_report_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_error_items` ADD CONSTRAINT `complaint_error_items_complaint_id_fkey` FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_attachments` ADD CONSTRAINT `complaint_attachments_complaint_id_fkey` FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_attachments` ADD CONSTRAINT `complaint_attachments_error_item_id_fkey` FOREIGN KEY (`error_item_id`) REFERENCES `complaint_error_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_status_histories` ADD CONSTRAINT `complaint_status_histories_complaint_id_fkey` FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_status_histories` ADD CONSTRAINT `complaint_status_histories_changed_by_id_fkey` FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

