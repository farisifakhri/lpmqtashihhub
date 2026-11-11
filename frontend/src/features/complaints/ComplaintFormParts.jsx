import React, { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Copy, FileUp, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { complaintApi } from '@/api/complaint.api';
import { Modal } from '@/components/ui/Modal';
import { PublicAppPromotion } from '@/components/public/PublicAppPromotion';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader, PUBLIC_INFORMATION_NAV_ITEMS } from '@/components/public/PublicHeader';
import { COMPLAINT_ACCEPT, COMPLAINT_ROUTES, formatDateTime, formatFileSize } from './complaint.constants';

export const inputClass = (hasError) =>
  `w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 outline-none transition focus:border-lpmq-green focus:ring-4 focus:ring-lpmq-green/10 disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError ? 'border-civic-danger' : 'border-line'
  }`;

export const describedBy = (errors, key) => (errors[key] ? `${key}-error` : undefined);

/** Label + pesan galat. `as="fieldset"` untuk grup radio. */
export const Field = ({ id, label, error, hint, className = '', required = true, as = 'div', children }) => {
  const Wrapper = as;
  const LabelTag = as === 'fieldset' ? 'legend' : 'label';
  return (
    <Wrapper className={className}>
      <LabelTag {...(as === 'fieldset' ? {} : { htmlFor: id })} className="mb-1.5 block text-[13px] font-semibold text-ink">
        {label} {required && <span aria-hidden="true" className="text-civic-danger">*</span>}
      </LabelTag>
      {children}
      {hint && !error && <p className="mt-1.5 text-[11px] text-ink-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-civic-danger">{error}</p>}
    </Wrapper>
  );
};

export const SectionCard = ({ letter, title, subtitle, children, actions }) => (
  <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7" aria-labelledby={`bagian-${letter}`}>
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lpmq-soft text-sm font-bold text-lpmq-dark" aria-hidden="true">
          {letter}
        </span>
        <div>
          <h2 id={`bagian-${letter}`} className="text-base font-bold leading-tight text-ink sm:text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </header>
    {children}
  </section>
);

/** Kerangka halaman publik pengaduan: header, breadcrumb, judul, footer landing page. */
export const ComplaintPublicShell = ({ title, description, activeHref, children }) => {
  const navigate = useNavigate();
  const handleNavigate = (path, event) => {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event?.preventDefault();
    if (path?.startsWith('/')) navigate(path);
    else if (path?.startsWith('#')) navigate(`/${path}`);
  };
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PublicHeader
        activePage="Pengaduan"
        activeHref={activeHref}
        handleNavigate={handleNavigate}
        navItems={PUBLIC_INFORMATION_NAV_ITEMS}
        logoHref="/"
      />
      <main id="main-content" className="mx-auto min-h-[55vh] max-w-[1100px] px-5 py-8 sm:px-8 lg:px-12">
        <nav aria-label="Breadcrumb" className="mb-5 text-xs text-ink-muted">
          <Link to="/" className="hover:text-brand-700">Beranda</Link>
          <span className="mx-2">/</span>
          <span>Pengaduan</span>
          <span className="mx-2">/</span>
          <span className="text-ink">{title}</span>
        </nav>
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{description}</p>}
        </header>
        {children}
      </main>
      <PublicAppPromotion />
      <PublicFooter handleNavigate={handleNavigate} />
    </div>
  );
};

/** Data wilayah berjenjang provinsi -> kota/kabupaten -> kecamatan. */
function useRegions(provinceCode, regencyCode) {
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    complaintApi.getProvinces()
      .then((res) => active && setProvinces(res?.data || []))
      .catch(() => active && setError('Daftar provinsi belum dapat dimuat. Muat ulang halaman ini.'));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setRegencies([]);
    if (!provinceCode) return undefined;
    let active = true;
    complaintApi.getRegencies(provinceCode)
      .then((res) => active && setRegencies(res?.data || []))
      .catch(() => active && setError('Daftar kota/kabupaten belum dapat dimuat. Coba pilih ulang provinsi.'));
    return () => { active = false; };
  }, [provinceCode]);

  useEffect(() => {
    setDistricts([]);
    if (!regencyCode) return undefined;
    let active = true;
    complaintApi.getDistricts(regencyCode)
      .then((res) => active && setDistricts(res?.data || []))
      .catch(() => active && setError('Daftar kecamatan belum dapat dimuat. Coba pilih ulang kota/kabupaten.'));
    return () => { active = false; };
  }, [regencyCode]);

  return { provinces, regencies, districts, error };
}

