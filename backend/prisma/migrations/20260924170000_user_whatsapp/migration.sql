ALTER TABLE `users`
  ADD COLUMN `whatsapp_number` VARCHAR(30) NULL,
  ADD COLUMN `whatsapp_verified_at` DATETIME(3) NULL;
