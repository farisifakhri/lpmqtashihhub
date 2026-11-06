-- Dua survei baku Pedoman Menteri PANRB No. 9 Tahun 2024, BAB III: "Data Persepsi" (9 unsur IKM,
-- hlm. 16-19) dan "Pengukuran Perilaku Anti-Korupsi" (hlm. 19-20). Nama mengikuti sistem tashih lama.
-- Status DRAFT: Super Admin yang mengaktifkan setelah pertanyaannya disusun.
-- `surveys`.`name` tidak unik, jadi INSERT IGNORE tidak menahan duplikat; dipakai WHERE NOT EXISTS.
INSERT INTO `surveys` (`id`, `name`, `kind`, `description`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'Indeks Persepsi Kualitas Pelayanan', 'IKM',
  'Survei Kepuasan Masyarakat atas layanan pentashihan, disusun dari 9 unsur pelayanan sesuai Pedoman Menteri PANRB No. 9 Tahun 2024.',
  'DRAFT', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `surveys` WHERE `name` = 'Indeks Persepsi Kualitas Pelayanan');

INSERT INTO `surveys` (`id`, `name`, `kind`, `description`, `status`, `created_at`, `updated_at`)
SELECT UUID(), 'Indeks Persepsi Anti Korupsi', 'IPAK',
  'Pengukuran persepsi responden atas praktik korupsi, kolusi, dan nepotisme pada layanan pentashihan sesuai Pedoman Menteri PANRB No. 9 Tahun 2024.',
  'DRAFT', NOW(3), NOW(3)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `surveys` WHERE `name` = 'Indeks Persepsi Anti Korupsi');
