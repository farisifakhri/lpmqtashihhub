import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';
import { fileApi } from '@/api/file.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { RegistrationReceiptDialog } from './RegistrationReceiptDialog';
import {
  BookOpen,
  Send,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  FileText,
  Layers,
  HelpCircle,
} from 'lucide-react';

const JENIS_NASKAH_OPTIONS = [
  // Kolom 1
  [
    "1. Al-Qur'an 30 Juz",
    '1. Juz-juz pilihan',
    "1. Majmu' Syarif/ Surah-surah pilihan",
    "1. Mushaf Al-Qur'an Luar Negeri",
    '2. Audio/Visual',
    '3. Kode Tajwid',
    '3. Tajwid Warna',
    '3. Terjemah Perkata',
    '3. Transliterasi Perkata',
  ],
  // Kolom 2
  [
    "1. Juz 'Amma",
    '1. Kaligrafi',
    '1. Metode Baca Tulis Al-Qur\'an',
    '1. Surah Yasin dan Bacaan Tahlil',
    '2. Digital',
    '3. Tafsir',
    '3. Terjemah',
    '3. Transliterasi',
    "3. Waqaf Ibtida'",
  ],
];

const MATERI_TAMBAHAN_OPTIONS = [
  'Asbabun Nuzul',
  'Hadis',
  'Mutiara Hikmah',
  "Do'a Tertentu",
  'Kisah-Kisah',
  'Lainnya',
];

const NEGARA_ASAL_OPTIONS = [
  'Arab Saudi',
  'Mesir',
  'Lebanon',
  'Uni Emirat Arab',
  'Turki',
  'Yordania',
  'Kuwait',
  'Qatar',
  'Oman',
  'Bahrain',
  'Suriah',
  'Yaman',
  'Maroko',
  'Tunisia',
  'Aljazair',
  'Sudan',
  'Malaysia',
  'Brunei Darussalam',
  'Singapura',
  'Pakistan',
  'India',
  'Iran',
  'Palestina',
  'Lainnya',
];

