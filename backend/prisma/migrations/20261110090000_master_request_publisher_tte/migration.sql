-- Permohonan Master hanya untuk penerbit terdaftar + alur surat persetujuan melalui TTE Kepala LPMQ.
-- Alur status baru: DIAJUKAN -> MENUNGGU_TTE -> DITANDATANGANI -> DIKIRIM (atau DITOLAK).

-- 1. Perluas enum sementara agar nilai lama tetap sah selama konversi
ALTER TABLE `master_mushaf_requests`
    MODIFY `status` ENUM('DIAJUKAN', 'DIPROSES', 'DISETUJUI', 'MENUNGGU_TTE', 'DITANDATANGANI', 'DIKIRIM', 'DITOLAK') NOT NULL DEFAULT 'DIAJUKAN';

-- 2. Permohonan berstatus lama yang belum memiliki surat kembali menunggu tindak lanjut admin
UPDATE `master_mushaf_requests` SET `status` = 'DIAJUKAN' WHERE `status` IN ('DIPROSES', 'DISETUJUI');

-- 3. Kolom penerbit & surat persetujuan, lalu sempitkan enum ke alur baru
-- AlterTable
ALTER TABLE `master_mushaf_requests` ADD COLUMN `letter_body` TEXT NULL,
    ADD COLUMN `letter_drafted_at` DATETIME(3) NULL,
    ADD COLUMN `letter_drafted_by_id` VARCHAR(191) NULL,
    ADD COLUMN `letter_number` VARCHAR(80) NULL,
    ADD COLUMN `letter_subject` VARCHAR(255) NULL,
    ADD COLUMN `publisher_id` VARCHAR(191) NULL,
    ADD COLUMN `sent_at` DATETIME(3) NULL,
    ADD COLUMN `sent_by_id` VARCHAR(191) NULL,
    ADD COLUMN `signature_hash` VARCHAR(64) NULL,
    ADD COLUMN `signed_at` DATETIME(3) NULL,
    ADD COLUMN `signed_by_id` VARCHAR(191) NULL,
    ADD COLUMN `submitted_by_id` VARCHAR(191) NULL,
    MODIFY `status` ENUM('DIAJUKAN', 'MENUNGGU_TTE', 'DITANDATANGANI', 'DIKIRIM', 'DITOLAK') NOT NULL DEFAULT 'DIAJUKAN';

-- CreateIndex
CREATE UNIQUE INDEX `master_req_letter_number_key` ON `master_mushaf_requests`(`letter_number`);

-- CreateIndex
CREATE INDEX `master_req_publisher_created_idx` ON `master_mushaf_requests`(`publisher_id`, `created_at`);

-- AddForeignKey
ALTER TABLE `master_mushaf_requests` ADD CONSTRAINT `master_mushaf_requests_publisher_id_fkey` FOREIGN KEY (`publisher_id`) REFERENCES `publishers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_mushaf_requests` ADD CONSTRAINT `master_mushaf_requests_submitted_by_id_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_mushaf_requests` ADD CONSTRAINT `master_mushaf_requests_letter_drafted_by_id_fkey` FOREIGN KEY (`letter_drafted_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_mushaf_requests` ADD CONSTRAINT `master_mushaf_requests_signed_by_id_fkey` FOREIGN KEY (`signed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_mushaf_requests` ADD CONSTRAINT `master_mushaf_requests_sent_by_id_fkey` FOREIGN KEY (`sent_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

