import React, { useEffect, useRef, useState } from 'react';
import { complaintApi } from '@/api/complaint.api';
import {
  COMPLAINT_ROUTES,
  EMPTY_REPORTER,
  SERVICE_CATEGORIES,
  requireText,
  validateReporter,
} from './complaint.constants';
import {
  CaptchaField,
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

const EMPTY_SERVICE = { nomor_pendaftaran: '', penerbit_pendaftar: '', jenis_pengaduan: '', deskripsi: '' };

/** Validasi sisi klien formulir pengaduan pelayanan (diulang oleh backend). */
export function validateServiceForm({ reporter, service, captcha }) {
  const errors = validateReporter(reporter);
  requireText(errors, 'nomor_pendaftaran', service.nomor_pendaftaran, 'Nomor pendaftaran mushaf', 3);
  requireText(errors, 'penerbit_pendaftar', service.penerbit_pendaftar, 'Penerbit pendaftar mushaf', 2);
  if (!service.jenis_pengaduan) errors.jenis_pengaduan = 'Jenis pengaduan wajib dipilih.';
  requireText(errors, 'deskripsi', service.deskripsi, 'Deskripsi pengaduan', 10);
  if (!String(captcha || '').trim()) errors.captcha_jawaban = 'Kode verifikasi wajib diisi.';
  return errors;
}

export function ServiceComplaintPage() {
  const formRef = useRef(null);
  const captchaRef = useRef(null);
  const [reporter, setReporter] = useState(EMPTY_REPORTER);
  const [service, setService] = useState(EMPTY_SERVICE);
  const [categories, setCategories] = useState(SERVICE_CATEGORIES);
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
      .then((res) => { if (active && res?.data?.jenis_pengaduan_pelayanan?.length) setCategories(res.data.jenis_pengaduan_pelayanan); })
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

  const setServiceField = (key) => (event) => { setService((prev) => ({ ...prev, [key]: event.target.value })); clearError(key); };

  const resetForm = () => {
    setReporter(EMPTY_REPORTER);
    setService(EMPTY_SERVICE);
    setHoneypot('');
    setErrors({});
    setServerError(null);
    // Formulir dipasang ulang (key baru) sehingga CAPTCHA ikut dimuat ulang
    setFormKey((key) => key + 1);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    const errs = validateServiceForm({ reporter, service, captcha });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setServerError('Masih ada isian yang belum lengkap atau belum sesuai. Periksa kolom yang ditandai merah.');
      focusFirstError(formRef.current, errs);
      return;
    }

    const formData = new FormData();
    Object.entries({ ...reporter, ...service }).forEach(([key, value]) => formData.append(key, String(value).trim()));
    formData.append('captcha_token', captchaRef.current?.token || '');
    formData.append('captcha_jawaban', captcha.trim());
    formData.append('website', honeypot);

    setSubmitting(true);
    try {
      const response = await complaintApi.submitService(formData);
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
      title="Formulir Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar"
      description="Isi formulir berikut untuk melaporkan Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar kepada Lajnah Pentashihan Mushaf Al-Qur'an."
      activeHref={COMPLAINT_ROUTES.PELAYANAN}
    >
      <p className="mb-5 text-xs text-ink-muted">
        Kolom bertanda <span className="text-civic-danger">*</span> wajib diisi.
      </p>
      <form key={formKey} ref={formRef} onSubmit={handleSubmit} noValidate className="relative space-y-5" aria-label="Formulir pengaduan pelayanan">
        <HoneypotField value={honeypot} onChange={setHoneypot} />

        <SectionCard letter="A" title="Identitas Pengadu" subtitle="Data pribadi hanya digunakan petugas LPMQ untuk menindaklanjuti pengaduan.">
          <ReporterFields form={reporter} errors={errors} setField={setReporterField} />
        </SectionCard>

        <SectionCard letter="B" title="Data Pelayanan Surat Tanda Tashih/Izin Edar yang Diadukan">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nomor_pendaftaran" label="Nomor Pendaftaran Mushaf" error={errors.nomor_pendaftaran}>
              <input id="nomor_pendaftaran" name="nomor_pendaftaran" type="text" maxLength={120} value={service.nomor_pendaftaran}
                onChange={setServiceField('nomor_pendaftaran')} placeholder="Contoh: REG-2026-000123"
                aria-invalid={Boolean(errors.nomor_pendaftaran)} aria-describedby={describedBy(errors, 'nomor_pendaftaran')}
                className={inputClass(errors.nomor_pendaftaran)} />
            </Field>
            <Field id="penerbit_pendaftar" label="Penerbit Pendaftar Mushaf" error={errors.penerbit_pendaftar}>
              <input id="penerbit_pendaftar" name="penerbit_pendaftar" type="text" maxLength={255} value={service.penerbit_pendaftar}
                onChange={setServiceField('penerbit_pendaftar')} placeholder="Nama penerbit yang mendaftarkan mushaf"
                aria-invalid={Boolean(errors.penerbit_pendaftar)} aria-describedby={describedBy(errors, 'penerbit_pendaftar')}
                className={inputClass(errors.penerbit_pendaftar)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard letter="C" title="Jenis Pengaduan">
          <div className="space-y-5">
            <Field id="jenis_pengaduan" label="Jenis Pengaduan" error={errors.jenis_pengaduan} as="fieldset">
              <div className="grid gap-2" role="radiogroup" aria-describedby={describedBy(errors, 'jenis_pengaduan')}>
                {categories.map((item) => (
                  <label key={item.kode} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                    service.jenis_pengaduan === item.kode
                      ? 'border-lpmq-green bg-lpmq-soft font-semibold text-lpmq-dark'
                      : errors.jenis_pengaduan ? 'border-civic-danger' : 'border-line hover:border-line-strong'
                  }`}>
                    <input type="radio" name="jenis_pengaduan" value={item.kode} checked={service.jenis_pengaduan === item.kode}
                      onChange={setServiceField('jenis_pengaduan')} className="h-4 w-4 accent-lpmq-green" />
                    {item.label}
                  </label>
                ))}
              </div>
            </Field>
            <Field id="deskripsi" label="Deskripsi Pengaduan" error={errors.deskripsi}>
              <textarea id="deskripsi" name="deskripsi" rows={5} maxLength={5000} value={service.deskripsi}
                onChange={setServiceField('deskripsi')}
                placeholder="Uraikan pengaduan Anda: kronologi, tanggal kejadian, dan harapan penyelesaian"
                aria-invalid={Boolean(errors.deskripsi)} aria-describedby={describedBy(errors, 'deskripsi')}
                className={inputClass(errors.deskripsi)} />
            </Field>
          </div>
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

export default ServiceComplaintPage;
