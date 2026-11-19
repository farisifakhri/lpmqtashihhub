-- Pertanyaan baku Indeks Persepsi Anti Korupsi: satu pernyataan per unsur IPAK (kode 1–10),
-- lalu dipasang ke survei berjenis IPAK agar rekapnya memuat 10 unsur seperti tashih.lpmqkemenag.id lama.
-- Aman diulang: pertanyaan dengan teks sama pada unsur yang sama dilewati; susunan survei yang ada tidak dihapus.

INSERT INTO `survey_questions` (`id`, `text`, `type`, `unsur_id`, `created_at`, `updated_at`)
SELECT UUID(), q.`text`, 'PILIHAN', u.`id`, NOW(3), NOW(3)
FROM (
  SELECT '1' AS `code`, 'Petugas memberikan pelayanan sesuai peraturan dan prosedur yang berlaku, tanpa memanipulasi aturan.' AS `text`
  UNION ALL SELECT '2', 'Petugas tidak menyalahgunakan jabatan atau kewenangannya untuk kepentingan pribadi dalam pelayanan.'
  UNION ALL SELECT '3', 'Tidak ada pihak yang menjual pengaruh atau kedekatan dengan petugas untuk mempermudah pelayanan.'
  UNION ALL SELECT '4', 'Biaya pelayanan diinformasikan secara terbuka dan sesuai dengan ketentuan.'
  UNION ALL SELECT '5', 'Tidak ada biaya tambahan di luar biaya resmi yang ditetapkan.'
  UNION ALL SELECT '6', 'Petugas tidak meminta atau menerima hadiah/imbalan terkait pelayanan.'
  UNION ALL SELECT '7', 'Pembayaran dilakukan melalui saluran resmi dengan bukti pembayaran yang jelas.'
  UNION ALL SELECT '8', 'Tidak ada praktik percaloan atau perantara tidak resmi dalam pelayanan.'
  UNION ALL SELECT '9', 'Tidak ada perbuatan curang dalam proses pelayanan, seperti mendahulukan pemohon tertentu di luar ketentuan.'
  UNION ALL SELECT '10', 'Tidak ada transaksi rahasia antara petugas dan pengguna layanan.'
) AS q
JOIN `survey_unsur` u ON u.`code` = q.`code` AND u.`kind` = 'IPAK'
WHERE NOT EXISTS (SELECT 1 FROM `survey_questions` x WHERE x.`unsur_id` = u.`id` AND x.`text` = q.`text`);

-- Skala persetujuan 1–4: pernyataan bernada positif, jadi "Sangat setuju" = 4 (bersih dari korupsi).
INSERT INTO `survey_options` (`id`, `question_id`, `label`, `value`, `sort_order`)
SELECT UUID(), sq.`id`, s.`label`, s.`value`, s.`sort_order`
FROM `survey_questions` sq
JOIN `survey_unsur` u ON u.`id` = sq.`unsur_id` AND u.`kind` = 'IPAK' AND u.`is_standard` = true
CROSS JOIN (
  SELECT 'Sangat setuju' AS `label`, 4 AS `value`, 0 AS `sort_order`
  UNION ALL SELECT 'Setuju', 3, 1
  UNION ALL SELECT 'Tidak setuju', 2, 2
  UNION ALL SELECT 'Sangat tidak setuju', 1, 3
) AS s
WHERE sq.`type` = 'PILIHAN'
  AND NOT EXISTS (SELECT 1 FROM `survey_options` o WHERE o.`question_id` = sq.`id`);

-- Pasang ke setiap survei IPAK (UNIQUE survey_id+question_id mencegah duplikat bila diulang).
INSERT IGNORE INTO `survey_items` (`id`, `survey_id`, `unsur_id`, `question_id`, `sort_order`)
SELECT UUID(), sv.`id`, u.`id`, sq.`id`, 100 + u.`sort_order`
FROM `surveys` sv
JOIN `survey_unsur` u ON u.`kind` = 'IPAK' AND u.`is_standard` = true
JOIN `survey_questions` sq ON sq.`unsur_id` = u.`id` AND sq.`type` = 'PILIHAN'
WHERE sv.`kind` = 'IPAK'
  AND sq.`created_at` = (SELECT MIN(f.`created_at`) FROM `survey_questions` f WHERE f.`unsur_id` = u.`id` AND f.`type` = 'PILIHAN');
