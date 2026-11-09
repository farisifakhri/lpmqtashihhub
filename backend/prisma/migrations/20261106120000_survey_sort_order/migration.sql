-- Urutan tampil survei diatur Super Admin (seret di halaman Nama Survei).
ALTER TABLE `surveys` ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

-- Urutan awal = urutan tampil sekarang (terbaru di atas), agar tampilan tidak berubah setelah migrasi.
UPDATE `surveys` s
  JOIN (SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at` DESC) AS rn FROM `surveys`) r ON r.`id` = s.`id`
  SET s.`sort_order` = r.rn;
