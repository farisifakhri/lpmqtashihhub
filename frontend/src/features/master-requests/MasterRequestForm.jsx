import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  FileUp,
  Hand,
  Loader2,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { masterRequestApi } from '@/api/master-request.api';

export const MAX_FILE_BYTES = 500 * 1024;

const EMPTY_FORM = {
  nama_pemohon: '',
  alamat: '',
  provinsi_kode: '',
  kabupaten_kode: '',
  kecamatan_kode: '',
  kode_pos: '',
  telepon: '',
  email: '',
  lembaga: '',
  jenis_mushaf: '',
  penggunaan: '',
};

const FILE_FIELDS = [
  {
    name: 'surat_permohonan',
    label: "Surat Permohonan Master Mushaf Al-Qur'an",
    short: 'Surat permohonan',
    hint: 'Surat resmi dari pemohon/lembaga yang ditujukan kepada LPMQ.',
  },
  {
    name: 'profil_pemohon',
    label: "Profil Pemohon Master Mushaf Al-Qur'an",
    short: 'Profil pemohon',
    hint: 'Gambaran singkat lembaga atau kegiatan pemohon.',
  },
];

// Pengelompokan jenis master agar mudah dipindai; kode yang belum dikenal masuk "Lainnya".
const MUSHAF_GROUPS = [
  {
    id: 'umum',
    title: "Mushaf Al-Qur'an",
    icon: BookOpen,
    codes: ['MUSHAF_30_JUZ_USMAN_TOHA', 'MUSHAF_30_JUZ_ISEP_MISBAH', 'MUSHAF_30_JUZ_ISEP_MISBAH_TAJWID', 'MUSHAF_TERJEMAH_ISEP_MISBAH', 'YASIN_TAHLIL'],
  },
  {
    id: 'isyarat',
    title: 'Isyarat (Tunarungu)',
    icon: Hand,
    codes: ['MUSHAF_ISYARAT_30_JUZ_KITABAH', 'MUSHAF_ISYARAT_30_JUZ_TILAWAH', 'JUZ_AMMA_ISYARAT_KITABAH', 'JUZ_AMMA_ISYARAT_TILAWAH', 'PANDUAN_BELAJAR_ISYARAT', 'PEDOMAN_ISYARAT_PDSRW'],
  },
  {
    id: 'braille',
    title: 'Braille (Tunanetra)',
    icon: ScrollText,
    codes: ['MUSHAF_BRAILLE_TERJEMAH', 'PEDOMAN_BRAILLE'],
  },
];

/** Validasi sisi klien; aturan yang sama ditegakkan ulang oleh backend. */
export function validateMasterRequestForm(form, files) {
  const errors = {};
  const need = (key, message) => { if (!String(form[key] || '').trim()) errors[key] = message; };
  need('nama_pemohon', 'Nama pemohon wajib diisi.');
  need('alamat', 'Alamat pemohon wajib diisi.');
  need('provinsi_kode', 'Provinsi wajib dipilih.');
  need('kabupaten_kode', 'Kota/kabupaten wajib dipilih.');
  need('kecamatan_kode', 'Kecamatan wajib dipilih.');
  need('lembaga', 'Lembaga pemohon wajib diisi.');
  need('jenis_mushaf', "Jenis mushaf Al-Qur'an wajib dipilih.");
  need('penggunaan', "Penggunaan master mushaf Al-Qur'an wajib diisi.");

  if (!errors.nama_pemohon && form.nama_pemohon.trim().length < 3) errors.nama_pemohon = 'Nama pemohon minimal 3 karakter.';
  if (!errors.alamat && form.alamat.trim().length < 10) errors.alamat = 'Alamat pemohon minimal 10 karakter.';
  if (!errors.lembaga && form.lembaga.trim().length < 3) errors.lembaga = 'Lembaga pemohon minimal 3 karakter.';
  if (!errors.penggunaan && form.penggunaan.trim().length < 10) {
    errors.penggunaan = "Penggunaan master mushaf Al-Qur'an minimal 10 karakter.";
  }
  if (!/^\d{5}$/.test(form.kode_pos.trim())) errors.kode_pos = 'Kode pos harus 5 digit angka.';
  if (!form.telepon.trim()) errors.telepon = 'Nomor telepon wajib diisi.';
  else if (!/^(\+62|62|0)[0-9]{8,14}$/.test(form.telepon.trim())) errors.telepon = 'Nomor telepon tidak valid (contoh: 081234567890).';
  if (!form.email.trim()) errors.email = 'Email pemohon wajib diisi.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Format alamat email tidak valid.';

  for (const field of FILE_FIELDS) {
    const file = files[field.name];
    if (!file) errors[field.name] = `${field.label} wajib diunggah.`;
    else if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) errors[field.name] = 'Berkas harus berformat PDF.';
    else if (file.size > MAX_FILE_BYTES) errors[field.name] = 'Ukuran berkas maksimal 500 KB.';
  }
  return errors;
}

