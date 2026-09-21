-- AlterTable registrations
ALTER TABLE `registrations`
    ADD COLUMN `external_sync_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `external_sync_error` TEXT NULL,
    ADD COLUMN `external_sync_attempts` INTEGER NOT NULL DEFAULT 0;

