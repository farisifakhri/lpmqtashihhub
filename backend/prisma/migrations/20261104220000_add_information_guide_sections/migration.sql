ALTER TABLE `information_guides`
    ADD COLUMN `section` VARCHAR(20) NOT NULL DEFAULT 'GUIDE',
    ADD INDEX `information_guides_section_idx`(`section`);
