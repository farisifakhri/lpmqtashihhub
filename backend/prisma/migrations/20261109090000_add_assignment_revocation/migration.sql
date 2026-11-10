-- AlterTable
ALTER TABLE `assignments` MODIFY `status` ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'REVOKED') NOT NULL DEFAULT 'ASSIGNED',
    ADD COLUMN `revocation_reason` TEXT NULL,
    ADD COLUMN `revoked_at` DATETIME(3) NULL,
    ADD COLUMN `revoked_by_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `assignments_revoked_by_id_idx` ON `assignments`(`revoked_by_id`);

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_revoked_by_id_fkey` FOREIGN KEY (`revoked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
