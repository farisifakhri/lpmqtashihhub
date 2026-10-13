import React from 'react';
import { ListChecks } from 'lucide-react';

export const DEFAULT_JENIS_NASKAH_OPTIONS = [
  "1. Al-Qur'an 30 Juz",
  '1. Juz-juz pilihan',
  "1. Majmu' Syarif/ Surah-surah pilihan",
  "1. Mushaf Al-Qur'an Luar Negeri",
  "1. Juz 'Amma",
  '1. Kaligrafi',
  "1. Metode Baca Tulis Al-Qur'an",
  '1. Surah Yasin dan Bacaan Tahlil',
  '2. Audio/Visual',
  '2. Digital',
  '3. Tafsir',
  '3. Terjemah',
  '3. Transliterasi',
  "3. Waqaf Ibtida'",
  '3. Kode Tajwid',
  '3. Tajwid Warna',
  '3. Terjemah Perkata',
  '3. Transliterasi Perkata',
];

export const DEFAULT_MATERI_TAMBAHAN_OPTIONS = [
  'Asbabun Nuzul',
  'Hadis',
  'Mutiara Hikmah',
  "Do'a Tertentu",
  'Kisah-Kisah',
  'Lainnya',
];

export const Step2JenisMateri = ({
  JENIS_NASKAH_OPTIONS,
  MATERI_TAMBAHAN_OPTIONS,
  selectedJenisNaskah = [],
  handleJenisNaskahChange,
  toggleJenisNaskah,
  selectedMateriTambahan = [],
  handleMateriTambahanChange,
  toggleMateriTambahan,
  penanggungJawabMateri = '',
  setPenanggungJawabMateri,
  fieldErrors = {},
}) => {
  const rawJenis = JENIS_NASKAH_OPTIONS || DEFAULT_JENIS_NASKAH_OPTIONS;
  const flatJenisOptions = Array.isArray(rawJenis) ? rawJenis.flat() : DEFAULT_JENIS_NASKAH_OPTIONS;
  const materiOptions = MATERI_TAMBAHAN_OPTIONS || DEFAULT_MATERI_TAMBAHAN_OPTIONS;

  const onJenisChange = handleJenisNaskahChange || toggleJenisNaskah;
  const onMateriChange = handleMateriTambahanChange || toggleMateriTambahan;

  return (
    <div className="space-y-6">
      {/* Jenis Naskah */}
      <div className="bg-white rounded-2xl border border-line p-5 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-line pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
            <ListChecks className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Jenis Naskah Mushaf <span className="text-civic-danger">*</span>
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              Pilih klasifikasi jenis naskah mushaf yang akan Anda terbitkan. Pilihan boleh lebih dari satu.
            </p>
          </div>
        </div>

        {fieldErrors.jenisNaskah && (
          <p className="text-xs text-civic-danger font-semibold bg-civic-dangerSoft p-2.5 rounded-xl border border-civic-dangerLine">
            {fieldErrors.jenisNaskah}
          </p>
        )}

        <div className="space-y-6">
          {/* Kelompok 1 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
              1. Mushaf Al-Qur'an dan Bacaan Lainnya
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {flatJenisOptions.filter((o) => o.startsWith('1.')).map((opt) => (
                <label
                  key={opt}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedJenisNaskah.includes(opt)
                      ? 'border-brand-700 bg-brand-50/50 font-bold text-brand-950 shadow-2xs'
                      : 'border-line-strong hover:bg-canvas text-ink'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedJenisNaskah.includes(opt)}
                    onChange={() => onJenisChange?.(opt)}
                    className="mt-0.5 rounded border-line text-brand-700 focus:ring-brand-700"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Kelompok 2 */}
          <div className="space-y-3 pt-2 border-t border-line">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
              2. Media Digital & Audio Visual
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {flatJenisOptions.filter((o) => o.startsWith('2.')).map((opt) => (
                <label
                  key={opt}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedJenisNaskah.includes(opt)
                      ? 'border-brand-700 bg-brand-50/50 font-bold text-brand-950 shadow-2xs'
                      : 'border-line-strong hover:bg-canvas text-ink'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedJenisNaskah.includes(opt)}
                    onChange={() => onJenisChange?.(opt)}
                    className="mt-0.5 rounded border-line text-brand-700 focus:ring-brand-700"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Kelompok 3 */}
          <div className="space-y-3 pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                3. Fitur / Konten Tambahan Naskah
              </h3>
              <span className="text-xs text-ink-muted">
                Dapat digabungkan dengan kelompok 1 atau 2
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {flatJenisOptions.filter((o) => o.startsWith('3.')).map((opt) => (
                <label
                  key={opt}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedJenisNaskah.includes(opt)
                      ? 'border-brand-700 bg-brand-50/50 font-bold text-brand-950 shadow-2xs'
                      : 'border-line-strong hover:bg-canvas text-ink'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedJenisNaskah.includes(opt)}
                    onChange={() => onJenisChange?.(opt)}
                    className="mt-0.5 rounded border-line text-brand-700 focus:ring-brand-700"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bagian II: Materi Tambahan */}
      <div className="bg-white rounded-2xl border border-line p-5 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-line pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
            <ListChecks className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Materi Tambahan pada Mushaf
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              Pilih materi atau konten pelengkap yang terdapat di dalam naskah mushaf selain teks ayat suci.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {materiOptions.map((opt) => (
            <label
              key={opt}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedMateriTambahan.includes(opt)
                  ? 'border-brand-700 bg-brand-50/50 font-bold text-brand-950 shadow-2xs'
                  : 'border-line-strong hover:bg-canvas text-ink'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedMateriTambahan.includes(opt)}
                onChange={() => onMateriChange?.(opt)}
                className="mt-0.5 rounded border-line text-brand-700 focus:ring-brand-700"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>

        {/* Penanggung Jawab Materi Tambahan */}
        <div className="space-y-1.5 pt-2 border-t border-line">
          <label htmlFor="additional-content-owner" className="block text-xs font-bold text-ink">
            Penanggung Jawab Materi Tambahan
          </label>
          <p className="text-xs text-brand-700">
            Nama penanggung jawab atau penyusun materi tambahan di atas (cth: Tim Redaksi Tafsir Penerbit).
          </p>
          <input
            type="text"
            id="additional-content-owner"
            value={penanggungJawabMateri}
            onChange={(e) => setPenanggungJawabMateri?.(e.target.value)}
            placeholder="Tulis nama penanggung jawab Materi Tambahan"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
          />
        </div>
      </div>
    </div>
  );
};

export default Step2JenisMateri;
