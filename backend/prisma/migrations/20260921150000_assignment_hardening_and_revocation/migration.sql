-- Migration: assignment_hardening_and_revocation
-- Menambahkan status REVOKED, field pencabutan (revoked_at, revoked_by_id, revocation_reason),
-- dan field waktu pengajuan draft (review_submitted_at) pada verification_assignments.

ALTER TABLE `verification_assignments`
  MODIFY COLUMN `status` ENUM(
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_APPROVAL',
    'WAITING_SIGNATURE',
    'READY_TO_SEND',
    'COMPLETED',
    'REVOKED'
  ) NOT NULL DEFAULT 'ASSIGNED';

ALTER TABLE `verification_assignments`
  ADD COLUMN `revoked_at` DATETIME(3) NULL AFTER `return_reason`,
  ADD COLUMN `revoked_by_id` VARCHAR(191) NULL AFTER `revoked_at`,
  ADD COLUMN `revocation_reason` TEXT NULL AFTER `revoked_by_id`,
  ADD COLUMN `review_submitted_at` DATETIME(3) NULL AFTER `revocation_reason`;

ALTER TABLE `verification_assignments`
  ADD CONSTRAINT `verification_assignments_revoked_by_id_fkey`
  FOREIGN KEY (`revoked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

