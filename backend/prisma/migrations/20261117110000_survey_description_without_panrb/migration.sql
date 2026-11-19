-- Deskripsi survei baku tidak lagi menyebut Pedoman PANRB (tampil sebagai keterangan ke penerbit).
-- Hanya mengubah deskripsi bawaan yang belum disunting Super Admin.
UPDATE `surveys`
SET `description` = 'Survei Kepuasan Masyarakat atas layanan pentashihan, disusun dari 9 unsur pelayanan.'
WHERE `description` = 'Survei Kepuasan Masyarakat atas layanan pentashihan, disusun dari 9 unsur pelayanan sesuai Pedoman Menteri PANRB No. 9 Tahun 2024.';

UPDATE `surveys`
SET `description` = 'Pengukuran persepsi responden atas praktik korupsi, kolusi, dan nepotisme pada layanan pentashihan.'
WHERE `description` = 'Pengukuran persepsi responden atas praktik korupsi, kolusi, dan nepotisme pada layanan pentashihan sesuai Pedoman Menteri PANRB No. 9 Tahun 2024.';
