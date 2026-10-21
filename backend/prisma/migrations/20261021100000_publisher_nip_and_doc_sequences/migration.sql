-- AlterTable publishers
ALTER TABLE `publishers`
    ADD COLUMN `nomor_induk_penerbit` VARCHAR(50) NULL,
    ADD COLUMN `npwp` VARCHAR(50) NULL,
    ADD COLUMN `nib` VARCHAR(50) NULL;

-- AlterTable publisher_registrations
ALTER TABLE `publisher_registrations`
    ADD COLUMN `nomor_induk_penerbit` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `document_number_sequences` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_key` VARCHAR(100) NOT NULL,
    `document_type` VARCHAR(50) NOT NULL,
    `year` INTEGER NOT NULL,
    `last_number` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doc_num_seq_key`(`sequence_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

