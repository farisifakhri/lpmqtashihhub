import React from 'react';
import { Plus, Trash2, BookOpen, AlertCircle } from 'lucide-react';
import { normalizeWhatsApp } from './registration-validation';

export const Step1MushafData = ({
  kategoriPendaftaran,
  setKategoriPendaftaran,
  namaMushaf,
  setNamaMushaf,
  jenisStandarMushaf,
  setJenisStandarMushaf,
  penanggungJawabProduk,
  setPenanggungJawabProduk,
  penanggungJawabWa,
  setPenanggungJawabWa,
  penanggungJawabEmail,
  setPenanggungJawabEmail,
  sizes,
  handleAddSizeRow,
  handleRemoveSizeRow,
  handleSizeChange,
  namaPercetakan,
  setNamaPercetakan,
  deskripsiMushaf,
  setDeskripsiMushaf,
  // Perpanjangan
  noPendaftaranLama,
  setNoPendaftaranLama,
  nomorKodeUkuranLama,
  setNomorKodeUkuranLama,
  selectedPreviousRegId,
  setSelectedPreviousRegId,
  previousRegistrations,
  loadingPrevious,
  // Luar Negeri
  negaraAsalMushaf,
  setNegaraAsalMushaf,
  penerbitAsalMushaf,
  setPenerbitAsalMushaf,
  lembagaPentashihAsal,
  setLembagaPentashihAsal,
  // Validation errors
  fieldErrors = {},
  clearFieldError,
}) => {
  const isPerpanjangan = kategoriPendaftaran === 'Perpanjangan Tanda Tashih';
  const isLuarNegeri = kategoriPendaftaran === 'Mushaf Luar Negeri';

  return (
    <div className="bg-white rounded-2xl border border-line p-5 sm:p-7 shadow-xs space-y-6">
      <div className="border-b border-line pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-brand-700" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-ink">
            Bagian I. Informasi Data Mushaf
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted">
            Lengkapi data administratif, spesifikasi fisik, dan penanggung jawab naskah mushaf yang dimohonkan.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Kategori Pendaftaran */}
        <div className="space-y-1.5">
          <label htmlFor="registration-category-select" className="block text-xs font-bold text-ink">
            Kategori pendaftaran <span className="text-civic-danger">*</span>
          </label>
          <select
            id="registration-category-select"
            value={kategoriPendaftaran}
            onChange={(e) => {
              setKategoriPendaftaran(e.target.value);
              clearFieldError?.('kategoriPendaftaran');
            }}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink cursor-pointer"
          >
            <option value="Mushaf Baru">Mushaf Baru</option>
            <option value="Perpanjangan Tanda Tashih">Perpanjangan Tanda Tashih</option>
            <option value="Mushaf Luar Negeri">Mushaf Luar Negeri</option>
          </select>
        </div>

        {/* Khusus Perpanjangan: Pilih dari Arsip atau Manual */}
        {isPerpanjangan && (
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="previous-reg-select" className="block text-xs font-bold text-ink">
                Pilih Naskah Terdahulu dari Sistem
              </label>
              <select
                id="previous-reg-select"
                value={selectedPreviousRegId}
                onChange={(e) => setSelectedPreviousRegId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink"
                disabled={loadingPrevious}
              >
                <option value="">-- Pilih dari riwayat permohonan selesai atau entri manual --</option>
                {previousRegistrations.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.registration_no} — {p.title}
                  </option>
                ))}
                <option value="MANUAL">-- Isi nomor pendaftaran lama secara manual --</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="old-reg-no" className="block text-xs font-bold text-ink">
                  Nomor Pendaftaran Mushaf Lama <span className="text-civic-danger">*</span>
                </label>
                <input
                  id="old-reg-no"
                  type="text"
                  value={noPendaftaranLama}
                  onChange={(e) => {
                    setNoPendaftaranLama(e.target.value);
                    clearFieldError?.('noPendaftaranLama');
                  }}
                  aria-invalid={Boolean(fieldErrors.noPendaftaranLama)}
                  aria-describedby={fieldErrors.noPendaftaranLama ? 'old-reg-no-error' : undefined}
                  placeholder="Misal: REG-2023-XXXX atau No. SK"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${
                    fieldErrors.noPendaftaranLama ? 'border-civic-danger' : 'border-line-strong'
                  }`}
                />
                {fieldErrors.noPendaftaranLama && (
                  <p id="old-reg-no-error" className="text-xs text-civic-danger">
                    {fieldErrors.noPendaftaranLama}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="old-size-code" className="block text-xs font-bold text-ink">
                  Nomor Kode Ukuran Lama
                </label>
                <input
                  id="old-size-code"
                  type="text"
                  value={nomorKodeUkuranLama}
                  onChange={(e) => setNomorKodeUkuranLama(e.target.value)}
                  placeholder="Misal: UK-A4-01 (opsional)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Khusus Mushaf Luar Negeri */}
        {isLuarNegeri && (
          <div className="p-4 rounded-xl bg-canvas border border-line space-y-4">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
              Data Penerbit dan Pentashih Luar Negeri
            </h3>

            <div className="space-y-1.5">
              <label htmlFor="foreign-country-select" className="block text-xs font-bold text-ink">
                Negara Asal Mushaf <span className="text-civic-danger">*</span>
              </label>
              <select
                id="foreign-country-select"
                aria-label="Negara asal mushaf"
                value={negaraAsalMushaf}
                onChange={(e) => {
                  setNegaraAsalMushaf(e.target.value);
                  clearFieldError?.('negaraAsalMushaf');
                }}
                aria-invalid={Boolean(fieldErrors.negaraAsalMushaf)}
                aria-describedby={fieldErrors.negaraAsalMushaf ? 'foreign-country-error' : undefined}
                className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink ${
                  fieldErrors.negaraAsalMushaf ? 'border-civic-danger' : 'border-line-strong'
                }`}
              >
                <option value="">Pilih negara asal mushaf</option>
                <option value="Arab Saudi">Arab Saudi</option>
                <option value="Mesir">Mesir</option>
                <option value="Turki">Turki</option>
                <option value="Uni Emirat Arab">Uni Emirat Arab</option>
                <option value="Kuwait">Kuwait</option>
                <option value="Qatar">Qatar</option>
                <option value="Yordania">Yordania</option>
                <option value="Lebanon">Lebanon</option>
                <option value="Suriah">Suriah</option>
                <option value="Maroko">Maroko</option>
                <option value="Tunisia">Tunisia</option>
                <option value="Aljazair">Aljazair</option>
                <option value="Sudan">Sudan</option>
                <option value="Pakistan">Pakistan</option>
                <option value="India">India</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Brunei Darussalam">Brunei Darussalam</option>
                <option value="Singapura">Singapura</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              {fieldErrors.negaraAsalMushaf && (
                <p id="foreign-country-error" className="text-xs text-civic-danger">
                  {fieldErrors.negaraAsalMushaf}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="foreign-publisher" className="block text-xs font-bold text-ink">
                  Nama Penerbit Asal Mushaf <span className="text-civic-danger">*</span>
                </label>
                <input
                  id="foreign-publisher"
                  type="text"
                  value={penerbitAsalMushaf}
                  onChange={(e) => {
                    setPenerbitAsalMushaf(e.target.value);
                    clearFieldError?.('penerbitAsalMushaf');
                  }}
                  aria-invalid={Boolean(fieldErrors.penerbitAsalMushaf)}
                  aria-describedby={fieldErrors.penerbitAsalMushaf ? 'foreign-publisher-error' : undefined}
                  placeholder="Tulis Nama penerbit asal Mushaf"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink ${
                    fieldErrors.penerbitAsalMushaf ? 'border-civic-danger' : 'border-line-strong'
                  }`}
                />
                {fieldErrors.penerbitAsalMushaf && (
                  <p id="foreign-publisher-error" className="text-xs text-civic-danger">
                    {fieldErrors.penerbitAsalMushaf}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="foreign-institution" className="block text-xs font-bold text-ink">
                  Nama Lembaga Pentashih Asal <span className="text-civic-danger">*</span>
                </label>
                <input
                  id="foreign-institution"
                  type="text"
                  value={lembagaPentashihAsal}
                  onChange={(e) => {
                    setLembagaPentashihAsal(e.target.value);
                    clearFieldError?.('lembagaPentashihAsal');
                  }}
                  aria-invalid={Boolean(fieldErrors.lembagaPentashihAsal)}
                  aria-describedby={fieldErrors.lembagaPentashihAsal ? 'foreign-institution-error' : undefined}
                  placeholder="Tulis Nama lembaga pentashih asal Mushaf"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink ${
                    fieldErrors.lembagaPentashihAsal ? 'border-civic-danger' : 'border-line-strong'
                  }`}
                />
                {fieldErrors.lembagaPentashihAsal && (
                  <p id="foreign-institution-error" className="text-xs text-civic-danger">
                    {fieldErrors.lembagaPentashihAsal}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1. Nama Mushaf */}
        <div className="space-y-1.5">
          <label htmlFor="registration-mushaf-name" className="block text-xs font-bold text-ink">
            Nama Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-xs text-brand-700">
            Nama mushaf yang akan diterbitkan. Contoh: Mushaf Al-Qur'an Al-Karim
          </p>
          <input
            type="text"
            id="registration-mushaf-name"
            required
            value={namaMushaf}
            onChange={(e) => {
              setNamaMushaf(e.target.value);
              clearFieldError?.('namaMushaf');
            }}
            aria-invalid={Boolean(fieldErrors.namaMushaf)}
            aria-describedby={fieldErrors.namaMushaf ? 'registration-mushaf-name-error' : undefined}
            placeholder="Contoh: Mushaf Al-Qur'an Al-Karim, Mushaf Al-Bayan, dll."
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${
              fieldErrors.namaMushaf ? 'border-civic-danger' : 'border-line-strong'
            }`}
          />
          {fieldErrors.namaMushaf && (
            <p id="registration-mushaf-name-error" className="text-xs text-civic-danger">
              {fieldErrors.namaMushaf}
            </p>
          )}
        </div>

        {/* Standar Mushaf LPMQ */}
        <div className="space-y-1.5">
          <label htmlFor="registration-standard-select" className="block text-xs font-bold text-ink">
            Standar Mushaf LPMQ <span className="text-civic-danger">*</span>
          </label>
          <p className="text-xs text-brand-700">
            Sesuai Keputusan Menteri Agama (KMA), pilih salah satu dari 4 Jenis Mushaf Standar Indonesia.
          </p>
          <select
            id="registration-standard-select"
            value={jenisStandarMushaf}
            onChange={(e) => setJenisStandarMushaf(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink cursor-pointer"
          >
            <option value="Mushaf Standar Usmani">Mushaf Standar Usmani</option>
            <option value="Mushaf Standar Bahriyyah">Mushaf Standar Bahriyyah</option>
            <option value="Mushaf Standar Braille">Mushaf Standar Braille</option>
            <option value="Mushaf Standar Isyarat">Mushaf Standar Isyarat</option>
          </select>
        </div>

        {/* 2. Nama Penanggung Jawab Produk / Mushaf */}
        <div className="space-y-1.5">
          <label htmlFor="registration-product-owner" className="block text-xs font-bold text-ink">
            Nama Penanggung Jawab Produk/Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-xs text-brand-700">
            Nama personil yang bertanggung jawab atas proses penerbitan dan pentashihan mushaf ini.
          </p>
          <input
            type="text"
            id="registration-product-owner"
            required
            value={penanggungJawabProduk}
            onChange={(e) => {
              setPenanggungJawabProduk(e.target.value);
              clearFieldError?.('penanggungJawabProduk');
            }}
            aria-invalid={Boolean(fieldErrors.penanggungJawabProduk)}
            aria-describedby={fieldErrors.penanggungJawabProduk ? 'registration-product-owner-error' : undefined}
            placeholder="Tulis nama penanggung jawab Produk/Mushaf"
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${
              fieldErrors.penanggungJawabProduk ? 'border-civic-danger' : 'border-line-strong'
            }`}
          />
          {fieldErrors.penanggungJawabProduk && (
            <p id="registration-product-owner-error" className="text-xs text-civic-danger">
              {fieldErrors.penanggungJawabProduk}
            </p>
          )}
        </div>

        {/* Nomor WhatsApp Penanggung Jawab */}
        <div className="space-y-1.5">
          <label htmlFor="registration-pj-wa" className="block text-xs font-bold text-ink">
            Nomor WhatsApp Penanggung Jawab
          </label>
          <p className="text-xs text-brand-700">
            Nomor WhatsApp aktif untuk notifikasi otomatis perkembangan status tanda tashih via WhatsApp (cth: 081234567890 / +6281234567890).
          </p>
          <input
            type="tel"
            id="registration-pj-wa"
            value={penanggungJawabWa}
            onChange={(e) => {
              setPenanggungJawabWa(e.target.value);
              clearFieldError?.('penanggungJawabWa');
            }}
            onBlur={() => {
              if (penanggungJawabWa) {
                setPenanggungJawabWa(normalizeWhatsApp(penanggungJawabWa));
              }
            }}
            aria-invalid={Boolean(fieldErrors.penanggungJawabWa)}
            aria-describedby={fieldErrors.penanggungJawabWa ? 'registration-pj-wa-error' : undefined}
            placeholder="Tulis nomor WhatsApp (cth: 081234567890)"
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${
              fieldErrors.penanggungJawabWa ? 'border-civic-danger' : 'border-line-strong'
            }`}
          />
          {fieldErrors.penanggungJawabWa && (
            <p id="registration-pj-wa-error" className="text-xs text-civic-danger">
              {fieldErrors.penanggungJawabWa}
            </p>
          )}
        </div>

        {/* Email Penanggung Jawab */}
        <div className="space-y-1.5">
          <label htmlFor="registration-pj-email" className="block text-xs font-bold text-ink">
            Email Penanggung Jawab
          </label>
          <p className="text-xs text-brand-700">
            Alamat email aktif penanggung jawab untuk pengiriman tanda terima resmi permohonan dan surat hasil verifikasi LPMQ.
          </p>
          <input
            type="email"
            id="registration-pj-email"
            value={penanggungJawabEmail}
            onChange={(e) => {
              setPenanggungJawabEmail(e.target.value);
              clearFieldError?.('penanggungJawabEmail');
            }}
            aria-invalid={Boolean(fieldErrors.penanggungJawabEmail)}
            aria-describedby={fieldErrors.penanggungJawabEmail ? 'registration-pj-email-error' : undefined}
            placeholder="Tulis email penanggung jawab (cth: pj.mushaf@penerbit.com)"
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${
              fieldErrors.penanggungJawabEmail ? 'border-civic-danger' : 'border-line-strong'
            }`}
          />
          {fieldErrors.penanggungJawabEmail && (
            <p id="registration-pj-email-error" className="text-xs text-civic-danger">
              {fieldErrors.penanggungJawabEmail}
            </p>
          )}
        </div>

        {/* 3. Ukuran (cm) dan Oplah (Dinamis Multi-row) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-ink">
                Ukuran (cm) & oplah <span className="text-civic-danger">*</span>
              </span>
              <p className="text-xs text-ink-muted">
                Daftar ukuran fisik (panjang x lebar) dan rencana oplah cetak
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddSizeRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Ukuran dan Oplah</span>
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {sizes.map((row, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start bg-canvas/70 p-3 rounded-xl border border-line">
                <div className="sm:col-span-6 space-y-1">
                  <label className="block text-xs font-bold text-ink">
                    Ukuran (cm) {idx === 0 && <span className="text-civic-danger">*</span>}
                  </label>
                  <p className="text-xs text-brand-700 leading-tight">
                    Format: panjang x lebar (cm). Misal: 29,7 x 20 (tanpa cm)
                  </p>
                  <input
                    type="text"
                    value={row.ukuran}
                    onChange={(e) => {
                      handleSizeChange(idx, 'ukuran', e.target.value);
                      clearFieldError?.('sizes');
                    }}
                    placeholder="Tulis ukuran (cth: 29,7 x 20)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-line-strong bg-white focus:outline-none focus:ring-1 focus:ring-brand-700"
                  />
                </div>
                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-xs font-bold text-ink">
                    Oplah {idx === 0 && <span className="text-civic-danger">*</span>}
                  </label>
                  <p className="text-xs text-brand-700 leading-tight">
                    Rencana oplah cetak. Misal: 100000 eksemplar, 50000 eksemplar, dll
                  </p>
                  <input
                    type="number"
                    value={row.oplah}
                    onChange={(e) => {
                      handleSizeChange(idx, 'oplah', e.target.value);
                      clearFieldError?.('sizes');
                    }}
                    placeholder="Tulis oplah"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-line-strong bg-white focus:outline-none focus:ring-1 focus:ring-brand-700"
                  />
                </div>
                <div className="sm:col-span-1 pt-6 sm:pt-7 text-right">
                  {sizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSizeRow(idx)}
                      title="Hapus baris ini"
                      className="p-2 text-civic-danger hover:bg-civic-dangerSoft rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {fieldErrors.sizes && (
            <p className="text-xs text-civic-danger pt-1">{fieldErrors.sizes}</p>
          )}
        </div>

        {/* 4. Nama Percetakan (Hanya jika bukan Luar Negeri) */}
        {!isLuarNegeri && (
          <div className="space-y-1.5">
            <label htmlFor="registration-printer-name" className="block text-xs font-bold text-ink">
              Nama Percetakan
            </label>
            <p className="text-xs text-brand-700">
              Nama percetakan yang akan mencetak mushaf ini. Contoh: PT. Percetakan Al-Qur'an Nusantara
            </p>
            <input
              type="text"
              id="registration-printer-name"
              value={namaPercetakan}
              onChange={(e) => setNamaPercetakan(e.target.value)}
              placeholder="Tulis nama percetakan"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
            />
          </div>
        )}

        {/* 5. Deskripsi Mushaf */}
        <div className="space-y-1.5">
          <label htmlFor="registration-description" className="block text-xs font-bold text-ink">
            Deskripsi Mushaf
          </label>
          <p className="text-xs text-brand-700">
            Deskripsi singkat mengenai mushaf yang akan diterbitkan.
          </p>
          <textarea
            id="registration-description"
            rows={3}
            value={deskripsiMushaf}
            onChange={(e) => setDeskripsiMushaf(e.target.value)}
            placeholder="Tulis deskripsi mushaf..."
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
          />
        </div>
      </div>
    </div>
  );
};

export default Step1MushafData;
