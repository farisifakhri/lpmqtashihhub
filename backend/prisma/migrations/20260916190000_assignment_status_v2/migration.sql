-- Migration: assignment_status_v2
-- Memperluas enum VerificationAssignmentStatus dengan status pasca-draft
-- dan menambah kolom return_reason untuk alasan pengembalian dari Kepala LPMQ

-- Perluas enum VerificationAssignmentStatus
ALTER TABLE `verification_assignments`
  MODIFY COLUMN `status` ENUM(
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_APPROVAL',
    'WAITING_SIGNATURE',
    'READY_TO_SEND',
    'COMPLETED'
  ) NOT NULL DEFAULT 'ASSIGNED';

-- Tambah kolom return_reason
ALTER TABLE `verification_assignments`
  ADD COLUMN `return_reason` TEXT NULL AFTER `notes`;

