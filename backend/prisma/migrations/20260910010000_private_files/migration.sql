CREATE TABLE `stored_files` (
  `id` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `mime_type` VARCHAR(191) NOT NULL,
  `file_size` INTEGER NOT NULL,
  `checksum` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `stored_files_owner_id_idx` (`owner_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
