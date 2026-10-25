/*
  Warnings:

  - You are about to alter the column `apk_url` on the `registrations` table. The data in that column could be lost. The data in that column will be cast from `VarChar(2048)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `registrations` MODIFY `apk_url` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `roles` MODIFY `code` ENUM('SUPERADMIN', 'ADMIN_INTERNAL', 'PENERBIT', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'KEPALA_LPMQ', 'PENANDATANGAN') NOT NULL;
