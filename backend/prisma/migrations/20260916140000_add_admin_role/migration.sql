-- Preserve role IDs and all existing user_roles. No automatic user promotion.
ALTER TABLE `roles` MODIFY `code` ENUM(
  'SUPERADMIN', 'ADMIN', 'ADMIN_PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR',
  'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ'
) NOT NULL;

INSERT INTO `roles` (`id`, `code`, `name`, `created_at`, `updated_at`)
SELECT UUID(), 'ADMIN', 'Administrator Internal LPMQ', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `code` = 'ADMIN');
