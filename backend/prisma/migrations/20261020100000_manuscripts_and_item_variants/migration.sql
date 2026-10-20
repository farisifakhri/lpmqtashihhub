-- AlterTable
ALTER TABLE `manuscript_files` ADD COLUMN `manuscript_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `jenis_naskah_items` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `group_number` INTEGER NOT NULL,
    `role` ENUM('DASAR', 'TAMBAHAN') NOT NULL DEFAULT 'DASAR',
    `service_kind` ENUM('CETAK', 'DIGITAL', 'AUDIO_VISUAL', 'BRAILLE') NOT NULL DEFAULT 'CETAK',
    `unit_fee_rate` INTEGER NOT NULL DEFAULT 1,
    `fee_per_unit` DECIMAL(12, 2) NOT NULL DEFAULT 500000.00,
    `duration_initial` INTEGER NOT NULL DEFAULT 15,
    `duration_revision` INTEGER NOT NULL DEFAULT 7,
    `duration_dummy` INTEGER NOT NULL DEFAULT 3,
    `covers_item_code` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jenis_naskah_items_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manuscripts` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `seq_number` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `manuscripts_registration_id_seq_number_key`(`registration_id`, `seq_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manuscript_items` (
    `id` VARCHAR(191) NOT NULL,
    `manuscript_id` VARCHAR(191) NOT NULL,
    `item_id` VARCHAR(191) NOT NULL,
    `role` ENUM('DASAR', 'TAMBAHAN') NOT NULL DEFAULT 'DASAR',
    `fee_snapshot` DECIMAL(12, 2) NOT NULL,
    `initial_days_snapshot` INTEGER NOT NULL DEFAULT 0,
    `revision_days_snapshot` INTEGER NOT NULL DEFAULT 0,
    `dummy_days_snapshot` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `manuscript_items_manuscript_id_item_id_key`(`manuscript_id`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `manuscript_variants` (
    `id` VARCHAR(191) NOT NULL,
    `manuscript_id` VARCHAR(191) NOT NULL,
    `ukuran` VARCHAR(191) NOT NULL,
    `oplah` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `manuscript_files` ADD CONSTRAINT `manuscript_files_manuscript_id_fkey` FOREIGN KEY (`manuscript_id`) REFERENCES `manuscripts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manuscripts` ADD CONSTRAINT `manuscripts_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manuscript_items` ADD CONSTRAINT `manuscript_items_manuscript_id_fkey` FOREIGN KEY (`manuscript_id`) REFERENCES `manuscripts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manuscript_items` ADD CONSTRAINT `manuscript_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `jenis_naskah_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manuscript_variants` ADD CONSTRAINT `manuscript_variants_manuscript_id_fkey` FOREIGN KEY (`manuscript_id`) REFERENCES `manuscripts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

