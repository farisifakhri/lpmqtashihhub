-- Peran Pemaraf (berdiri sebelum Kepala LPMQ) dan tabel paraf persetujuan.
ALTER TABLE `roles` MODIFY `code` ENUM('SUPERADMIN', 'ADMIN_INTERNAL', 'PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'PENANDATANGAN', 'PEMARAF') NOT NULL;

INSERT INTO `roles` (`id`, `code`, `name`, `created_at`, `updated_at`)
SELECT UUID(), 'PEMARAF', 'Pemaraf (sebelum Kepala LPMQ)', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `code` = 'PEMARAF');

CREATE TABLE `approval_parafs` (
    `id` VARCHAR(191) NOT NULL,
    `subject_type` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `pemaraf_id` VARCHAR(191) NULL,
    `requested_by_id` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `signed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `approval_parafs_subject_type_subject_id_key`(`subject_type`, `subject_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
