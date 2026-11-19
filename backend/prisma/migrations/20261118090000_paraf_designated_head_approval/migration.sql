-- Pemaraf yang ditunjuk (wajib 2) dan pengesahan Kepala LPMQ setelah paraf lengkap.
ALTER TABLE `approval_parafs`
  ADD COLUMN `assigned_ids` JSON NULL,
  ADD COLUMN `head_approved_at` DATETIME(3) NULL,
  ADD COLUMN `head_approved_by_id` VARCHAR(191) NULL;
