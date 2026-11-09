-- AlterTable
ALTER TABLE `survey_responses` ADD COLUMN `ak_no_broker` INTEGER NULL,
    ADD COLUMN `ak_no_extortion` INTEGER NULL,
    ADD COLUMN `ak_no_gratification` INTEGER NULL,
    ADD COLUMN `ak_transparency` INTEGER NULL,
    ADD COLUMN `disability_type` VARCHAR(20) NULL,
    ADD COLUMN `feedback` TEXT NULL,
    ADD COLUMN `is_disabled` BOOLEAN NULL,
    ADD COLUMN `nps_score` INTEGER NULL,
    ADD COLUMN `overall_satisfaction` INTEGER NULL,
    ADD COLUMN `service_category` VARCHAR(10) NULL,
    ADD COLUMN `service_received_at` DATETIME(3) NULL,
    ADD COLUMN `service_type` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `survey_unsur` ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 100;


-- Urutan unsur baku sesuai Pedoman (1 Persyaratan … 9 Sarana dan Prasarana).
UPDATE `survey_unsur` SET `sort_order` = CASE `code`
  WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4 WHEN 'E' THEN 5
  WHEN 'F' THEN 6 WHEN 'G' THEN 7 WHEN 'H' THEN 8 WHEN 'I' THEN 9 ELSE 100 END
WHERE `is_standard` = true;
