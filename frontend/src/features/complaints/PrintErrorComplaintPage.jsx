import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { complaintApi } from '@/api/complaint.api';
import {
  COMPLAINT_MAX_ERROR_ITEMS,
  COMPLAINT_ROUTES,
  EMPTY_REPORTER,
  PRINT_ERROR_TYPES,
  requireText,
  validateComplaintFile,
  validateReporter,
} from './complaint.constants';
import {
  CaptchaField,
  ComplaintFileInput,
  ComplaintPublicShell,
  ComplaintSuccessDialog,
  Field,
  FormActions,
  FormAlert,
  HoneypotField,
  ReporterFields,
  SectionCard,
  describedBy,
  fieldErrorsFrom,
  focusFirstError,
  inputClass,
} from './ComplaintFormParts';

const EMPTY_MUSHAF = { nama_penerbit: '', nama_mushaf: '', nomor_surat_tashih: '' };

let itemSeq = 0;
const newErrorItem = () => ({ key: `kesalahan-${(itemSeq += 1)}`, surah_ayat: '', jenis_kesalahan: '', deskripsi: '', gambar: null });

/** Validasi sisi klien seluruh formulir kesalahan cetak (diulang oleh backend). */
export function validatePrintErrorForm({ reporter, mushaf, files, items, captcha }) {
  const errors = validateReporter(reporter);
  requireText(errors, 'nama_penerbit', mushaf.nama_penerbit, 'Nama penerbit mushaf', 2);
  requireText(errors, 'nama_mushaf', mushaf.nama_mushaf, 'Nama mushaf', 2);
  requireText(errors, 'nomor_surat_tashih', mushaf.nomor_surat_tashih, 'Nomor Surat Tanda Tashih', 3);
  const tashihError = validateComplaintFile(files.gambar_surat_tashih, 'Gambar Surat Tanda Tashih');
  if (tashihError) errors.gambar_surat_tashih = tashihError;
  const coverError = validateComplaintFile(files.gambar_cover, 'Gambar Cover Mushaf');
  if (coverError) errors.gambar_cover = coverError;
  items.forEach((item, index) => {
    const prefix = `kesalahan.${index}`;
    requireText(errors, `${prefix}.surah_ayat`, item.surah_ayat, 'Surah dan ayat', 2);
    if (!item.jenis_kesalahan) errors[`${prefix}.jenis_kesalahan`] = 'Jenis kesalahan wajib dipilih.';
    requireText(errors, `${prefix}.deskripsi`, item.deskripsi, 'Deskripsi kesalahan', 10);
    const fileError = validateComplaintFile(item.gambar, 'Gambar halaman salah');
    if (fileError) errors[`${prefix}.gambar`] = fileError;
  });
  if (!String(captcha || '').trim()) errors.captcha_jawaban = 'Kode verifikasi wajib diisi.';
  return errors;
}

