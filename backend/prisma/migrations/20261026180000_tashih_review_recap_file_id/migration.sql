-- AlterTable
ALTER TABLE `tashih_reviews` ADD COLUMN `recap_file_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `tashih_reviews_recap_file_id_idx` ON `tashih_reviews`(`recap_file_id`);
