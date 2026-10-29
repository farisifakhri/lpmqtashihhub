CREATE TABLE `information_guides` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content_type` VARCHAR(20) NOT NULL,
    `content_html` LONGTEXT NULL,
    `storage_path` VARCHAR(500) NULL,
    `file_name` VARCHAR(255) NULL,
    `file_size` INTEGER NULL,
    `mime_type` VARCHAR(100) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` VARCHAR(191) NULL,
    `updated_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `information_guides_is_published_idx`(`is_published`),
    INDEX `information_guides_content_type_idx`(`content_type`),
    INDEX `information_guides_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `information_guide_images` (
    `id` VARCHAR(191) NOT NULL,
    `guide_id` VARCHAR(191) NOT NULL,
    `storage_path` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `information_guide_images_guide_id_idx`(`guide_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `information_guides` ADD CONSTRAINT `information_guides_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `information_guides` ADD CONSTRAINT `information_guides_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `information_guide_images` ADD CONSTRAINT `information_guide_images_guide_id_fkey` FOREIGN KEY (`guide_id`) REFERENCES `information_guides`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `information_guide_images` ADD CONSTRAINT `information_guide_images_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
