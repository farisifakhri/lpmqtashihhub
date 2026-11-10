export const inputClass = 'w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700';

// Label unsur: kode hanya ditampilkan bila ada (unsur baku A–I).
export const unsurLabel = (u) => (u.code ? `${u.code} · ${u.name}` : u.name);

// Istilah status mengikuti sistem lama: Pending (baru dibuat), Aktif, Expired (dinonaktifkan/lewat periode).
export const STATUS_BADGE = {
  DRAFT: { variant: 'default', label: 'Pending' },
  AKTIF: { variant: 'success', label: 'Aktif' },
  NONAKTIF: { variant: 'danger', label: 'Expired' },
  BERAKHIR: { variant: 'danger', label: 'Expired' },
};

export const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Pending' },
  { value: 'AKTIF', label: 'Aktif' },
  { value: 'NONAKTIF', label: 'Expired' },
];

// Templat skala 1–4 agar urutan nilai pertanyaan positif/negatif tidak terbalik.
export const OPTION_PRESETS = [
  {
    id: 'positif',
    label: 'Skala positif',
    options: [
      { label: 'Sangat baik', value: 4 },
      { label: 'Baik', value: 3 },
      { label: 'Kurang baik', value: 2 },
      { label: 'Tidak baik', value: 1 },
    ],
  },
  {
    id: 'frekuensi-negatif',
    label: 'Frekuensi (pertanyaan negatif)',
    options: [
      { label: 'Tidak pernah', value: 4 },
      { label: 'Jarang', value: 3 },
      { label: 'Sering', value: 2 },
      { label: 'Selalu', value: 1 },
    ],
  },
  {
    id: 'frekuensi-positif',
    label: 'Frekuensi (pertanyaan positif)',
    options: [
      { label: 'Selalu', value: 4 },
      { label: 'Sering', value: 3 },
      { label: 'Jarang', value: 2 },
      { label: 'Tidak pernah', value: 1 },
    ],
  },
];

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';


// ---- Instrumen kuesioner SKM, Pedoman Menteri PANRB No. 9 Tahun 2024 (BAB III, hlm. 14–22) ----
export const OPENING_TEXT = 'Ayo berikan suara Anda! Isi survei kami sekarang berdasarkan pengalaman Bapak/Ibu ketika menggunakan layanan kami dan berinteraksi dengan petugas layanan kami. Survei ini hanya membutuhkan waktu beberapa menit. Hasil survei akan kami gunakan murni untuk perbaikan kualitas pelayanan yang kami berikan. Terima kasih.';
export const CLOSING_TEXT = 'Terima kasih atas partisipasi Bapak/Ibu untuk mengisi survei ini. Seluruh data dan informasi yang Bapak/Ibu berikan akan kami jamin kerahasiaannya dan hanya akan kami gunakan murni untuk perbaikan kualitas pelayanan yang kami berikan.';

// Data responden yang ditanyakan ke penerbit (cukup sekali, dipakai ulang di survei berikutnya).
export const DEMOGRAPHIC_FIELDS = [
  'Nama responden',
  'Usia',
  'Jenis kelamin',
  'Pendidikan terakhir',
  'Pekerjaan',
];

export const DISABILITY_LABELS = {
  FISIK: 'Fisik (Tuna Daksa)',
  INTELEKTUAL: 'Intelektual',
  MENTAL: 'Mental',
  SENSORIK: 'Sensorik (Tuli, Tuna Rungu, Tuna Netra)',
};
export const SERVICE_CATEGORY_LABELS = { DARING: 'Daring', LURING: 'Luring', HYBRID: 'Campuran (Hybrid)' };

export const SATISFACTION_LABELS = { 1: 'Sangat Tidak Puas', 2: 'Tidak Puas', 3: 'Antara Puas dan Tidak Puas', 4: 'Puas', 5: 'Sangat Puas' };

export const ANTI_CORRUPTION_STATEMENTS = {
  ak_transparency: { aspect: 'Transparansi Pelayanan', text: 'Standar dan prosedur pemberian layanan pada unit ini diinformasikan dengan jelas.' },
  ak_no_extortion: { aspect: 'Integritas Petugas', text: 'Tidak ada pungutan liar (pungli) oleh petugas pada unit ini.' },
  ak_no_broker: { aspect: 'Integritas Petugas', text: 'Tidak ada percaloan/perantara tidak resmi pada unit ini.' },
  ak_no_gratification: { aspect: 'Integritas Petugas', text: 'Tidak ada penerimaan imbalan uang/barang/fasilitas oleh petugas di luar ketentuan yang berlaku.' },
};

// Kategorisasi IKM (Pedoman hlm. 22).
export const IKM_CATEGORIES = [
  { persepsi: 1, interval: '1,00 – 2,5996', konversi: '25,00 – 64,99', mutu: 'D', kinerja: 'Tidak baik' },
  { persepsi: 2, interval: '2,60 – 3,064', konversi: '65,00 – 76,60', mutu: 'C', kinerja: 'Kurang baik' },
  { persepsi: 3, interval: '3,0644 – 3,532', konversi: '76,61 – 88,30', mutu: 'B', kinerja: 'Baik' },
  { persepsi: 4, interval: '3,5324 – 4,00', konversi: '88,31 – 100,00', mutu: 'A', kinerja: 'Sangat baik' },
];

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

// Unsur yang boleh dipakai pada survei: unsur umum + unsur khusus survei itu. Tanpa survei = semua unsur.
export const unsurForSurvey = (list, surveyId) => (surveyId ? list.filter((u) => !u.survey_id || u.survey_id === surveyId) : list);
