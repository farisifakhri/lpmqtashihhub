CREATE TABLE `core_team_rosters` (
  `id` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `team_number` INTEGER NOT NULL,
  `verifier_id` VARCHAR(191) NOT NULL,
  `distributor_id` VARCHAR(191) NOT NULL,
  `documenter_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `core_team_rosters_version_team_number_key` (`version`, `team_number`),
  PRIMARY KEY (`id`),
  CONSTRAINT `core_team_rosters_verifier_id_fkey` FOREIGN KEY (`verifier_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `core_team_rosters_distributor_id_fkey` FOREIGN KEY (`distributor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `core_team_rosters_documenter_id_fkey` FOREIGN KEY (`documenter_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `core_team_rotations` (
  `id` INTEGER NOT NULL,
  `active_version` INTEGER NOT NULL DEFAULT 1,
  `next_team_number` INTEGER NOT NULL DEFAULT 1,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `core_team_rotations` (`id`, `active_version`, `next_team_number`, `updated_at`)
VALUES (1, 1, 1, CURRENT_TIMESTAMP(3));

ALTER TABLE `registrations`
  ADD COLUMN `core_team_number` INTEGER NULL,
  ADD COLUMN `core_team_version` INTEGER NULL,
  ADD COLUMN `core_verifier_id` VARCHAR(191) NULL,
  ADD COLUMN `core_distributor_id` VARCHAR(191) NULL,
  ADD COLUMN `core_documenter_id` VARCHAR(191) NULL;

CREATE INDEX `registrations_core_verifier_id_status_idx` ON `registrations` (`core_verifier_id`, `status`);
CREATE INDEX `registrations_core_distributor_id_status_idx` ON `registrations` (`core_distributor_id`, `status`);
CREATE INDEX `registrations_core_documenter_id_status_idx` ON `registrations` (`core_documenter_id`, `status`);

-- Existing registrations deliberately remain NULL pending reviewed backfill.