export function PrintErrorComplaintPage() {
  const formRef = useRef(null);
  const captchaRef = useRef(null);
  const [reporter, setReporter] = useState(EMPTY_REPORTER);
  const [mushaf, setMushaf] = useState(EMPTY_MUSHAF);
  const [files, setFiles] = useState({ gambar_surat_tashih: null, gambar_cover: null });
  const [items, setItems] = useState(() => [newErrorItem()]);
  const [errorTypes, setErrorTypes] = useState(PRINT_ERROR_TYPES);
  const [captcha, setCaptcha] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    let active = true;
    complaintApi.getReference()
      .then((res) => { if (active && res?.data?.jenis_kesalahan_cetak?.length) setErrorTypes(res.data.jenis_kesalahan_cetak); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const clearError = (key) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const setReporterField = (key, value) => {
    setReporter((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'provinsi_kode') { next.kabupaten_kode = ''; next.kecamatan_kode = ''; }
      if (key === 'kabupaten_kode') next.kecamatan_kode = '';
      return next;
    });
    clearError(key);
  };

  const setMushafField = (key) => (event) => { setMushaf((prev) => ({ ...prev, [key]: event.target.value })); clearError(key); };

  const setFile = (key, label) => (file) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    const message = file ? validateComplaintFile(file, label) : null;
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message; else delete next[key];
      return next;
    });
  };

  const setItemField = (index, key, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    const errorKey = `kesalahan.${index}.${key}`;
    const message = key === 'gambar' && value ? validateComplaintFile(value, 'Gambar halaman salah') : null;
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[errorKey] = message; else delete next[errorKey];
      return next;
    });
  };

  // Galat per item memakai indeks; saat item dihapus, indeks setelahnya bergeser, jadi galat item dibersihkan.
  const dropItemErrors = () => setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith('kesalahan.'))));

  const addItem = () => {
    if (items.length >= COMPLAINT_MAX_ERROR_ITEMS) return;
    setItems((prev) => [...prev, newErrorItem()]);
  };
  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    dropItemErrors();
  };

  const resetForm = () => {
    setReporter(EMPTY_REPORTER);
    setMushaf(EMPTY_MUSHAF);
    setFiles({ gambar_surat_tashih: null, gambar_cover: null });
    setItems([newErrorItem()]);
    setHoneypot('');
    setErrors({});
    setServerError(null);
    // Formulir dipasang ulang (key baru) sehingga input berkas & CAPTCHA ikut dimuat ulang
    setFormKey((key) => key + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    const errs = validatePrintErrorForm({ reporter, mushaf, files, items, captcha });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setServerError('Masih ada isian yang belum lengkap atau belum sesuai. Periksa kolom yang ditandai merah.');
      focusFirstError(formRef.current, errs);
      return;
    }

    const formData = new FormData();
    Object.entries({ ...reporter, ...mushaf }).forEach(([key, value]) => formData.append(key, String(value).trim()));
    formData.append('kesalahan', JSON.stringify(items.map((item) => ({
      surah_ayat: item.surah_ayat.trim(),
      jenis_kesalahan: item.jenis_kesalahan,
      deskripsi: item.deskripsi.trim(),
    }))));
    formData.append('gambar_surat_tashih', files.gambar_surat_tashih);
    formData.append('gambar_cover', files.gambar_cover);
    items.forEach((item) => formData.append('gambar_kesalahan', item.gambar));
    formData.append('captcha_token', captchaRef.current?.token || '');
    formData.append('captcha_jawaban', captcha.trim());
    formData.append('website', honeypot);

    setSubmitting(true);
    try {
      const response = await complaintApi.submitPrintError(formData);
      setResult(response?.data || null);
      resetForm();
      window.scrollTo?.({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error);
      setErrors(fieldErrors);
      setServerError(error?.message || 'Pengaduan belum dapat dikirim. Silakan coba lagi.');
      captchaRef.current?.refresh();
      focusFirstError(formRef.current, fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ComplaintPublicShell
      title="Formulir Pengaduan Kesalahan Cetak Mushaf Al-Qur'an"
      description="Isi formulir berikut untuk melaporkan kesalahan cetak mushaf Al-Qur'an kepada Lajnah Pentashihan Mushaf Al-Qur'an."
      activeHref={COMPLAINT_ROUTES.KESALAHAN_CETAK}
    >
      <p className="mb-5 text-xs text-ink-muted">
        Kolom bertanda <span className="text-civic-danger">*</span> wajib diisi.
      </p>
      <form key={formKey} ref={formRef} onSubmit={handleSubmit} noValidate className="relative space-y-5" aria-label="Formulir pengaduan kesalahan cetak">
        <HoneypotField value={honeypot} onChange={setHoneypot} />

        <SectionCard letter="A" title="Identitas Pengadu" subtitle="Data pribadi hanya digunakan petugas LPMQ untuk menindaklanjuti pengaduan.">
          <ReporterFields form={reporter} errors={errors} setField={setReporterField} />
        </SectionCard>

        <SectionCard letter="B" title="Data Penerbit dan Mushaf Al-Qur'an yang Diadukan">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nama_penerbit" label="Nama Penerbit Mushaf" error={errors.nama_penerbit}>
              <input id="nama_penerbit" name="nama_penerbit" type="text" maxLength={255} value={mushaf.nama_penerbit}
                onChange={setMushafField('nama_penerbit')} placeholder="Nama penerbit pada mushaf"
                aria-invalid={Boolean(errors.nama_penerbit)} aria-describedby={describedBy(errors, 'nama_penerbit')}
                className={inputClass(errors.nama_penerbit)} />
            </Field>
            <Field id="nama_mushaf" label="Nama Mushaf" error={errors.nama_mushaf}>
              <input id="nama_mushaf" name="nama_mushaf" type="text" maxLength={255} value={mushaf.nama_mushaf}
                onChange={setMushafField('nama_mushaf')} placeholder="Judul mushaf sesuai sampul"
                aria-invalid={Boolean(errors.nama_mushaf)} aria-describedby={describedBy(errors, 'nama_mushaf')}
                className={inputClass(errors.nama_mushaf)} />
            </Field>
            <Field id="nomor_surat_tashih" label="Nomor Surat Tanda Tashih" error={errors.nomor_surat_tashih} className="sm:col-span-2">
              <input id="nomor_surat_tashih" name="nomor_surat_tashih" type="text" maxLength={120} value={mushaf.nomor_surat_tashih}
                onChange={setMushafField('nomor_surat_tashih')} placeholder="Tertera pada halaman tanda tashih mushaf"
                aria-invalid={Boolean(errors.nomor_surat_tashih)} aria-describedby={describedBy(errors, 'nomor_surat_tashih')}
                className={inputClass(errors.nomor_surat_tashih)} />
            </Field>
            <ComplaintFileInput id="gambar_surat_tashih" name="gambar_surat_tashih" label="Gambar Surat Tanda Tashih"
              file={files.gambar_surat_tashih} error={errors.gambar_surat_tashih}
              onChange={setFile('gambar_surat_tashih', 'Gambar Surat Tanda Tashih')} />
            <ComplaintFileInput id="gambar_cover" name="gambar_cover" label="Gambar Cover Mushaf"
              file={files.gambar_cover} error={errors.gambar_cover}
              onChange={setFile('gambar_cover', 'Gambar Cover Mushaf')} />
          </div>
        </SectionCard>

        <SectionCard letter="C" title="Informasi Kesalahan Cetak Mushaf Al-Qur'an"
          subtitle="Laporkan setiap kesalahan secara terpisah agar mudah ditelusuri.">
          <ol className="space-y-5">
            {items.map((item, index) => {
              const key = (field) => `kesalahan.${index}.${field}`;
              return (
                <li key={item.key} className="rounded-xl border border-line bg-surface-subtle/40 p-4 sm:p-5"
                  aria-label={`Informasi kesalahan ${index + 1}`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-ink">Kesalahan {index + 1}</h3>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)}
                        aria-label={`Hapus informasi kesalahan ${index + 1}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-civic-dangerLine px-2.5 py-1 text-xs font-semibold text-civic-danger hover:bg-civic-dangerSoft">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Hapus
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={key('surah_ayat')} label="Surah dan Ayat" error={errors[key('surah_ayat')]}>
                      <input id={key('surah_ayat')} name={key('surah_ayat')} type="text" maxLength={255} value={item.surah_ayat}
                        onChange={(e) => setItemField(index, 'surah_ayat', e.target.value)} placeholder="Contoh: Al-Baqarah ayat 255"
                        aria-invalid={Boolean(errors[key('surah_ayat')])} aria-describedby={describedBy(errors, key('surah_ayat'))}
                        className={inputClass(errors[key('surah_ayat')])} />
                    </Field>
                    <Field id={key('jenis_kesalahan')} label="Jenis Kesalahan" error={errors[key('jenis_kesalahan')]}>
                      <select id={key('jenis_kesalahan')} name={key('jenis_kesalahan')} value={item.jenis_kesalahan}
                        onChange={(e) => setItemField(index, 'jenis_kesalahan', e.target.value)}
                        aria-invalid={Boolean(errors[key('jenis_kesalahan')])} aria-describedby={describedBy(errors, key('jenis_kesalahan'))}
                        className={inputClass(errors[key('jenis_kesalahan')])}>
                        <option value="">Pilih jenis kesalahan</option>
                        {errorTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </Field>
                    <Field id={key('deskripsi')} label="Deskripsi Kesalahan" error={errors[key('deskripsi')]} className="sm:col-span-2">
                      <textarea id={key('deskripsi')} name={key('deskripsi')} rows={3} maxLength={3000} value={item.deskripsi}
                        onChange={(e) => setItemField(index, 'deskripsi', e.target.value)}
                        placeholder="Jelaskan kesalahan yang ditemukan, mis. halaman, baris, dan bacaan yang seharusnya"
                        aria-invalid={Boolean(errors[key('deskripsi')])} aria-describedby={describedBy(errors, key('deskripsi'))}
                        className={inputClass(errors[key('deskripsi')])} />
                    </Field>
                    <div className="sm:col-span-2">
                      <ComplaintFileInput id={key('gambar')} name={key('gambar')} label="Gambar Halaman Salah"
                        file={item.gambar} error={errors[key('gambar')]}
                        onChange={(file) => setItemField(index, 'gambar', file)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <button type="button" onClick={addItem} disabled={items.length >= COMPLAINT_MAX_ERROR_ITEMS}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-lpmq-green px-4 py-3 text-sm font-semibold text-lpmq-dark hover:bg-lpmq-soft disabled:opacity-50 sm:w-auto">
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Informasi Kesalahan Lainnya
          </button>
          {items.length >= COMPLAINT_MAX_ERROR_ITEMS && (
            <p className="mt-2 text-xs text-ink-muted">Maksimal {COMPLAINT_MAX_ERROR_ITEMS} informasi kesalahan dalam satu pengaduan.</p>
          )}
        </SectionCard>

        <SectionCard letter="D" title="Verifikasi dan Pengiriman">
          <div className="space-y-5">
            <CaptchaField ref={captchaRef} value={captcha} onChange={(value) => { setCaptcha(value); clearError('captcha_jawaban'); }} error={errors.captcha_jawaban} />
            {serverError && <FormAlert>{serverError}</FormAlert>}
            <FormActions submitting={submitting} onReset={resetForm} />
          </div>
        </SectionCard>
      </form>

      <ComplaintSuccessDialog result={result} onClose={() => setResult(null)} />
    </ComplaintPublicShell>
  );
}

export default PrintErrorComplaintPage;
