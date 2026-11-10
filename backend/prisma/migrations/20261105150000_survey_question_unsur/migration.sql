-- AlterTable
ALTER TABLE `survey_questions` ADD COLUMN `unsur_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `survey_questions_unsur_id_idx` ON `survey_questions`(`unsur_id`);

-- AddForeignKey
ALTER TABLE `survey_questions` ADD CONSTRAINT `survey_questions_unsur_id_fkey` FOREIGN KEY (`unsur_id`) REFERENCES `survey_unsur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

