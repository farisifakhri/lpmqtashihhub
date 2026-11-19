-- Nama unsur baku disamakan dengan rekap survei di tashih.lpmqkemenag.id lama.
-- IKM (Indeks Persepsi Kualitas Pelayanan), kode A–I.
UPDATE `survey_unsur` SET `name` = 'Persyaratan Pelayanan Pentashihan', `sort_order` = 1 WHERE `code` = 'A' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Sistem, Mekanisme, dan Prosedur Pelayanan', `sort_order` = 2 WHERE `code` = 'B' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Waktu Penyelesaian Pelayanan', `sort_order` = 3 WHERE `code` = 'C' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Biaya/Tarif', `sort_order` = 4 WHERE `code` = 'D' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Produk Spesifikasi Jenis Pelayanan', `sort_order` = 5 WHERE `code` = 'E' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Kompetensi Pelaksana', `sort_order` = 6 WHERE `code` = 'F' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Perilaku Pelaksana', `sort_order` = 7 WHERE `code` = 'G' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Penanganan Pengaduan, Saran dan Masukan', `sort_order` = 8 WHERE `code` = 'H' AND `is_standard` = true;
UPDATE `survey_unsur` SET `name` = 'Sarana dan Prasarana', `sort_order` = 9 WHERE `code` = 'I' AND `is_standard` = true;

-- IPAK (Indeks Persepsi Anti Korupsi), kode 1–10. INSERT IGNORE: kode yang sudah ada tidak ditimpa.
INSERT IGNORE INTO `survey_unsur` (`id`, `code`, `name`, `kind`, `definition`, `is_standard`, `sort_order`, `is_archived`, `created_at`, `updated_at`) VALUES
  (UUID(), '1', 'Manipulasi Peraturan', 'IPAK', 'Tidak ada pelaksanaan pelayanan yang menyimpang dari peraturan atau prosedur yang berlaku.', true, 11, false, NOW(3), NOW(3)),
  (UUID(), '2', 'Penyalahgunaan Jabatan', 'IPAK', 'Tidak ada petugas yang memanfaatkan jabatan atau kewenangannya untuk kepentingan pribadi dalam pelayanan.', true, 12, false, NOW(3), NOW(3)),
  (UUID(), '3', 'Menjual Pengaruh', 'IPAK', 'Tidak ada pihak yang menawarkan kemudahan layanan dengan memanfaatkan pengaruh atau kedekatan dengan petugas.', true, 13, false, NOW(3), NOW(3)),
  (UUID(), '4', 'Transparansi Biaya', 'IPAK', 'Biaya pelayanan diinformasikan secara terbuka dan sesuai dengan ketentuan.', true, 14, false, NOW(3), NOW(3)),
  (UUID(), '5', 'Biaya Tambahan', 'IPAK', 'Tidak ada pungutan di luar biaya resmi yang ditetapkan.', true, 15, false, NOW(3), NOW(3)),
  (UUID(), '6', 'Hadiah', 'IPAK', 'Petugas tidak meminta atau menerima hadiah, imbalan, atau gratifikasi terkait pelayanan.', true, 16, false, NOW(3), NOW(3)),
  (UUID(), '7', 'Transparansi Pembayaran', 'IPAK', 'Pembayaran dilakukan melalui saluran resmi dengan bukti pembayaran yang jelas.', true, 17, false, NOW(3), NOW(3)),
  (UUID(), '8', 'Percaloan', 'IPAK', 'Tidak ada praktik percaloan atau perantara tidak resmi dalam pelayanan.', true, 18, false, NOW(3), NOW(3)),
  (UUID(), '9', 'Perbuatan Curang', 'IPAK', 'Tidak ada perbuatan curang, seperti mendahulukan pemohon tertentu di luar ketentuan.', true, 19, false, NOW(3), NOW(3)),
  (UUID(), '10', 'Transaksi Rahasia', 'IPAK', 'Tidak ada kesepakatan atau transaksi tersembunyi antara petugas dan pengguna layanan.', true, 20, false, NOW(3), NOW(3));
