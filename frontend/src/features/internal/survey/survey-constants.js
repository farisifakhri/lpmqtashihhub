export const inputClass = 'w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700';

export const KIND_OPTIONS = [
  { value: 'IKM', label: 'IKM (Indeks Kepuasan Masyarakat)' },
  { value: 'IPAK', label: 'IPAK (Indeks Persepsi Anti Korupsi)' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

export const STATUS_BADGE = {
  DRAFT: { variant: 'default', label: 'Draf' },
  AKTIF: { variant: 'success', label: 'Aktif' },
  NONAKTIF: { variant: 'warning', label: 'Nonaktif' },
  BERAKHIR: { variant: 'danger', label: 'Berakhir' },
};

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

// <input type="date"> memakai format YYYY-MM-DD.
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
