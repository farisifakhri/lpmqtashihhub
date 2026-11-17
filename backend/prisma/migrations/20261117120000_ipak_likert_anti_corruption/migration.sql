-- Pengukuran Perilaku Anti-Korupsi: 2 unsur IPAK tambahan dengan pernyataan skala Likert 1–5,
-- dipasang ke survei berjenis IPAK. Hanya menambah: unsur, pertanyaan, dan susunan yang sudah ada tidak diubah.

INSERT IGNORE INTO `survey_unsur` (`id`, `code`, `name`, `kind`, `definition`, `is_standard`, `sort_order`, `is_archived`, `created_at`, `updated_at`) VALUES
  (UUID(), '11', 'Transparansi Pelayanan', 'IPAK', 'Keterbukaan informasi mengenai standar dan prosedur pemberian layanan kepada pengguna layanan.', true, 21, false, NOW(3), NOW(3)),
  (UUID(), '12', 'Integritas Petugas Pelayanan', 'IPAK', 'Sikap petugas yang bebas dari pungutan liar, percaloan, dan penerimaan imbalan di luar ketentuan yang berlaku.', true, 22, false, NOW(3), NOW(3));

INSERT INTO `survey_questions` (`id`, `text`, `type`, `unsur_id`, `created_at`, `updated_at`)
SELECT UUID(), q.`text`, 'PILIHAN', u.`id`, NOW(3) + INTERVAL (q.`ord` * 1000) MICROSECOND, NOW(3)
FROM (
  SELECT '11' AS `code`, 1 AS `ord`, 'Standar dan prosedur pemberian layanan pada unit ini diinformasikan dengan jelas.' AS `text`
  UNION ALL SELECT '12', 2, 'Tidak ada pungutan liar (pungli) oleh petugas pada Unit Penyelenggara Pelayanan ini.'
  UNION ALL SELECT '12', 3, 'Tidak ada percaloan/perantara tidak resmi pada Unit Penyelenggara Pelayanan ini.'
  UNION ALL SELECT '12', 4, 'Tidak ada penerimaan imbalan uang/barang/fasilitas oleh petugas di luar ketentuan yang berlaku pada Unit Penyelenggara Pelayanan ini.'
) AS q
JOIN `survey_unsur` u ON u.`code` = q.`code` AND u.`kind` = 'IPAK'
WHERE NOT EXISTS (SELECT 1 FROM `survey_questions` x WHERE x.`unsur_id` = u.`id` AND x.`text` = q.`text`);

-- Skala Likert 1–5: "Sangat Setuju" = 5 (pernyataan bernada positif).
INSERT INTO `survey_options` (`id`, `question_id`, `label`, `value`, `sort_order`)
SELECT UUID(), sq.`id`, s.`label`, s.`value`, s.`sort_order`
FROM `survey_questions` sq
JOIN `survey_unsur` u ON u.`id` = sq.`unsur_id` AND u.`kind` = 'IPAK' AND u.`code` IN ('11', '12')
CROSS JOIN (
  SELECT 'Sangat Setuju' AS `label`, 5 AS `value`, 0 AS `sort_order`
  UNION ALL SELECT 'Setuju', 4, 1
  UNION ALL SELECT 'Antara Setuju dan Tidak Setuju', 3, 2
  UNION ALL SELECT 'Tidak Setuju', 2, 3
  UNION ALL SELECT 'Sangat Tidak Setuju', 1, 4
) AS s
WHERE sq.`type` = 'PILIHAN'
  AND NOT EXISTS (SELECT 1 FROM `survey_options` o WHERE o.`question_id` = sq.`id`);

-- Pasang ke setiap survei IPAK, di belakang susunan yang sudah ada.
INSERT IGNORE INTO `survey_items` (`id`, `survey_id`, `unsur_id`, `question_id`, `sort_order`)
SELECT UUID(), sv.`id`, u.`id`, sq.`id`,
  200 + u.`sort_order` * 10 + (SELECT COUNT(*) FROM `survey_questions` f WHERE f.`unsur_id` = u.`id` AND f.`created_at` < sq.`created_at`)
FROM `surveys` sv
JOIN `survey_unsur` u ON u.`kind` = 'IPAK' AND u.`code` IN ('11', '12')
JOIN `survey_questions` sq ON sq.`unsur_id` = u.`id` AND sq.`type` = 'PILIHAN'
WHERE sv.`kind` = 'IPAK';
