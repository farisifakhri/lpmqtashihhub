-- CreateTable
CREATE TABLE `distributor_comparisons` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `round_number` INTEGER NOT NULL,
    `distributor_id` VARCHAR(191) NOT NULL,
    `notes` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `distributor_comparisons_distributor_id_idx`(`distributor_id`),
    UNIQUE INDEX `distributor_comparisons_registration_id_round_number_key`(`registration_id`, `round_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `distributor_comparisons` ADD CONSTRAINT `distributor_comparisons_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributor_comparisons` ADD CONSTRAINT `distributor_comparisons_distributor_id_fkey` FOREIGN KEY (`distributor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
