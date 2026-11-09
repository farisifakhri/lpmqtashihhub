-- AlterTable
ALTER TABLE `survey_unsur` ADD COLUMN `definition` TEXT NULL,
    ADD COLUMN `is_standard` BOOLEAN NOT NULL DEFAULT false;


-- 9 unsur baku Survei Kepuasan Masyarakat (Pedoman Menteri PANRB No. 9 Tahun 2024, BAB III, hlm. 12–13).
-- INSERT IGNORE: unsur dengan kode yang sama yang sudah dibuat manual tidak ditimpa.
INSERT IGNORE INTO `survey_unsur` (`id`, `code`, `name`, `kind`, `definition`, `is_standard`, `is_archived`, `created_at`, `updated_at`) VALUES
  (UUID(), 'A', 'Persyaratan', 'IKM', 'Syarat yang harus dipenuhi dalam pengurusan suatu jenis pelayanan, baik persyaratan teknis maupun administratif.', true, false, NOW(3), NOW(3)),
  (UUID(), 'B', 'Sistem, Mekanisme, dan Prosedur', 'IKM', 'Tata cara pelayanan yang dibakukan bagi pemberi dan penerima pelayanan, termasuk pengaduan.', true, false, NOW(3), NOW(3)),
  (UUID(), 'C', 'Waktu Penyelesaian', 'IKM', 'Jangka waktu yang diperlukan untuk menyelesaikan seluruh proses pelayanan dari setiap jenis pelayanan.', true, false, NOW(3), NOW(3)),
  (UUID(), 'D', 'Biaya/Tarif', 'IKM', 'Ongkos yang dikenakan kepada penerima layanan dalam mengurus dan/atau memperoleh pelayanan dari penyelenggara yang besarnya ditetapkan berdasarkan kesepakatan antara penyelenggara dan masyarakat.', true, false, NOW(3), NOW(3)),
  (UUID(), 'E', 'Produk, Spesifikasi, dan Jenis Pelayanan', 'IKM', 'Hasil pelayanan yang diberikan dan diterima sesuai dengan ketentuan yang telah ditetapkan.', true, false, NOW(3), NOW(3)),
  (UUID(), 'F', 'Kompetensi Pelaksana', 'IKM', 'Kemampuan yang harus dimiliki oleh pelaksana meliputi pengetahuan, keahlian, keterampilan, dan pengalaman.', true, false, NOW(3), NOW(3)),
  (UUID(), 'G', 'Perilaku Pelaksana', 'IKM', 'Sikap petugas dalam memberikan pelayanan.', true, false, NOW(3), NOW(3)),
  (UUID(), 'H', 'Penanganan Pengaduan', 'IKM', 'Tata cara pelaksanaan penanganan pengaduan dan tindak lanjut.', true, false, NOW(3), NOW(3)),
  (UUID(), 'I', 'Sarana dan Prasarana', 'IKM', 'Segala sesuatu yang dapat dipakai sebagai alat dalam mencapai maksud dan tujuan. Prasarana adalah segala sesuatu yang merupakan penunjang utama terselenggaranya suatu proses. Sarana digunakan untuk benda yang bergerak dan prasarana untuk benda yang tidak bergerak.', true, false, NOW(3), NOW(3));
