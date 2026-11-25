-- Seed the master data required by new manuscript registrations.
-- This table was created by 20261020100000, but the original migration did not insert
-- the official B-01 item records.

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'JUZ30', "Al-Qur'an 30 Juz", 1, 'DASAR', 'CETAK', 1, 1000000.00, 15, 7, 3, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'JUZ30');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'YASIN', 'Surah Yasin dan Bacaan Tahlil', 1, 'DASAR', 'CETAK', 1, 500000.00, 5, 2, 1, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'YASIN');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'AMMA', "Juz 'Amma dan Terjemahnya", 1, 'DASAR', 'CETAK', 1, 500000.00, 5, 2, 1, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'AMMA');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'MAJMU', "Majmu' Syarif", 1, 'DASAR', 'CETAK', 1, 500000.00, 5, 2, 1, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'MAJMU');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'KALIGRAFI', 'Kaligrafi', 1, 'DASAR', 'CETAK', 1, 500000.00, 3, 2, 1, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'KALIGRAFI');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'METODE', "Metode Baca Tulis Al-Qur'an", 1, 'DASAR', 'CETAK', 1, 500000.00, 15, 7, 3, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'METODE');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'AV', 'Audio/Visual', 2, 'DASAR', 'AUDIO_VISUAL', 1, 1000000.00, 30, 15, 7, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'AV');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'DIGITAL', 'Digital', 2, 'DASAR', 'DIGITAL', 1, 1000000.00, 15, 7, 3, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'DIGITAL');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'BRAILLE', 'Mushaf Standar Braille', 1, 'DASAR', 'BRAILLE', 0, 0.00, 60, 30, 15, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'BRAILLE');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'TERJEMAH', 'Terjemah', 3, 'TAMBAHAN', 'CETAK', 1, 500000.00, 7, 5, 4, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'TERJEMAH');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'TRANSLITERASI', 'Transliterasi', 3, 'TAMBAHAN', 'CETAK', 1, 500000.00, 7, 5, 4, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'TRANSLITERASI');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'TAJWID', 'Tajwid Warna / Kode Tajwid', 3, 'TAMBAHAN', 'CETAK', 1, 500000.00, 7, 5, 4, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'TAJWID');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'WAQAF', "Waqaf Ibtida'", 3, 'TAMBAHAN', 'CETAK', 1, 500000.00, 7, 5, 4, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'WAQAF');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'QIRAAT', 'Qiraat', 3, 'TAMBAHAN', 'CETAK', 1, 500000.00, 7, 5, 4, NULL, 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'QIRAAT');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'PERKATA', 'Terjemah/Transliterasi Perkata', 3, 'TAMBAHAN', 'CETAK', 2, 500000.00, 30, 15, 9, 'TERJEMAH', 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'PERKATA');

INSERT INTO `jenis_naskah_items`
  (`id`, `code`, `name`, `group_number`, `role`, `service_kind`, `unit_fee_rate`, `fee_per_unit`, `duration_initial`, `duration_revision`, `duration_dummy`, `covers_item_code`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'TAFSIR', 'Tafsir', 3, 'TAMBAHAN', 'CETAK', 2, 500000.00, 30, 15, 9, 'TERJEMAH', 'ACTIVE', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `jenis_naskah_items` WHERE `code` = 'TAFSIR');
