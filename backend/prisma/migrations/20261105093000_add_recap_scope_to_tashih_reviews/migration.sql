-- AlterTable
ALTER TABLE `tashih_reviews` ADD COLUMN `recap_scope` VARCHAR(20) NOT NULL DEFAULT 'SELF', ADD INDEX `tashih_reviews_recap_scope_idx`(`recap_scope`);