/** Bagian A: Identitas Pengadu (sama untuk kedua formulir). */
export const ReporterFields = ({ form, errors, setField }) => {
  const { provinces, regencies, districts, error } = useRegions(form.provinsi_kode, form.kabupaten_kode);
  const onText = (key) => (event) => setField(key, event.target.value);
  const onDigits = (key, max) => (event) => setField(key, event.target.value.replace(/[^\d+]/g, '').slice(0, max));
  const props = (key) => ({
    id: key,
    name: key,
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': describedBy(errors, key),
    className: inputClass(errors[key]),
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-civic-dangerLine bg-civic-dangerSoft px-3 py-2 text-xs text-civic-danger sm:col-span-2">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
      <Field id="nama" label="Nama Pengadu" error={errors.nama} className="sm:col-span-2">
        <input {...props('nama')} type="text" maxLength={255} autoComplete="name" value={form.nama} onChange={onText('nama')} placeholder="Nama lengkap sesuai identitas" />
      </Field>
      <Field id="jenis_kelamin" label="Jenis Kelamin" error={errors.jenis_kelamin} as="fieldset">
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-describedby={describedBy(errors, 'jenis_kelamin')}>
          {[['LAKI_LAKI', 'Laki-laki'], ['PEREMPUAN', 'Perempuan']].map(([value, label]) => (
            <label key={value} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition ${
              form.jenis_kelamin === value ? 'border-lpmq-green bg-lpmq-soft text-lpmq-dark' : errors.jenis_kelamin ? 'border-civic-danger' : 'border-line hover:border-line-strong'
            }`}>
              <input type="radio" name="jenis_kelamin" value={value} checked={form.jenis_kelamin === value}
                onChange={onText('jenis_kelamin')} className="h-4 w-4 accent-lpmq-green" />
              {label}
            </label>
          ))}
        </div>
      </Field>
      <Field id="usia" label="Usia Pengadu" error={errors.usia}>
        <div className="relative">
          <input {...props('usia')} type="text" inputMode="numeric" maxLength={3} value={form.usia}
            onChange={(event) => setField('usia', event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Contoh: 35" />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">tahun</span>
        </div>
      </Field>
      <Field id="alamat" label="Alamat Pengadu" error={errors.alamat} className="sm:col-span-2">
        <textarea {...props('alamat')} rows={2} maxLength={1000} autoComplete="street-address" value={form.alamat}
          onChange={onText('alamat')} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan/desa" />
      </Field>
      <Field id="provinsi_kode" label="Provinsi" error={errors.provinsi_kode}>
        <select {...props('provinsi_kode')} value={form.provinsi_kode} onChange={onText('provinsi_kode')}>
          <option value="">Pilih provinsi</option>
          {provinces.map((item) => <option key={item.kode} value={item.kode}>{item.nama}</option>)}
        </select>
      </Field>
      <Field id="kabupaten_kode" label="Kota/Kabupaten" error={errors.kabupaten_kode}>
        <select {...props('kabupaten_kode')} value={form.kabupaten_kode} onChange={onText('kabupaten_kode')} disabled={!form.provinsi_kode}>
          <option value="">{form.provinsi_kode ? 'Pilih kota/kabupaten' : 'Pilih provinsi dahulu'}</option>
          {regencies.map((item) => <option key={item.kode} value={item.kode}>{item.nama}</option>)}
        </select>
      </Field>
      <Field id="kecamatan_kode" label="Kecamatan" error={errors.kecamatan_kode}>
        <select {...props('kecamatan_kode')} value={form.kecamatan_kode} onChange={onText('kecamatan_kode')} disabled={!form.kabupaten_kode}>
          <option value="">{form.kabupaten_kode ? 'Pilih kecamatan' : 'Pilih kota/kabupaten dahulu'}</option>
          {districts.map((item) => <option key={item.kode} value={item.kode}>{item.nama}</option>)}
        </select>
      </Field>
      <Field id="kode_pos" label="Kode Pos" error={errors.kode_pos}>
        <input {...props('kode_pos')} type="text" inputMode="numeric" maxLength={5} autoComplete="postal-code" value={form.kode_pos}
          onChange={(event) => setField('kode_pos', event.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="5 digit" />
      </Field>
      <Field id="telepon" label="Nomor Telepon Pengadu" error={errors.telepon}>
        <input {...props('telepon')} type="tel" inputMode="tel" autoComplete="tel" value={form.telepon}
          onChange={onDigits('telepon', 16)} placeholder="08xxxxxxxxxx" />
      </Field>
      <Field id="email" label="Email Pengadu" error={errors.email} hint="Kode pengaduan juga dikirim ke email ini.">
        <input {...props('email')} type="email" maxLength={255} autoComplete="email" value={form.email}
          onChange={onText('email')} placeholder="nama@contoh.com" />
      </Field>
      <Field id="pekerjaan" label="Pekerjaan Pengadu" error={errors.pekerjaan} className="sm:col-span-2">
        <input {...props('pekerjaan')} type="text" maxLength={120} autoComplete="organization-title" value={form.pekerjaan}
          onChange={onText('pekerjaan')} placeholder="Contoh: Guru, Mahasiswa, Wiraswasta" />
      </Field>
    </div>
  );
};

/** Kotak unggah berkas (JPG/JPEG/PNG/PDF, maks. 2 MB). */
export const ComplaintFileInput = ({ id, name, label, file, error, onChange }) => (
  <Field id={id} label={label} error={error} hint="Format JPG, JPEG, PNG, atau PDF. Ukuran maksimal 2 MB.">
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition hover:border-lpmq-green hover:bg-lpmq-soft/40 ${
        error ? 'border-civic-danger' : file ? 'border-lpmq-green bg-lpmq-soft/30' : 'border-line-strong'
      }`}
    >
      <FileUp className={`h-5 w-5 shrink-0 ${file ? 'text-lpmq-green' : 'text-ink-muted'}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm">
        {file ? (
          <>
            <span className="block truncate font-semibold text-ink">{file.name}</span>
            <span className="text-xs text-ink-muted">{formatFileSize(file.size)} · klik untuk mengganti berkas</span>
          </>
        ) : (
          <span className="text-ink-muted">Klik untuk memilih berkas</span>
        )}
      </span>
      <input
        id={id}
        name={name}
        type="file"
        accept={COMPLAINT_ACCEPT}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="sr-only"
      />
    </label>
  </Field>
);

/**
 * CAPTCHA gambar dari backend. Token sekali pakai: muat ulang setelah setiap percobaan kirim.
 * `ref.current.refresh()` dipanggil halaman induk setelah pengiriman gagal/berhasil.
 */
export const CaptchaField = forwardRef(({ value, onChange, error }, ref) => {
  const [captcha, setCaptcha] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await complaintApi.getCaptcha();
      setCaptcha(res?.data || null);
    } catch (err) {
      setLoadError(err?.message || 'Kode verifikasi belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
    onChange('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useImperativeHandle(ref, () => ({ refresh, token: captcha?.token || '' }), [refresh, captcha]);

  return (
    <Field id="captcha_jawaban" label="Kode Verifikasi" error={error || loadError}
      hint="Ketik huruf/angka pada gambar (tidak membedakan huruf besar/kecil).">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-16 w-[200px] items-center justify-center overflow-hidden rounded-xl border border-line bg-[#f4f1e8]">
          {captcha?.image
            ? <img src={captcha.image} alt="Gambar kode verifikasi" width={200} height={64} draggable={false} />
            : <Loader2 className="h-5 w-5 animate-spin text-ink-muted" aria-hidden="true" />}
        </div>
        <button type="button" onClick={refresh} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Ganti kode
        </button>
        <input
          id="captcha_jawaban"
          name="captcha_jawaban"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'captcha_jawaban-error' : undefined}
          placeholder="Ketik kode"
          className={`${inputClass(error)} w-40 font-mono tracking-[0.3em]`}
        />
      </div>
    </Field>
  );
});
CaptchaField.displayName = 'CaptchaField';

/** Kolom jebakan bot (tersembunyi dari pengguna & pembaca layar). */
export const HoneypotField = ({ value, onChange }) => (
  <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
    <label htmlFor="website">Situs web</label>
    <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

export const FormAlert = ({ children }) => (
  <div role="alert" className="flex items-start gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <span>{children}</span>
  </div>
);

export const FormActions = ({ submitting, onReset }) => (
  <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
    <button type="button" onClick={onReset} disabled={submitting}
      className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle disabled:opacity-50">
      Reset
    </button>
    <button type="submit" disabled={submitting}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-lpmq-green px-6 py-2.5 text-sm font-bold text-white hover:bg-lpmq-dark disabled:cursor-wait disabled:opacity-70">
      {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {submitting ? 'Mengirim...' : 'Kirim Pengaduan'}
    </button>
  </div>
);

/** Konfirmasi setelah pengaduan tersimpan: kode, jenis, tanggal, dan tombol salin. */
export const ComplaintSuccessDialog = ({ result, onClose }) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  if (!result) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.kode_pengaduan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="md" title="Pengaduan Berhasil Dikirim" closeOnOverlayClick={false}>
      <div className="space-y-4">
        <div role="status" className="flex items-start gap-3 rounded-xl border border-civic-successLine bg-civic-successSoft p-4 text-sm text-civic-success">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>Pengaduan Anda berhasil diterima oleh sistem dan akan diverifikasi oleh petugas LPMQ.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-subtle p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Kode Pengaduan</p>
          <p className="mt-1 break-all font-mono text-xl font-extrabold tracking-wide text-ink" data-testid="kode-pengaduan">{result.kode_pengaduan}</p>
          <button type="button" onClick={copy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-subtle">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-civic-success" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? 'Kode tersalin' : 'Salin Kode Pengaduan'}
          </button>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-[150px_1fr]">
          <dt className="text-ink-muted">Jenis Pengaduan</dt>
          <dd className="font-semibold text-ink">{result.jenis_pengaduan_label}</dd>
          <dt className="text-ink-muted">Tanggal Pengiriman</dt>
          <dd className="font-semibold text-ink">{formatDateTime(result.tanggal_pengaduan)}</dd>
        </dl>
        <p className="rounded-xl bg-civic-warningSoft px-4 py-3 text-xs leading-relaxed text-civic-warning">
          Simpan kode ini. Kode pengaduan diperlukan untuk memantau perkembangan laporan melalui menu
          <strong> Pengaduan &gt; Lacak Pengaduan</strong>. Salinan kode juga dikirim ke email {result.email}.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle">
            <X className="h-4 w-4" aria-hidden="true" /> Tutup
          </button>
          <button type="button" onClick={() => navigate(COMPLAINT_ROUTES.LACAK, { state: { kode: result.kode_pengaduan } })}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-lpmq-green px-4 py-2 text-sm font-bold text-white hover:bg-lpmq-dark">
            <Search className="h-4 w-4" aria-hidden="true" /> Lacak Pengaduan
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** Ambil pesan galat per-kolom dari respons backend. */
export const fieldErrorsFrom = (error) => {
  const result = {};
  for (const item of error?.data?.errors || []) {
    if (item?.field && item?.message && !result[item.field]) result[item.field] = item.message;
  }
  return result;
};

export const focusFirstError = (formEl, errors) => {
  const first = Object.keys(errors)[0];
  if (!first || !formEl) return;
  const el = formEl.querySelector(`[name="${first}"]`) || formEl.querySelector(`[id="${first}"]`);
  el?.focus?.({ preventScroll: true });
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
};
