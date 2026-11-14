CREATE TABLE `landing_page_faqs` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('LAYANAN_TASHIH_ONLINE', 'MUSHAF_STANDAR_INDONESIA', 'REGULASI') NOT NULL,
    `question` VARCHAR(255) NOT NULL,
    `answer` TEXT NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` VARCHAR(191) NULL,
    `updated_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `landing_page_faqs_category_idx`(`category`),
    INDEX `landing_page_faqs_is_published_idx`(`is_published`),
    INDEX `landing_page_faqs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `landing_page_faqs`
    ADD CONSTRAINT `landing_page_faqs_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `landing_page_faqs`
    ADD CONSTRAINT `landing_page_faqs_updated_by_id_fkey`
    FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
