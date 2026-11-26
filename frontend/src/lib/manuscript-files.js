// Satu berkas per jenis (COVER, SAMPLE_PAGE_1_5, ...), versi tertinggi saja: unggah ulang membuat
// baris baru (v1, v2, ...) dan versi lama tidak boleh tampil atau ikut dihitung.
export const latestManuscriptFiles = (files = []) => {
  const latest = new Map();
  for (const file of Array.isArray(files) ? files : []) {
    const key = file.type || file.file_type || file.id;
    const current = latest.get(key);
    if (!current || Number(file.version || 1) > Number(current.version || 1)) latest.set(key, file);
  }
  return [...latest.values()];
};
