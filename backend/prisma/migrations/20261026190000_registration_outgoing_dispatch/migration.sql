-- AlterTable
ALTER TABLE `registrations`
  ADD COLUMN `outgoing_courier` VARCHAR(191) NULL,
  ADD COLUMN `outgoing_tracking_no` VARCHAR(191) NULL,
  ADD COLUMN `outgoing_dispatch_date` DATETIME(3) NULL,
  ADD COLUMN `outgoing_notes` TEXT NULL;
