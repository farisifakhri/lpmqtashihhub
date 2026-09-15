-- AlterTable
ALTER TABLE `payment_records` ADD COLUMN `expires_at` DATETIME(3) NULL,
    ADD COLUMN `rejection_reason` VARCHAR(191) NULL;