const inputClass = (hasError) =>
  `w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 outline-none transition focus:border-lpmq-green focus:ring-4 focus:ring-lpmq-green/10 disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError ? 'border-civic-danger' : 'border-line'
  }`;

const Field = ({ id, label, error, className = '', children }) => (
  <div className={className}>
    <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink">
      {label} <span aria-hidden="true" className="text-civic-danger">*</span>
    </label>
    {children}
    {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-civic-danger">{error}</p>}
  </div>
);

/** Kartu bagian bernomor; berubah menjadi tanda centang bila bagian sudah lengkap. */
const StepCard = ({ number, title, subtitle, done, children }) => (
  <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7" aria-labelledby={`langkah-${number}`}>
    <header className="mb-6 flex items-start gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
          done ? 'bg-lpmq-green text-white' : 'bg-lpmq-soft text-lpmq-dark'
        }`}
        aria-hidden="true"
      >
        {done ? <Check className="h-4 w-4" /> : number}
      </span>
      <div>
        <h2 id={`langkah-${number}`} className="text-lg font-bold leading-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
    </header>
    {children}
  </section>
);

const formatKb = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Formulir permohonan master mushaf untuk penerbit terdaftar.
 * @param {object} props
 * @param {object} [props.defaults] Nilai awal (mis. nama lembaga & email akun penerbit)
 * @param {(result: object) => void} props.onSubmitted Dipanggil setelah permohonan tersimpan
 */
export const MasterRequestForm = ({ defaults = {}, onSubmitted }) => {
  const formRef = useRef(null);
  const initialForm = useMemo(() => ({ ...EMPTY_FORM, ...defaults }), [defaults]);

  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [mushafTypes, setMushafTypes] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([masterRequestApi.getMushafTypes(), masterRequestApi.getProvinces()])
      .then(([types, provs]) => {
        if (!active) return;
        setMushafTypes(types?.data || []);
        setProvinces(provs?.data || []);
      })
      .catch(() => active && setLoadError('Data pilihan formulir belum dapat dimuat. Muat ulang halaman ini.'));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setRegencies([]);
    if (!form.provinsi_kode) return undefined;
    let active = true;
    masterRequestApi.getRegencies(form.provinsi_kode)
      .then((res) => active && setRegencies(res?.data || []))
      .catch(() => active && setLoadError('Daftar kota/kabupaten belum dapat dimuat. Coba pilih ulang provinsi.'));
    return () => { active = false; };
  }, [form.provinsi_kode]);

  useEffect(() => {
    setDistricts([]);
    if (!form.kabupaten_kode) return undefined;
    let active = true;
    masterRequestApi.getDistricts(form.kabupaten_kode)
      .then((res) => active && setDistricts(res?.data || []))
      .catch(() => active && setLoadError('Daftar kecamatan belum dapat dimuat. Coba pilih ulang kota/kabupaten.'));
    return () => { active = false; };
  }, [form.kabupaten_kode]);

  const groupedTypes = useMemo(() => {
    const known = new Set(MUSHAF_GROUPS.flatMap((g) => g.codes));
    const groups = MUSHAF_GROUPS.map((group) => ({
      ...group,
      items: group.codes.map((code) => mushafTypes.find((t) => t.kode === code)).filter(Boolean),
    }));
    const others = mushafTypes.filter((t) => !known.has(t.kode));
    if (others.length) groups.push({ id: 'lainnya', title: 'Lainnya', icon: BookOpen, items: others });
    return groups.filter((g) => g.items.length > 0);
  }, [mushafTypes]);

  // Status kelengkapan tiap bagian untuk panel kemajuan
  const progress = useMemo(() => {
    const filled = (keys) => keys.every((k) => String(form[k] || '').trim());
    return [
      { label: 'Data pemohon', done: filled(['nama_pemohon', 'lembaga', 'telepon', 'email']) },
      { label: 'Alamat & wilayah', done: filled(['alamat', 'provinsi_kode', 'kabupaten_kode', 'kecamatan_kode', 'kode_pos']) },
      { label: 'Master yang dimohon', done: filled(['jenis_mushaf', 'penggunaan']) },
      { label: 'Dokumen PDF', done: FILE_FIELDS.every(({ name }) => files[name] && files[name].size <= MAX_FILE_BYTES) },
      { label: 'Persetujuan', done: agreed },
    ];
  }, [form, files, agreed]);
  const doneCount = progress.filter((p) => p.done).length;

  const clearError = (key) => setErrors((prev) => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'provinsi_kode') { next.kabupaten_kode = ''; next.kecamatan_kode = ''; }
      if (key === 'kabupaten_kode') next.kecamatan_kode = '';
      return next;
    });
    clearError(key);
  };

  const onText = (key) => (event) => setField(key, event.target.value);
  const onDigits = (key, max) => (event) => setField(key, event.target.value.replace(/[^\d+]/g, '').slice(0, max));

  const onFile = (name) => (event) => {
    const file = event.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [name]: file }));
    clearError(name);
    if (file && file.size > MAX_FILE_BYTES) {
      setErrors((prev) => ({ ...prev, [name]: 'Ukuran berkas maksimal 500 KB.' }));
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setFiles({});
    setAgreed(false);
    setErrors({});
    setServerError(null);
    setFileInputKey((k) => k + 1);
  };

  const focusFirstError = (errs) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    const el = formRef.current?.querySelector(`[name="${first}"]`);
    el?.focus?.();
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!agreed || submitting) return;
    setServerError(null);
    const errs = validateMasterRequestForm(form, files);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs);
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value.trim()));
    formData.append('pernyataan', 'true');
    FILE_FIELDS.forEach(({ name }) => formData.append(name, files[name]));

    setSubmitting(true);
    try {
      const response = await masterRequestApi.submit(formData);
      onSubmitted?.(response?.data || {});
    } catch (error) {
      const fieldErrors = {};
      for (const item of error?.data?.errors || []) {
        if (item?.field && item?.message && !fieldErrors[item.field]) fieldErrors[item.field] = item.message;
      }
      setErrors(fieldErrors);
      setServerError(error?.message || 'Permohonan belum dapat dikirim. Silakan coba lagi.');
      focusFirstError(fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const describedBy = (key) => (errors[key] ? `${key}-error` : undefined);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      {/* Panel informasi & kemajuan */}
      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lpmq-soft px-3 py-1 text-[11px] font-semibold text-lpmq-dark">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Layanan gratis LPMQ
          </span>
          <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
            Ajukan Master Mushaf <span className="whitespace-nowrap">Al-Qur&apos;an</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Dapatkan berkas master mushaf terbitan LPMQ untuk kebutuhan lembaga Anda. Cukup lengkapi empat
            langkah singkat, lalu kirim.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Kelengkapan</span>
            <span className="font-mono text-ink-muted" data-testid="progress-count">{doneCount}/{progress.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden xl:mb-4 rounded-full bg-surface-subtle" aria-hidden="true">
            <div className="h-full rounded-full bg-lpmq-green transition-all" style={{ width: `${(doneCount / progress.length) * 100}%` }} />
          </div>
          <ul className="hidden space-y-2 xl:block">
            {progress.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  item.done ? 'border-lpmq-green bg-lpmq-green text-white' : 'border-line-strong'
                }`} aria-hidden="true">
                  {item.done && <Check className="h-2.5 w-2.5" />}
                </span>
                <span className={item.done ? 'text-ink' : 'text-ink-muted'}>{item.label}</span>
                <span className="sr-only">{item.done ? '(lengkap)' : '(belum lengkap)'}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-lpmq-dark p-4 text-white">
          <p className="flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Perlu diingat
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-white/85">
            <li>• Master diberikan cuma-cuma dan tidak boleh dijual.</li>
            <li>• Hasil cetak wajib memiliki tanda tashih LPMQ sebelum diedarkan.</li>
          </ul>
        </div>
      </aside>

      {/* Formulir */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
        {loadError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        <StepCard number={1} title="Siapa yang mengajukan?" subtitle="Kami akan menghubungi Anda melalui kontak ini."
          done={progress[0].done && progress[1].done}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nama_pemohon" label="Nama Pemohon" error={errors.nama_pemohon}>
              <input id="nama_pemohon" name="nama_pemohon" type="text" maxLength={255} autoComplete="name"
                value={form.nama_pemohon} onChange={onText('nama_pemohon')} placeholder="Contoh: Ahmad Fauzi"
                aria-invalid={Boolean(errors.nama_pemohon)} aria-describedby={describedBy('nama_pemohon')}
                className={inputClass(errors.nama_pemohon)} />
            </Field>
            <Field id="lembaga" label="Lembaga Pemohon" error={errors.lembaga}>
              <input id="lembaga" name="lembaga" type="text" maxLength={255} autoComplete="organization"
                value={form.lembaga} onChange={onText('lembaga')} placeholder="Contoh: Yayasan Nurul Huda"
                aria-invalid={Boolean(errors.lembaga)} aria-describedby={describedBy('lembaga')}
                className={inputClass(errors.lembaga)} />
            </Field>
            <Field id="telepon" label="Nomor Telepon Pemohon" error={errors.telepon}>
              <input id="telepon" name="telepon" type="tel" inputMode="tel" autoComplete="tel"
                value={form.telepon} onChange={onDigits('telepon', 16)} placeholder="08xxxxxxxxxx"
                aria-invalid={Boolean(errors.telepon)} aria-describedby={describedBy('telepon')}
                className={inputClass(errors.telepon)} />
            </Field>
            <Field id="email" label="Email Pemohon" error={errors.email}>
              <input id="email" name="email" type="email" maxLength={255} autoComplete="email"
                value={form.email} onChange={onText('email')} placeholder="nama@contoh.com"
                aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')}
                className={inputClass(errors.email)} />
            </Field>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">Alamat</p>
            <div className="grid gap-4 sm:grid-cols-6">
              <Field id="alamat" label="Alamat Pemohon" error={errors.alamat} className="sm:col-span-6">
                <input id="alamat" name="alamat" type="text" maxLength={1000} autoComplete="street-address"
                  value={form.alamat} onChange={onText('alamat')} placeholder="Nama jalan, nomor, RT/RW"
                  aria-invalid={Boolean(errors.alamat)} aria-describedby={describedBy('alamat')}
                  className={inputClass(errors.alamat)} />
              </Field>
              <Field id="provinsi_kode" label="Provinsi" error={errors.provinsi_kode} className="sm:col-span-3">
                <select id="provinsi_kode" name="provinsi_kode" value={form.provinsi_kode} onChange={onText('provinsi_kode')}
                  aria-invalid={Boolean(errors.provinsi_kode)} aria-describedby={describedBy('provinsi_kode')}
                  className={inputClass(errors.provinsi_kode)}>
                  <option value="">Pilih provinsi</option>
                  {provinces.map((p) => <option key={p.kode} value={p.kode}>{p.nama}</option>)}
                </select>
              </Field>
              <Field id="kabupaten_kode" label="Kota/Kabupaten" error={errors.kabupaten_kode} className="sm:col-span-3">
                <select id="kabupaten_kode" name="kabupaten_kode" value={form.kabupaten_kode} onChange={onText('kabupaten_kode')}
                  disabled={!form.provinsi_kode}
                  aria-invalid={Boolean(errors.kabupaten_kode)} aria-describedby={describedBy('kabupaten_kode')}
                  className={inputClass(errors.kabupaten_kode)}>
                  <option value="">{form.provinsi_kode ? 'Pilih kota/kabupaten' : 'Pilih provinsi dahulu'}</option>
                  {regencies.map((r) => <option key={r.kode} value={r.kode}>{r.nama}</option>)}
                </select>
              </Field>
              <Field id="kecamatan_kode" label="Kecamatan" error={errors.kecamatan_kode} className="sm:col-span-4">
                <select id="kecamatan_kode" name="kecamatan_kode" value={form.kecamatan_kode} onChange={onText('kecamatan_kode')}
                  disabled={!form.kabupaten_kode}
                  aria-invalid={Boolean(errors.kecamatan_kode)} aria-describedby={describedBy('kecamatan_kode')}
                  className={inputClass(errors.kecamatan_kode)}>
                  <option value="">{form.kabupaten_kode ? 'Pilih kecamatan' : 'Pilih kota/kabupaten dahulu'}</option>
                  {districts.map((d) => <option key={d.kode} value={d.kode}>{d.nama}</option>)}
                </select>
              </Field>
              <Field id="kode_pos" label="Kode Pos" error={errors.kode_pos} className="sm:col-span-2">
                <input id="kode_pos" name="kode_pos" type="text" inputMode="numeric" autoComplete="postal-code"
                  value={form.kode_pos} onChange={onDigits('kode_pos', 5)} placeholder="5 digit"
                  aria-invalid={Boolean(errors.kode_pos)} aria-describedby={describedBy('kode_pos')}
                  className={inputClass(errors.kode_pos)} />
              </Field>
            </div>
          </div>
        </StepCard>

        <StepCard number={2} title="Master apa yang dibutuhkan?" subtitle="Pilih satu jenis master mushaf." done={progress[2].done}>
          <fieldset aria-describedby={describedBy('jenis_mushaf')}>
            <legend className="sr-only">Jenis Mushaf Al-Qur&apos;an</legend>
            <div className="space-y-5">
              {groupedTypes.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.id}>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {group.title}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((type) => {
                        const checked = form.jenis_mushaf === type.kode;
                        return (
                          <label key={type.kode}
                            className={`relative flex cursor-pointer items-center rounded-xl border px-3.5 py-3 text-[13px] leading-snug transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-lpmq-green/20 ${
                              checked
                                ? 'border-lpmq-green bg-lpmq-soft/50 font-semibold text-ink'
                                : errors.jenis_mushaf ? 'border-civic-danger text-ink' : 'border-line text-ink hover:border-lpmq-green/50'
                            }`}>
                            <input type="radio" name="jenis_mushaf" value={type.kode} checked={checked}
                              onChange={onText('jenis_mushaf')} className="sr-only" />
                            <span className="pr-6">{type.label}</span>
                            {checked && (
                              <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-lpmq-green text-white" aria-hidden="true">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.jenis_mushaf && (
              <p id="jenis_mushaf-error" className="mt-2 text-xs font-medium text-civic-danger">{errors.jenis_mushaf}</p>
            )}
          </fieldset>

          <Field id="penggunaan" label="Rencana Penggunaan" error={errors.penggunaan} className="mt-6">
            <textarea id="penggunaan" name="penggunaan" rows={3} maxLength={2000}
              value={form.penggunaan} onChange={onText('penggunaan')}
              placeholder="Ceritakan singkat untuk apa master ini, mis. dicetak dan dibagikan gratis di majelis taklim."
              aria-invalid={Boolean(errors.penggunaan)} aria-describedby={describedBy('penggunaan')}
              className={`${inputClass(errors.penggunaan)} resize-y`} />
          </Field>
        </StepCard>

        <StepCard number={3} title="Lampirkan dokumen" subtitle="Format PDF, masing-masing paling besar 500 KB." done={progress[3].done}>
          <div className="grid gap-3 sm:grid-cols-2">
            {FILE_FIELDS.map((field) => {
              const file = files[field.name];
              const error = errors[field.name];
              return (
                <div key={field.name}>
                  <label htmlFor={field.name}
                    className={`relative flex h-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-lpmq-green/20 ${
                      error ? 'border-civic-danger bg-civic-dangerSoft/40'
                        : file ? 'border-lpmq-green bg-lpmq-soft/40' : 'border-line hover:border-lpmq-green/60 hover:bg-surface-subtle'
                    }`}>
                    <input key={`${field.name}-${fileInputKey}`} id={field.name} name={field.name} type="file"
                      accept="application/pdf,.pdf" onChange={onFile(field.name)} className="sr-only"
                      aria-label={field.label} aria-invalid={Boolean(error)}
                      aria-describedby={`${field.name}-hint${error ? ` ${field.name}-error` : ''}`} />
                    {file ? <CheckCircle2 className="h-6 w-6 text-lpmq-green" aria-hidden="true" />
                      : <FileUp className="h-6 w-6 text-ink-muted" aria-hidden="true" />}
                    <span className="mt-2 text-sm font-semibold text-ink">
                      {field.short} <span aria-hidden="true" className="text-civic-danger">*</span>
                    </span>
                    {file ? (
                      <span className="mt-1 max-w-full truncate text-xs text-ink-muted">{file.name} · {formatKb(file.size)}</span>
                    ) : (
                      <span id={`${field.name}-hint`} className="mt-1 text-xs text-ink-muted">{field.hint}</span>
                    )}
                    <span className="mt-3 rounded-lg bg-surface px-3 py-1 text-xs font-semibold text-lpmq-green ring-1 ring-line">
                      {file ? 'Ganti berkas' : 'Pilih PDF'}
                    </span>
                  </label>
                  {file && <span id={`${field.name}-hint`} className="sr-only">{field.hint}</span>}
                  {error && <p id={`${field.name}-error`} className="mt-1.5 text-xs font-medium text-civic-danger">{error}</p>}
                </div>
              );
            })}
          </div>
        </StepCard>

        <StepCard number={4} title="Persetujuan" done={progress[4].done}>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
            agreed ? 'border-lpmq-green bg-lpmq-soft/40' : 'border-line hover:border-lpmq-green/50'
          }`}>
            <input type="checkbox" name="pernyataan" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              aria-label="Saya menyetujui pernyataan permohonan master mushaf"
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-lpmq-green" />
            <div className="text-sm leading-relaxed text-ink">
              <p className="font-semibold">Saya menyetujui hal-hal berikut:</p>
              <ul className="mt-2 space-y-1 text-[13px] text-ink-muted">
                <li>✓ Data yang saya isi benar dan dapat saya pertanggungjawabkan.</li>
                <li>✓ Master dari LPMQ tidak akan saya perjualbelikan.</li>
                <li>✓ Saya akan mengurus tanda tashih LPMQ sebelum hasilnya diedarkan.</li>
                <li>✓ Saya siap menerima sanksi sesuai ketentuan bila data terbukti tidak benar.</li>
              </ul>
            </div>
          </label>
        </StepCard>

        {serverError && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-civic-dangerLine bg-civic-dangerSoft px-4 py-3 text-sm text-civic-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="flex flex-col-reverse items-stretch gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={handleReset} disabled={submitting}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-surface-subtle hover:text-ink disabled:opacity-60">
            Kosongkan Formulir
          </button>
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <button type="submit" disabled={!agreed || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-lpmq-green px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-lpmq-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted disabled:shadow-none">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Mengirim...' : 'Kirim Permohonan'}
            </button>
            {!agreed && <span className="text-[11px] text-ink-muted">Centang persetujuan untuk mengirim.</span>}
          </div>
        </div>
      </form>
    </div>
  );
};

export default MasterRequestForm;
