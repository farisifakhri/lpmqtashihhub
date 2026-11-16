-- Titik kantor penerbit (opsional) dari peta formulir pendaftaran, untuk peta persebaran di landing page.
ALTER TABLE `publisher_registrations` ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL;

ALTER TABLE `publishers` ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL;
