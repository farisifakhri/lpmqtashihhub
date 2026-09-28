CREATE TABLE `assignment_juz` (
  `id` VARCHAR(191) NOT NULL,
  `assignment_id` VARCHAR(191) NOT NULL,
  `juz_number` INTEGER NOT NULL,
  `result` ENUM('PASSED', 'REVISION_REQUIRED', 'REJECTED') NULL,
  `notes` TEXT NULL,
  `completed_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `assignment_juz_assignment_id_juz_number_key` (`assignment_id`, `juz_number`),
  PRIMARY KEY (`id`),
  CONSTRAINT `assignment_juz_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