export const NewRegistrationPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Bagian I. Informasi Data Mushaf
  const [title, setTitle] = useState('');
  const [penanggungJawabProduk, setPenanggungJawabProduk] = useState('');
  const [sizes, setSizes] = useState([{ ukuran: '', oplah: '' }]);
  const [selectedJenisNaskah, setSelectedJenisNaskah] = useState(["1. Al-Qur'an 30 Juz"]);
  const [jenisMushaf, setJenisMushaf] = useState('Mushaf Baru'); // 'Mushaf Baru' | 'Perpanjangan Tanda Tashih' | 'Mushaf Luar Negeri'
  const [namaPercetakan, setNamaPercetakan] = useState('');
  const [deskripsiMushaf, setDeskripsiMushaf] = useState('');

  // Field Khusus Perpanjangan Tanda Tashih
  const [noPendaftaranLama, setNoPendaftaranLama] = useState('');
  const [nomorKodeUkuranLama, setNomorKodeUkuranLama] = useState('');
  const [suratPernyataanFile, setSuratPernyataanFile] = useState(null);
  const [suratPernyataanFileId, setSuratPernyataanFileId] = useState(null);

  // Field Khusus Mushaf Luar Negeri
  const [negaraAsalMushaf, setNegaraAsalMushaf] = useState('');
  const [penerbitAsalMushaf, setPenerbitAsalMushaf] = useState('');
  const [lembagaPentashihAsal, setLembagaPentashihAsal] = useState('');
  const [buktiTashihFile, setBuktiTashihFile] = useState(null);
  const [buktiTashihFileId, setBuktiTashihFileId] = useState(null);

  // Bagian II. Informasi Data Materi Tambahan pada Mushaf
  const [selectedMateriTambahan, setSelectedMateriTambahan] = useState([]);
  const [penanggungJawabMateri, setPenanggungJawabMateri] = useState('');

  // Bagian III. Informasi Dokumen Mushaf
  const [suratPermohonanFile, setSuratPermohonanFile] = useState(null);
  const [suratPermohonanFileId, setSuratPermohonanFileId] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverFileId, setCoverFileId] = useState(null);
  const [apkFile, setApkFile] = useState(null);
  const [apkFileId, setApkFileId] = useState(null);

  // Status & State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');
  const [penanggungJawabError, setPenanggungJawabError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  // Fetch Master Data on mount
  useEffect(() => {
    const fetchMaster = async () => {
      setLoadingMaster(true);
      try {
        const [resCat, resSt, resAddon] = await Promise.all([
          masterApi.getCategories(),
          masterApi.getServiceTypes(),
          masterApi.getAddons(),
        ]);
        if (resCat?.data) setCategories(resCat.data);
        if (resSt?.data) setServiceTypes(resSt.data);
        if (resAddon?.data) setAddons(resAddon.data);
      } catch (err) {
        setError('Gagal memuat master data layanan: ' + err.message);
      } finally {
        setLoadingMaster(false);
      }
    };
    fetchMaster();
  }, []);

  // Handlers untuk Ukuran & Oplah Dinamis
  const handleAddSizeRow = () => {
    setSizes((prev) => [...prev, { ukuran: '', oplah: '' }]);
  };

  const handleRemoveSizeRow = (index) => {
    if (sizes.length <= 1) return;
    setSizes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSizeChange = (index, field, value) => {
    setSizes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Toggle Checkbox Jenis Naskah
  const toggleJenisNaskah = (item) => {
    setSelectedJenisNaskah((prev) => {
      const willInclude = !prev.includes(item);
      const next = willInclude ? [...prev, item] : prev.filter((i) => i !== item);
      if (item === "1. Mushaf Al-Qur'an Luar Negeri") {
        if (willInclude) {
          setJenisMushaf('Mushaf Luar Negeri');
        } else if (jenisMushaf === 'Mushaf Luar Negeri') {
          setJenisMushaf('Mushaf Baru');
        }
      }
      return next;
    });
  };

  // Change Jenis Mushaf Dropdown
  const handleJenisMushafChange = (val) => {
    setJenisMushaf(val);
    if (val === 'Mushaf Luar Negeri') {
      setSelectedJenisNaskah((prev) =>
        prev.includes("1. Mushaf Al-Qur'an Luar Negeri")
          ? prev
          : [...prev, "1. Mushaf Al-Qur'an Luar Negeri"]
      );
    } else {
      setSelectedJenisNaskah((prev) =>
        prev.filter((i) => i !== "1. Mushaf Al-Qur'an Luar Negeri")
      );
    }
  };

  // Toggle Checkbox Materi Tambahan
  const toggleMateriTambahan = (item) => {
    setSelectedMateriTambahan((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Upload Single File Helper
  const uploadSingleFile = async (fileObj) => {
    if (!fileObj) return null;
    const uploaded = await fileApi.upload(fileObj);
    return uploaded?.id || null;
  };

  // Submit / Save Draft
  const handleSave = async (isDirectSubmit = false) => {
    setError('');
    setTitleError('');
    setPenanggungJawabError('');
    setSuccessMsg('');

    if (title.trim().length < 3) {
      setTitleError('Nama produk/mushaf minimal 3 karakter.');
      return;
    }

    if (!penanggungJawabProduk.trim()) {
      setPenanggungJawabError('Nama penanggung jawab produk/mushaf wajib diisi.');
      return;
    }

    if (sizes.some((s) => s.ukuran.trim() && !s.oplah)) {
      setError('Jika ukuran diisi, rencana oplah juga wajib diisi.');
      return;
    }

    if (isDirectSubmit && jenisMushaf === 'Mushaf Luar Negeri') {
      if (!negaraAsalMushaf.trim()) {
        setError('Negara asal mushaf wajib dipilih.');
        return;
      }
      if (!penerbitAsalMushaf.trim()) {
        setError('Penerbit asal mushaf wajib diisi.');
        return;
      }
      if (!lembagaPentashihAsal.trim()) {
        setError('Lembaga pentashih asal mushaf wajib diisi.');
        return;
      }
    }

    setIsSubmitting(true);
    setUploadingFiles(true);

    try {
      // 1. Upload file dokumen jika ada yang dipilih
      let uploadedCoverId = coverFileId;
      if (coverFile && !uploadedCoverId) {
        uploadedCoverId = await uploadSingleFile(coverFile);
        setCoverFileId(uploadedCoverId);
      }

      let uploadedPermohonanId = suratPermohonanFileId;
      if (suratPermohonanFile && !uploadedPermohonanId) {
        uploadedPermohonanId = await uploadSingleFile(suratPermohonanFile);
        setSuratPermohonanFileId(uploadedPermohonanId);
      }

      let uploadedPernyataanId = suratPernyataanFileId;
      if (suratPernyataanFile && !uploadedPernyataanId) {
        uploadedPernyataanId = await uploadSingleFile(suratPernyataanFile);
        setSuratPernyataanFileId(uploadedPernyataanId);
      }

      let uploadedApkId = apkFileId;
      if (apkFile && !uploadedApkId) {
        uploadedApkId = await uploadSingleFile(apkFile);
        setApkFileId(uploadedApkId);
      }

      let uploadedBuktiTashihId = buktiTashihFileId;
      if (buktiTashihFile && !uploadedBuktiTashihId) {
        uploadedBuktiTashihId = await uploadSingleFile(buktiTashihFile);
        setBuktiTashihFileId(uploadedBuktiTashihId);
      }

      setUploadingFiles(false);

      // Tentukan registration_type dan registration_category
      let regType = 'NEW';
      let regCategory = 'NEW';
      if (jenisMushaf === 'Perpanjangan Tanda Tashih') {
        regType = 'EXTENSION';
        regCategory = 'EXTENSION';
      } else if (jenisMushaf === 'Mushaf Luar Negeri') {
        regType = 'FOREIGN_MANUSCRIPT';
        regCategory = 'FOREIGN_MANUSCRIPT';
      }

      // Tentukan service_type default jika cocok dengan data
      let matchedService = serviceTypes.find((s) => {
        if (regCategory === 'FOREIGN_MANUSCRIPT') return s.name.toLowerCase().includes('luar negeri');
        if (selectedJenisNaskah.includes('2. Digital')) return s.name.toLowerCase().includes('digital');
        if (selectedJenisNaskah.includes('2. Audio/Visual')) return s.name.toLowerCase().includes('audio');
        return s.status === 'ACTIVE';
      });

      const mushafDetails = {
        penanggung_jawab_produk: penanggungJawabProduk.trim(),
        sizes: sizes.filter((s) => s.ukuran.trim() || s.oplah),
        jenis_naskah: selectedJenisNaskah,
        jenis_mushaf: jenisMushaf,
        nama_percetakan: jenisMushaf === 'Mushaf Luar Negeri' ? '' : namaPercetakan.trim(),
        deskripsi_mushaf: deskripsiMushaf.trim(),
        materi_tambahan: selectedMateriTambahan,
        penanggung_jawab_materi_tambahan: penanggungJawabMateri.trim(),
        ...(jenisMushaf === 'Perpanjangan Tanda Tashih'
          ? {
              nomor_pendaftaran_lama: noPendaftaranLama.trim(),
              nomor_kode_ukuran_lama: nomorKodeUkuranLama.trim(),
              surat_pernyataan_file_id: uploadedPernyataanId,
            }
          : {}),
        ...(jenisMushaf === 'Mushaf Luar Negeri'
          ? {
              country_of_origin: negaraAsalMushaf,
              negara_asal_mushaf: negaraAsalMushaf,
              foreign_publisher_name: penerbitAsalMushaf.trim(),
              penerbit_asal_mushaf: penerbitAsalMushaf.trim(),
              foreign_tashih_institution: lembagaPentashihAsal.trim(),
              lembaga_pentashih_asal_mushaf: lembagaPentashihAsal.trim(),
              bukti_tashih_file_id: uploadedBuktiTashihId,
            }
          : {}),
      };

      const payload = {
        title: title.trim(),
        registration_type: regType,
        registration_category: regCategory,
        service_type_id: matchedService?.id || serviceTypes[0]?.id,
        statement_accepted: true,
        foreign_metadata: mushafDetails,
        mushaf_details: mushafDetails,
        cover_file_id: uploadedCoverId,
        surat_permohonan_file_id: uploadedPermohonanId,
        surat_pernyataan_perubahan_file_id: uploadedPernyataanId,
        apk_file_id: uploadedApkId,
        bukti_tashih_file_id: uploadedBuktiTashihId,
      };

      const res = await registrationApi.createDraft(payload);
      const created = res.data;

      setCreatedReceipt(created);

      if (isDirectSubmit) {
        setSuccessMsg(`Permohonan "${title}" (${created.registration_no}) berhasil dibuat.`);
        navigate(`/publisher/registrations/${created.id}`);
      } else {
        setSuccessMsg(`Draf permohonan (${created.registration_no}) berhasil disimpan.`);
        setShowReceiptDialog(true);
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan permohonan naskah.');
    } finally {
      setIsSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const isDigital = selectedJenisNaskah.includes('2. Digital');
  const isPerpanjangan = jenisMushaf === 'Perpanjangan Tanda Tashih';
  const isLuarNegeri = jenisMushaf === 'Mushaf Luar Negeri' || selectedJenisNaskah.includes("1. Mushaf Al-Qur'an Luar Negeri");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28 lg:pb-12 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
        <div>
          <Link
            to="/publisher"
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-brand-700 font-semibold mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dasbor
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Formulir Permohonan Naskah Mushaf Al-Qur'an
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Layanan Pentashihan Mushaf Al-Qur'an — Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kemenag RI
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting || loadingMaster}
            onClick={() => handleSave(false)}
            icon={<Save className="w-3.5 h-3.5 text-ink-muted" />}
            className="text-xs"
          >
            Simpan Draf
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSubmitting || loadingMaster}
            onClick={() => handleSave(true)}
            icon={<Send className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            {isSubmitting ? (uploadingFiles ? 'Mengunggah Berkas...' : 'Memproses...') : 'Lanjutkan ke Berkas'}
          </Button>
        </div>
      </div>

      {/* Notices */}
      {error && (
        <div role="alert" className="p-4 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Terjadi Kesalahan: </span>
            {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div role="status" className="p-4 rounded-xl bg-brand-50 border border-brand-100 text-brand-800 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-700" />
          <div>
            <span className="font-bold">Berhasil: </span>
            {successMsg}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BAGIAN I. INFORMASI DATA MUSHAF */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-1-title" className="bg-white rounded-2xl border border-line/90 shadow-xs p-6 space-y-5">
        <div className="border-b border-line pb-3">
          <h2 id="section-1-title" className="text-base font-bold text-ink flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-700" />
            <span>I. Informasi Data Mushaf</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Lengkapi data teknis dan identitas naskah mushaf yang diajukan pentashihan.
          </p>
        </div>

        {/* 1. Nama / Brand Mushaf */}
        <div className="space-y-1.5">
          <label htmlFor="registration-title" className="block text-xs font-bold text-ink">
            Nama Produk/Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700">
            Diisi dengan nama produk/mushaf al-qur'an yang akan didaftarkan pentashihan. Misal: Mushaf Al-Qur'an, Al-Qur'an dan Terjemahnya, Mushaf Alkabir, dll
          </p>
          <input
            type="text"
            id="registration-title"
            required
            minLength={3}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? 'registration-title-error' : undefined}
            placeholder="Contoh: Mushaf Al-Qur'an, Al-Qur'an dan Terjemahnya, Mushaf Alkabir"
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${titleError ? 'border-civic-danger' : 'border-line-strong'}`}
          />
          {titleError && <p id="registration-title-error" className="text-xs text-civic-danger">{titleError}</p>}
        </div>

        {/* 2. Nama Penanggung Jawab Produk/Mushaf */}
        <div className="space-y-1.5">
          <label htmlFor="registration-product-owner" className="block text-xs font-bold text-ink">
            Nama Penanggung Jawab Produk/Mushaf<span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700">
            Isi nama penanggung jawab Produk/Mushaf
          </p>
          <input
            type="text"
            id="registration-product-owner"
            required
            value={penanggungJawabProduk}
            onChange={(e) => {
              setPenanggungJawabProduk(e.target.value);
              if (penanggungJawabError) setPenanggungJawabError('');
            }}
            aria-invalid={Boolean(penanggungJawabError)}
            aria-describedby={penanggungJawabError ? 'registration-product-owner-error' : undefined}
            placeholder="Tulis nama penanggung jawab Produk/Mushaf"
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${penanggungJawabError ? 'border-civic-danger' : 'border-line-strong'}`}
          />
          {penanggungJawabError && <p id="registration-product-owner-error" className="text-xs text-civic-danger">{penanggungJawabError}</p>}
        </div>

        {/* 3. Ukuran (cm) dan Oplah (Dinamis Multi-row) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-ink">
                Ukuran (cm) & oplah <span className="text-civic-danger">*</span>
              </span>
              <p className="text-[11px] text-ink-muted">
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
                  <label className="block text-[11px] font-bold text-ink">
                    Ukuran (cm) {idx === 0 && <span className="text-civic-danger">*</span>}
                  </label>
                  <p className="text-[10px] text-brand-700 leading-tight">
                    Format: panjang x lebar (cm). Misal: 29,7 x 20 (tanpa cm)
                  </p>
                  <input
                    type="text"
                    value={row.ukuran}
                    onChange={(e) => handleSizeChange(idx, 'ukuran', e.target.value)}
                    placeholder="Tulis ukuran (cth: 29,7 x 20)"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-line-strong bg-white focus:outline-none focus:ring-1 focus:ring-brand-700"
                  />
                </div>
                <div className="sm:col-span-5 space-y-1">
                  <label className="block text-[11px] font-bold text-ink">
                    Oplah {idx === 0 && <span className="text-civic-danger">*</span>}
                  </label>
                  <p className="text-[10px] text-brand-700 leading-tight">
                    Rencana oplah cetak. Misal: 100000 eksemplar, 50000 eksemplar, dll
                  </p>
                  <input
                    type="number"
                    value={row.oplah}
                    onChange={(e) => handleSizeChange(idx, 'oplah', e.target.value)}
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
                      className="p-2 text-civic-danger hover:text-civic-danger hover:bg-civic-dangerSoft rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Jenis Naskah (Checklist 2 Kolom) */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-bold text-ink">
            Jenis Naskah <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700 leading-relaxed">
            Pilih jenis naskah yang sesuai dengan mushaf yang akan Anda terbitkan. Pilihan boleh lebih dari satu. Jika mushaf yang akan diterbitkan adalah mushaf digital, maka wajib mengunggah file apk
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 p-4 rounded-xl bg-canvas border border-line">
            {JENIS_NASKAH_OPTIONS.map((colItems, colIdx) => (
              <div key={colIdx} className="space-y-2">
                {colItems.map((item) => {
                  const isChecked = selectedJenisNaskah.includes(item);
                  return (
                    <label
                      key={item}
                      className="flex items-center gap-2.5 text-xs text-ink hover:text-ink cursor-pointer select-none py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleJenisNaskah(item)}
                        className="rounded border-line-strong text-brand-700 focus:ring-brand-700 w-4 h-4"
                      />
                      <span className={isChecked ? 'font-bold text-brand-950' : ''}>
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 5. Jenis Mushaf (Dropdown) */}
        <div className="space-y-1.5 pt-2">
          <label htmlFor="jenis-mushaf" className="block text-xs font-bold text-ink">
            Jenis Pendaftaran Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700">
            Pilih jenis mushaf yang sesuai dengan mushaf yang akan Anda terbitkan.
          </p>
          <select
            id="jenis-mushaf"
            aria-label="Jenis Mushaf"
            value={jenisMushaf}
            onChange={(e) => handleJenisMushafChange(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink font-semibold"
          >
            <option value="Mushaf Baru">Mushaf Baru</option>
            <option value="Perpanjangan Tanda Tashih">Perpanjangan Tanda Tashih</option>
            <option value="Mushaf Luar Negeri">Mushaf Luar Negeri</option>
          </select>
        </div>

        {/* 6. Nama Percetakan (Hanya untuk Mushaf Domestik / Baru / Perpanjangan) */}
        {!isLuarNegeri && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-ink">
              Nama Percetakan <span className="text-civic-danger">*</span>
            </label>
            <p className="text-[11px] text-brand-700">
              Diisi dengan nama percetakan tempat mushaf yang didaftarkan akan dicetak. Misal: Gramedia, Bekasi.
            </p>
            <input
              type="text"
              value={namaPercetakan}
              onChange={(e) => setNamaPercetakan(e.target.value)}
              placeholder="Tulis nama percetakan"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
            />
          </div>
        )}

        {/* 7. Deskripsi Mushaf */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink">
            Deskripsi Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700">
            Diisi dengan deskripsi mushaf yang didaftarkan.
          </p>
          <textarea
            rows={3}
            value={deskripsiMushaf}
            onChange={(e) => setDeskripsiMushaf(e.target.value)}
            placeholder="Tulis deskripsi mushaf"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
          />
        </div>

        {/* Blok Khusus: Jika Jenis Mushaf === 'Mushaf Luar Negeri' */}
        {isLuarNegeri && (
          <div className="space-y-4 pt-1">
            {/* Negara Asal Mushaf */}
            <div className="space-y-1.5">
              <label htmlFor="negara-asal-mushaf" className="block text-xs font-bold text-ink">
                Negara asal mushaf <span className="text-civic-danger">*</span>
              </label>
              <p className="text-[11px] text-brand-700">
                Pilih negara asal mushaf yang didaftarkan.
              </p>
              <select
                id="negara-asal-mushaf"
                aria-label="Negara asal mushaf"
                value={negaraAsalMushaf}
                onChange={(e) => setNegaraAsalMushaf(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink font-medium"
              >
                <option value="">Pilih negara asal mushaf</option>
                {NEGARA_ASAL_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* Penerbit Asal Mushaf */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Penerbit asal mushaf <span className="text-civic-danger">*</span>
              </label>
              <p className="text-[11px] text-brand-700">
                Diisi nama penerbit mushaf asal.
              </p>
              <input
                type="text"
                value={penerbitAsalMushaf}
                onChange={(e) => setPenerbitAsalMushaf(e.target.value)}
                placeholder="Tulis Nama penerbit asal Mushaf"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
              />
            </div>

            {/* Lembaga Pentashih Asal Mushaf */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Lembaga pentashih asal mushaf <span className="text-civic-danger">*</span>
              </label>
              <p className="text-[11px] text-brand-700">
                Diisi nama lembaga pentashih mushaf asal.
              </p>
              <input
                type="text"
                value={lembagaPentashihAsal}
                onChange={(e) => setLembagaPentashihAsal(e.target.value)}
                placeholder="Tulis Nama lembaga pentashih asal Mushaf"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
              />
            </div>

            {/* Bukti Tashih Lembaga Pentashih Asal Mushaf */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Bukti tashih Lembaga pentashih asal mushaf <span className="text-civic-danger">*</span>
              </label>
              <p className="text-[11px] text-brand-700">
                Unggah tanda tashih dari lembaga pentashih mushaf asal dengan format file pdf. Ukuran maksimal 500 kb.
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setBuktiTashihFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-700 file:text-white hover:file:bg-brand-800 cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
              />
            </div>
          </div>
        )}

        {/* Blok Khusus: Jika Jenis Mushaf === 'Perpanjangan Tanda Tashih' */}
        {isPerpanjangan && (
          <div className="p-4 rounded-xl bg-civic-warningSoft/70 border border-civic-warningLine space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-civic-warning flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-civic-warning" />
              <span>Data Riwayat Perpanjangan STT</span>
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                No. Pendaftaran mushaf lama <span className="text-civic-danger">*</span>
              </label>
              <p className="text-[11px] text-brand-700">
                Pilih No. pendaftaran mushaf lama yang ingin diperpanjang tanda tashihnya.
              </p>
              <input
                type="text"
                value={noPendaftaranLama}
                onChange={(e) => setNoPendaftaranLama(e.target.value)}
                placeholder="Tulis nomor pendaftaran mushaf lama"
                className="w-full text-xs px-3.5 py-2 rounded-lg border border-line-strong bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Nomor, kode dan ukuran tanda tashih mushaf lama <span className="text-civic-danger">*</span>
              </label>
              <p className="text-[11px] text-brand-700">
                Pilih Nomor, kode dan ukuran tanda tashih mushaf lama yang ingin diperpanjang tanda tashihnya.
              </p>
              <input
                type="text"
                value={nomorKodeUkuranLama}
                onChange={(e) => setNomorKodeUkuranLama(e.target.value)}
                placeholder="Contoh: 123/LPMQ.01/TL.02/2021, A4 (21 x 29.7 cm)"
                className="w-full text-xs px-3.5 py-2 rounded-lg border border-line-strong bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Surat Pernyataan tidak ada perubahan pada master naskah <span className="text-civic-danger">*</span>
              </label>
              <p className="text-[11px] text-brand-700">
                Upload Surat Pernyataan tidak ada perubahan pada master naskah dengan format file pdf. Ukuran maksimal 500 kb.
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setSuratPernyataanFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-ink-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-700 file:text-white hover:file:bg-brand-800 cursor-pointer"
              />
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* BAGIAN II. INFORMASI DATA MATERI TAMBAHAN PADA MUSHAF */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-2-title" className="bg-white rounded-2xl border border-line/90 shadow-xs p-6 space-y-5">
        <div className="border-b border-line pb-3">
          <h2 id="section-2-title" className="text-base font-bold text-ink flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-700" />
            <span>II. Informasi Data Materi Tambahan pada Mushaf</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Isikan data materi tambahan pada mushaf yang Anda daftarkan.
          </p>
        </div>

        {/* Checklist Materi Tambahan */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink">
            Materi tambahan pada mushaf
          </label>
          <p className="text-[11px] text-brand-700">
            Pilih materi tambahan yang terdapat pada mushaf yang akan Anda terbitkan. Pilihan boleh lebih dari satu.
          </p>

          <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-canvas border border-line">
            {MATERI_TAMBAHAN_OPTIONS.map((item) => {
              const isChecked = selectedMateriTambahan.includes(item);
              return (
                <label
                  key={item}
                  className="flex items-center gap-2 text-xs text-ink hover:text-ink cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMateriTambahan(item)}
                    className="rounded border-line-strong text-brand-700 focus:ring-brand-700 w-4 h-4"
                  />
                  <span className={isChecked ? 'font-bold text-brand-950' : ''}>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Penanggung Jawab Materi Tambahan */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink">
            Penanggung Jawab Materi Tambahan
          </label>
          <p className="text-[11px] text-brand-700">
            Isi penanggung jawab materi tambahan
          </p>
          <textarea
            rows={3}
            value={penanggungJawabMateri}
            onChange={(e) => setPenanggungJawabMateri(e.target.value)}
            placeholder="Tulis nama penanggung jawab materi tambahan. Dapat diisi lebih dari 1 orang, dan dipisahkan oleh tanda koma. misal: Andi Fulan, Ilham Fulan, Ridwan Fulan"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BAGIAN III. INFORMASI DOKUMEN MUSHAF */}
      {/* ========================================================================= */}
      <section aria-labelledby="section-3-title" className="bg-white rounded-2xl border border-line/90 shadow-xs p-6 space-y-5">
        <div className="border-b border-line pb-3">
          <h2 id="section-3-title" className="text-base font-bold text-ink flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-700" />
            <span>III. Informasi Dokumen Mushaf</span>
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Unggah dokumen mushaf pendukung permohonan.
          </p>
        </div>

        {/* 1. Surat Permohonan */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink">
            Surat permohonan tanda tashih <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-ink-muted">
            Unggah surat permohonan penerbitan / perpanjangan tanda tashih dengan format file PDF.
          </p>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setSuratPermohonanFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
          />
        </div>

        {/* 2. Gambar Cover */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink">
            Gambar Cover <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-ink-muted">
            Unggah gambar cover/sampul mushaf (JPG, PNG, atau PDF).
          </p>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
          />
        </div>

        {/* 3. File APK jika Digital */}
        {isDigital && (
          <div className="space-y-1.5 p-4 rounded-xl bg-civic-infoSoft border border-civic-infoLine">
            <label className="block text-xs font-bold text-civic-info">
              File Aplikasi Mushaf Digital (.apk) <span className="text-civic-danger">*</span>
            </label>
            <p className="text-[11px] text-civic-info">
              Karena Anda memilih jenis naskah "2. Digital", maka wajib mengunggah file installer aplikasi Android (.apk).
            </p>
            <input
              type="file"
              accept=".apk"
              onChange={(e) => setApkFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-civic-info file:text-white hover:file:bg-civic-info cursor-pointer p-1 rounded-xl border border-civic-infoLine bg-white"
            />
          </div>
        )}
      </section>

      {/* Sticky Bottom Actions */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-line/90 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-ink-muted">
          Pastikan semua data bertanda bintang (<span className="text-civic-danger font-bold">*</span>) telah terisi dengan benar sebelum mengirim.
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isSubmitting || loadingMaster}
            onClick={() => handleSave(false)}
            icon={<Save className="w-4 h-4 text-ink-muted" />}
            className="text-xs w-full sm:w-auto"
          >
            Simpan Draf
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isSubmitting || loadingMaster}
            onClick={() => handleSave(true)}
            icon={<Send className="w-4 h-4" />}
            className="text-xs font-bold w-full sm:w-auto"
          >
            {isSubmitting ? (uploadingFiles ? 'Mengunggah Berkas...' : 'Memproses...') : 'Lanjutkan ke Berkas'}
          </Button>
        </div>
      </div>

      {/* Dialog Bukti Pendaftaran */}
      {showReceiptDialog && createdReceipt && (
        <RegistrationReceiptDialog
          key={createdReceipt.id}
          registration={createdReceipt}
          onClose={() => {
            setShowReceiptDialog(false);
            navigate(`/publisher/registrations/${createdReceipt.id}`);
          }}
        />
      )}
    </div>
  );
};

export default NewRegistrationPage;
