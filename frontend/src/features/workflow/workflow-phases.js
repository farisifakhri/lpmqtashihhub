/**
 * Canonical Workflow Phases Definition
 * Acuan: Review Workflow LPMQ 23 September 2026 & SOP Pentashihan Kemenag RI
 *
 * Mendefinisikan 8 fase makro alur proses resmi LPMQ beserta rincian
 * langkah mikro (steps) dan percabangan (branches/outcomes).
 */

export const WORKFLOW_PHASES = [
  {
    id: 1,
    key: 'REGISTRATION',
    label: 'Pendaftaran',
    shortLabel: 'Pendaftaran',
    number: 1,
    description: 'Permohonan data naskah & kelengkapan berkas',
    steps: ['Draf', 'Kelengkapan berkas', 'Ajukan'],
    branches: [{ when: 'dibatalkan', outcome: 'CANCELLED' }],
  },
  {
    id: 2,
    key: 'VERIFICATION',
    label: 'Verifikasi',
    shortLabel: 'Verifikasi',
    number: 2,
    description: 'Pemeriksaan administrasi & master fisik',
    steps: ['Penugasan', 'Pemeriksaan', 'Persetujuan hasil', 'Kirim hasil'],
    branches: [
      { when: 'draf dikembalikan', outcome: 'Perbaiki draf hasil' },
      { when: 'naskah perlu revisi', outcome: 'Perbaikan penerbit' },
    ],
  },
  {
    id: 3,
    key: 'PAYMENT',
    label: 'Pembayaran',
    shortLabel: 'Pembayaran',
    number: 3,
    description: 'Penagihan billing PNBP SIMPONI & validasi',
    steps: ['Billing', 'Konfirmasi', 'Validasi'],
    branches: [{ when: 'konfirmasi tidak sesuai', outcome: 'Konfirmasi ulang' }],
  },
  {
    id: 4,
    key: 'HANDOVER',
    label: 'Serah-terima',
    shortLabel: 'Serah-terima',
    number: 4,
    description: 'Serah-terima master fisik ke distributor',
    steps: ['Serahkan master fisik', 'Distributor terima', 'Tetapkan tenggat'],
    branches: [{ when: 'master perlu koreksi', outcome: 'Perbaiki serah-terima' }],
  },
  {
    id: 5,
    key: 'TASHIH',
    label: 'Pentashihan',
    shortLabel: 'Pentashihan',
    number: 5,
    description: 'Distribusi tim, penelaahan pentashih, & reviu distributor',
    steps: ['Tugaskan pentashih', 'Baca dan laporkan', 'Reviu distributor'],
    branches: [
      { when: 'perlu dibaca ulang', outcome: 'Tugaskan ulang pentashih' },
      { when: 'perlu perbaikan/dumi', outcome: 'Kembalikan ke penerbit' },
      { when: 'dumi bersih', outcome: 'READY_FOR_STT' },
    ],
  },
  {
    id: 6,
    key: 'STT_ISSUANCE',
    label: 'Penerbitan STT',
    shortLabel: 'Penerbitan STT',
    number: 6,
    description: 'Penetapan Surat Tanda Tashih Kepala LPMQ',
    steps: ['Siap terbit', 'Pengesahan', 'STT terbit'],
    branches: [],
  },
  {
    id: 7,
    key: 'DOCUMENTATION',
    label: 'Dokumentasi',
    shortLabel: 'Dokumentasi',
    number: 7,
    description: 'Pemeriksaan kelengkapan berkas & deposit 5 eksemplar cetak',
    steps: ['Cek berkas', 'Catat hasil cetak', 'Perpustakaan dan arsip'],
    branches: [{ when: 'eksemplar kurang', outcome: 'Catat kekurangan/tindak lanjut' }],
  },
  {
    id: 8,
    key: 'COMPLETED',
    label: 'Selesai',
    shortLabel: 'Selesai',
    number: 8,
    description: 'Seluruh tahapan tuntas dan berkas terbit',
    steps: ['Penutupan'],
    branches: [],
  },
];

export default WORKFLOW_PHASES;

