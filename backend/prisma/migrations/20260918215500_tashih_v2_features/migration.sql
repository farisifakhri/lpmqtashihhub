-- AlterTable publishers
ALTER TABLE `publishers`
    ADD COLUMN `profile_edit_allowed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `profile_edit_granted_by` VARCHAR(191) NULL,
    ADD COLUMN `profile_edit_granted_at` DATETIME(3) NULL;

-- AlterTable registrations
ALTER TABLE `registrations`
    ADD COLUMN `registration_category` VARCHAR(191) NOT NULL DEFAULT 'NEW',
    ADD COLUMN `foreign_metadata` JSON NULL,
    ADD COLUMN `statement_accepted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `physical_dispatch_status` VARCHAR(191) NULL DEFAULT 'PENDING',
    ADD COLUMN `dispatch_tracking_no` VARCHAR(191) NULL,
    ADD COLUMN `dispatch_courier` VARCHAR(191) NULL,
    ADD COLUMN `dispatch_date` DATETIME(3) NULL,
    ADD COLUMN `external_sync_id` VARCHAR(191) NULL,
    ADD COLUMN `external_synced_at` DATETIME(3) NULL;
