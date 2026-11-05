-- CreateTable
CREATE TABLE `publisher_revision_recaps` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `round_number` INTEGER NOT NULL,
    `revision_kind` VARCHAR(20) NOT NULL,
    `recap_file_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `publisher_revision_recaps_recap_file_id_idx`(`recap_file_id`),
    UNIQUE INDEX `publisher_revision_recaps_registration_id_round_number_key`(`registration_id`, `round_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `publisher_revision_recaps` ADD CONSTRAINT `publisher_revision_recaps_recap_file_id_fkey` FOREIGN KEY (`recap_file_id`) REFERENCES `stored_files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `publisher_revision_recaps` ADD CONSTRAINT `publisher_revision_recaps_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
