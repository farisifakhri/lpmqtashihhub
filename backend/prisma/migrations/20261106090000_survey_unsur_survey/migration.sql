-- AlterTable
ALTER TABLE `survey_unsur` ADD COLUMN `survey_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `survey_unsur` ADD CONSTRAINT `survey_unsur_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

