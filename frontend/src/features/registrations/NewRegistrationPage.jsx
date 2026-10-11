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
  Download,
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

const JENIS_STANDAR_MUSHAF_OPTIONS = [
  'Mushaf Standar Usmani',
  'Mushaf Standar Bahriyah (Bahria/Pojok)',
  'Mushaf Standar Braille',
  "Mushaf Al-Qur'an Isyarat",
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
  const [namaMushaf, setNamaMushaf] = useState('');
  const [namaPercetakan, setNamaPercetakan] = useState('');
  const [penanggungJawabProduk, setPenanggungJawabProduk] = useState('');
  const [penanggungJawabWa, setPenanggungJawabWa] = useState('');
  const [penanggungJawabEmail, setPenanggungJawabEmail] = useState('');
  const [sizes, setSizes] = useState([{ ukuran: '', oplah: '' }]);
  const [selectedJenisNaskah, setSelectedJenisNaskah] = useState(["1. Al-Qur'an 30 Juz"]);
  const [jenisStandarMushaf, setJenisStandarMushaf] = useState('Mushaf Standar Usmani');
  const [kategoriPendaftaran, setKategoriPendaftaran] = useState('Mushaf Baru'); // 'Mushaf Baru' | 'Perpanjangan Tanda Tashih' | 'Mushaf Luar Negeri'
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
  const [contohHalamanFile, setContohHalamanFile] = useState(null);
  const [contohHalamanFileId, setContohHalamanFileId] = useState(null);
  const [apkFile, setApkFile] = useState(null);
  const [apkFileId, setApkFileId] = useState(null);

  // Status & State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState('');
  const [namaMushafError, setNamaMushafError] = useState('');
  const [penanggungJawabError, setPenanggungJawabError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
          setKategoriPendaftaran('Mushaf Luar Negeri');
        } else if (kategoriPendaftaran === 'Mushaf Luar Negeri') {
          setKategoriPendaftaran('Mushaf Baru');
        }
      }
      return next;
    });
  };

  // Change Kategori Pendaftaran Dropdown
  const handleKategoriPendaftaranChange = (val) => {
    setKategoriPendaftaran(val);
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

  // Validasi dan Buka Modal Konfirmasi Pengiriman (REV-07)
  const handleInitiateSubmit = () => {
    setError('');
    setNamaMushafError('');
    setPenanggungJawabError('');

    if (namaMushaf.trim().length < 3) {
      setNamaMushafError('Nama mushaf minimal 3 karakter.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!penanggungJawabProduk.trim()) {
      setPenanggungJawabError('Nama penanggung jawab produk/mushaf wajib diisi.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sizes.some((s) => s.ukuran.trim() && !s.oplah)) {
      setError('Jika ukuran diisi, rencana oplah juga wajib diisi.');
      return;
    }

    if (kategoriPendaftaran === 'Mushaf Luar Negeri') {
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
      if (!buktiTashihFile && !buktiTashihFileId) {
        setError('Unggah bukti tanda tashih dari lembaga pentashih asal mushaf.');
        return;
      }
    }

    if (kategoriPendaftaran === 'Perpanjangan Tanda Tashih') {
      if (!noPendaftaranLama.trim()) {
        setError('Nomor pendaftaran mushaf lama wajib diisi.');
        return;
      }
      if (!suratPernyataanFile && !suratPernyataanFileId) {
        setError('Surat pernyataan tidak ada perubahan pada master naskah wajib diunggah.');
        return;
      }
    }

    if (isDigital && !apkFile && !apkFileId) {
      setError('File aplikasi mushaf digital (.apk) wajib diunggah.');
      return;
    }

    if (!suratPermohonanFile && !suratPermohonanFileId) {
      setError('Surat permohonan tanda tashih (PDF) wajib diunggah sebelum mengirim.');
      return;
    }

    if (!coverFile && !coverFileId) {
      setError('Gambar cover/sampul mushaf wajib diunggah sebelum mengirim.');
      return;
    }

    if (!contohHalamanFile && !contohHalamanFileId) {
      setError('Contoh halaman mushaf (Halaman 1–3) (PDF) wajib diunggah sebelum mengirim.');
      return;
    }

    setShowConfirmModal(true);
  };

  // Submit / Save Draft
  const executeSubmit = async (isDirectSubmit = false) => {
    setShowConfirmModal(false);
    setError('');
    setNamaMushafError('');
    setPenanggungJawabError('');
    setSuccessMsg('');

    if (namaMushaf.trim().length < 3) {
      setNamaMushafError('Nama mushaf minimal 3 karakter.');
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

      let uploadedContohHalamanId = contohHalamanFileId;
      if (contohHalamanFile && !uploadedContohHalamanId) {
        uploadedContohHalamanId = await uploadSingleFile(contohHalamanFile);
        setContohHalamanFileId(uploadedContohHalamanId);
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
      if (kategoriPendaftaran === 'Perpanjangan Tanda Tashih') {
        regType = 'EXTENSION';
        regCategory = 'EXTENSION';
      } else if (kategoriPendaftaran === 'Mushaf Luar Negeri') {
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
        nama_produk: namaMushaf.trim(),
        nama_mushaf: namaMushaf.trim(),
        penanggung_jawab_produk: penanggungJawabProduk.trim(),
        penanggung_jawab_wa: penanggungJawabWa.trim(),
        penanggung_jawab_email: penanggungJawabEmail.trim(),
        sizes: sizes.filter((s) => s.ukuran.trim() || s.oplah),
        jenis_naskah: selectedJenisNaskah,
        jenis_mushaf: jenisStandarMushaf, // 4 Standar LPMQ
        kategori_pendaftaran: kategoriPendaftaran,
        nama_percetakan: kategoriPendaftaran === 'Mushaf Luar Negeri' ? '' : namaPercetakan.trim(),
        deskripsi_mushaf: deskripsiMushaf.trim(),
        materi_tambahan: selectedMateriTambahan,
        penanggung_jawab_materi_tambahan: penanggungJawabMateri.trim(),
        ...(kategoriPendaftaran === 'Perpanjangan Tanda Tashih'
          ? {
              nomor_pendaftaran_lama: noPendaftaranLama.trim(),
              nomor_kode_ukuran_lama: nomorKodeUkuranLama.trim(),
              surat_pernyataan_file_id: uploadedPernyataanId,
            }
          : {}),
        ...(kategoriPendaftaran === 'Mushaf Luar Negeri'
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
        title: namaMushaf.trim(),
        registration_type: regType,
        registration_category: regCategory,
        service_type_id: matchedService?.id || serviceTypes[0]?.id,
        statement_accepted: true,
        foreign_metadata: mushafDetails,
        mushaf_details: mushafDetails,
        cover_file_id: uploadedCoverId,
        surat_permohonan_file_id: uploadedPermohonanId,
        contoh_halaman_file_id: uploadedContohHalamanId,
        surat_pernyataan_perubahan_file_id: uploadedPernyataanId,
        apk_file_id: uploadedApkId,
        bukti_tashih_file_id: uploadedBuktiTashihId,
      };

      const res = await registrationApi.createDraft(payload);
      const created = res.data;

      // Lampirkan manuscript file Cover dan Sample Page
      if (uploadedCoverId) {
        try {
          await registrationApi.addManuscript(created.id, { type: 'COVER', file_id: uploadedCoverId });
        } catch {}
      }
      if (uploadedContohHalamanId) {
        try {
          await registrationApi.addManuscript(created.id, { type: 'SAMPLE_PAGE_1_5', file_id: uploadedContohHalamanId });
        } catch {}
      }

      setCreatedReceipt(created);

      if (isDirectSubmit) {
        // Langsung ajukan ke verifikasi LPMQ (One-step submission: tidak perlu kirim dua kali)
        await registrationApi.submitRegistration(created.id);
        setSuccessMsg(`Permohonan "${namaMushaf}" (${created.registration_no}) berhasil dikirim ke LPMQ.`);
        navigate(`/publisher/registrations/${created.id}`, { state: { showReceipt: true } });
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
  const isPerpanjangan = kategoriPendaftaran === 'Perpanjangan Tanda Tashih';
  const isLuarNegeri = kategoriPendaftaran === 'Mushaf Luar Negeri' || selectedJenisNaskah.includes("1. Mushaf Al-Qur'an Luar Negeri");

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
            Formulir Permohonan Surat Tanda Tashih
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Layanan Surat Tanda Tashih — Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) Kemenag RI
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting || loadingMaster}
            onClick={() => executeSubmit(false)}
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
            onClick={handleInitiateSubmit}
            icon={<Send className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            {isSubmitting ? (uploadingFiles ? 'Mengunggah Berkas...' : 'Memproses...') : 'Kirim Permohonan'}
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

        {/* 1. Kategori Pendaftaran (Mushaf Baru | Perpanjangan Tanda Tashih | Mushaf Luar Negeri) - Paling atas sesuai REV-05 */}
        <div className="space-y-1.5">
          <label htmlFor="kategori-pendaftaran" className="block text-xs font-bold text-ink">
            Kategori Pendaftaran Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700">
            Pilih kategori pendaftaran (Permohonan Baru, Perpanjangan Tanda Tashih, atau Mushaf Luar Negeri).
          </p>
          <select
            id="kategori-pendaftaran"
            aria-label="Kategori Pendaftaran Mushaf"
            value={kategoriPendaftaran}
            onChange={(e) => handleKategoriPendaftaranChange(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink font-semibold"
          >
            <option value="Mushaf Baru">Mushaf Baru</option>
            <option value="Perpanjangan Tanda Tashih">Perpanjangan Tanda Tashih</option>
            <option value="Mushaf Luar Negeri">Mushaf Luar Negeri</option>
          </select>
        </div>

        {/* 2. Nama Mushaf (REV-06: Nama Produk/Mushaf dihapus, hanya gunakan Nama Mushaf) */}
        <div className="space-y-1.5">
          <label htmlFor="registration-nama-mushaf" className="block text-xs font-bold text-ink">
            Nama Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700">
            Tulis nama spesifik naskah mushaf Al-Qur'an (misal: Mushaf Al-Qur'an, Mushaf Al-Bayan, Mushaf At-Taqwa, Mushaf Al-Hufaz, dll)
          </p>
          <input
            type="text"
            id="registration-nama-mushaf"
            required
            minLength={3}
            value={namaMushaf}
            onChange={(e) => {
              setNamaMushaf(e.target.value);
              if (namaMushafError) setNamaMushafError('');
            }}
            aria-invalid={Boolean(namaMushafError)}
            aria-describedby={namaMushafError ? 'registration-nama-mushaf-error' : undefined}
            placeholder="Contoh: Mushaf Al-Qur'an, Mushaf Al-Bayan, Mushaf At-Taqwa"
            className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white ${namaMushafError ? 'border-civic-danger' : 'border-line-strong'}`}
          />
          {namaMushafError && <p id="registration-nama-mushaf-error" className="text-xs text-civic-danger">{namaMushafError}</p>}
        </div>

        {/* 3. Nama Percetakan (DIGESER KE ATAS) */}
        {!isLuarNegeri && (
          <div className="space-y-1.5">
            <label htmlFor="nama-percetakan" className="block text-xs font-bold text-ink">
              Nama Percetakan
            </label>
            <p className="text-[11px] text-brand-700">
              Diisi dengan nama percetakan tempat mushaf yang didaftarkan akan dicetak. Misal: Gramedia, Bekasi.
            </p>
            <input
              type="text"
              id="nama-percetakan"
              value={namaPercetakan}
              onChange={(e) => setNamaPercetakan(e.target.value)}
              placeholder="Tulis nama percetakan"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
            />
          </div>
        )}

        {/* 4. Nama Penanggung Jawab Produk/Mushaf */}
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

        {/* Nomor WhatsApp Penanggung Jawab */}
        <div className="space-y-1.5">
          <label htmlFor="registration-pj-wa" className="block text-xs font-bold text-ink">
            Nomor WhatsApp Penanggung Jawab
          </label>
          <p className="text-[11px] text-brand-700">
            Nomor WhatsApp aktif penanggung jawab untuk notifikasi otomatis perkembangan status tanda tashih via WhatsApp (cth: +6281234567890 / 081234567890).
          </p>
          <input
            type="tel"
            id="registration-pj-wa"
            value={penanggungJawabWa}
            onChange={(e) => setPenanggungJawabWa(e.target.value)}
            placeholder="Tulis nomor WhatsApp (cth: +6281234567890)"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
          />
        </div>

        {/* Email Penanggung Jawab */}
        <div className="space-y-1.5">
          <label htmlFor="registration-pj-email" className="block text-xs font-bold text-ink">
            Email Penanggung Jawab
          </label>
          <p className="text-[11px] text-brand-700">
            Alamat email aktif penanggung jawab untuk pengiriman tanda terima resmi permohonan dan surat hasil verifikasi LPMQ.
          </p>
          <input
            type="email"
            id="registration-pj-email"
            value={penanggungJawabEmail}
            onChange={(e) => setPenanggungJawabEmail(e.target.value)}
            placeholder="Tulis email penanggung jawab (cth: pj.mushaf@penerbit.com)"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink bg-white"
          />
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

        {/* Jenis Mushaf (POSISI DI BAWAH JENIS NASKAH: 4 STANDAR LPMQ KEMENAG RI) */}
        <div className="space-y-1.5 pt-2">
          <label htmlFor="jenis-standar-mushaf" className="block text-xs font-bold text-ink">
            Jenis Mushaf <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-brand-700">
            Pilih jenis standar mushaf Al-Qur'an (4 Standar LPMQ Kemenag RI).
          </p>
          <select
            id="jenis-standar-mushaf"
            aria-label="Jenis Mushaf"
            value={jenisStandarMushaf}
            onChange={(e) => setJenisStandarMushaf(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all text-ink font-semibold"
          >
            {JENIS_STANDAR_MUSHAF_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>


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

        {/* 1. Surat Permohonan (RF-PBL-01) */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="block text-xs font-bold text-ink">
              Surat permohonan tanda tashih <span className="text-civic-danger">*</span>
            </label>
            <a
              href="/templates/template-surat-permohonan-tashih.docx"
              download="Template-Surat-Permohonan-Tashih-LPMQ.docx"
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-brand-700" />
              Unduh Template Surat Permohonan (.docx)
            </a>
          </div>
          <p className="text-[11px] text-ink-muted">
            Unggah surat permohonan penerbitan / perpanjangan tanda tashih bertanda tangan dan berkop penerbit (format file PDF).
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

        {/* 3. Contoh Halaman Mushaf (Halaman 1–3) (PDF) - REV-10 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink">
            Contoh Halaman Mushaf (Halaman 1–3) (PDF) <span className="text-civic-danger">*</span>
          </label>
          <p className="text-[11px] text-ink-muted">
            Unggah contoh halaman 1–3 naskah mushaf yang diajukan pentashihan dengan format file PDF (maksimal 10 MB).
          </p>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setContohHalamanFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-ink-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-subtle file:text-ink hover:file:bg-surface-strong cursor-pointer p-1 rounded-xl border border-line-strong bg-white"
          />
        </div>

        {/* 4. File APK jika Digital */}
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
        <div className="text-xs text-ink font-medium max-w-xl">
          Pastikan semua data bertanda bintang (<span className="text-civic-danger font-bold">*</span>) telah diisi dan dipastikan benar sebelum mengirim. Data yang sudah dikirim tidak dapat diubah.
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isSubmitting || loadingMaster}
            onClick={() => executeSubmit(false)}
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
            onClick={handleInitiateSubmit}
            icon={<Send className="w-4 h-4" />}
            className="text-xs font-bold w-full sm:w-auto"
          >
            {isSubmitting ? (uploadingFiles ? 'Mengunggah Berkas...' : 'Memproses...') : 'Kirim Permohonan'}
          </Button>
        </div>
      </div>

      {/* Modal Konfirmasi Sebelum Kirim Permohonan (REV-07) */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
        >
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-line overflow-hidden space-y-4 p-5 sm:p-6 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <h3 id="confirm-modal-title" className="text-base font-bold text-ink">
                  Konfirmasi Pengiriman Permohonan STT
                </h3>
                <p className="text-xs text-ink-muted">
                  Layanan Surat Tanda Tashih — LPMQ Kemenag RI
                </p>
              </div>
            </div>

            {/* Peringatan Notulasi REV-07 */}
            <div className="p-3.5 rounded-xl bg-civic-warningSoft border border-civic-warningLine text-xs text-civic-warning font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-civic-warning" />
              <span>
                Pastikan semua data bertanda bintang (*) telah diisi dan dipastikan benar sebelum mengirim. Data yang sudah dikirim tidak dapat diubah.
              </span>
            </div>

            {/* Ringkasan Isian */}
            <div className="bg-canvas rounded-xl border border-line p-3.5 text-xs space-y-2 text-ink">
              <div className="grid grid-cols-3 gap-1">
                <span className="text-ink-muted">Kategori:</span>
                <span className="col-span-2 font-bold text-brand-900">{kategoriPendaftaran}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-ink-muted">Nama Mushaf:</span>
                <span className="col-span-2 font-bold text-ink">{namaMushaf}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-ink-muted">Standar Mushaf:</span>
                <span className="col-span-2 font-medium">{jenisStandarMushaf}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-ink-muted">Penanggung Jawab:</span>
                <span className="col-span-2 font-medium">
                  {penanggungJawabProduk} {penanggungJawabWa ? `(${penanggungJawabWa})` : ''}
                </span>
              </div>
              <div className="pt-2 border-t border-line text-[11px] text-ink-muted space-y-1">
                <p className="font-bold text-ink text-xs">Berkas Digital Terlampir:</p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  Surat Permohonan: <span className="font-medium text-ink">{suratPermohonanFile?.name || 'File dipilih'}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  Cover Mushaf: <span className="font-medium text-ink">{coverFile?.name || 'File dipilih'}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  Contoh Halaman (1–3): <span className="font-medium text-ink">{contohHalamanFile?.name || 'File dipilih'}</span>
                </p>
                {isDigital && apkFile && (
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                    File APK: <span className="font-medium text-ink">{apkFile.name}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-line">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="text-xs w-full sm:w-auto font-semibold"
              >
                Periksa Kembali
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => executeSubmit(true)}
                icon={<Send className="w-3.5 h-3.5" />}
                className="text-xs font-bold w-full sm:w-auto"
              >
                {isSubmitting ? 'Mengirim...' : 'Ya, Kirim Permohonan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Bukti Pendaftaran */}
      {showReceiptDialog && createdReceipt && (
        <RegistrationReceiptDialog
          key={createdReceipt.id}
          isOpen={true}
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
