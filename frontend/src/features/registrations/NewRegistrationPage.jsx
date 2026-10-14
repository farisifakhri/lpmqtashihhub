import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';
import { fileApi } from '@/api/file.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { RegistrationReceiptDialog } from './RegistrationReceiptDialog';
import {
  RegistrationStepper,
  REGISTRATION_STEPS,
} from './steps/RegistrationStepper';
import { Step1MushafData } from './steps/Step1MushafData';
import { Step2JenisMateri } from './steps/Step2JenisMateri';
import { Step3Berkas } from './steps/Step3Berkas';
import { Step4ReviewSubmit } from './steps/Step4ReviewSubmit';
import {
  validateWhatsApp,
  validateEmail,
  normalizeWhatsApp,
} from './steps/registration-validation';
import {
  BookOpen,
  Send,
  Save,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

// AUTOSAVE_KEY is computed per-user inside the component to prevent cross-user data leaks
const AUTOSAVE_KEY_PREFIX = 'lpmq_registration_autosave_v2';

export const resolveMatchedServiceAndAddons = ({
  kategoriPendaftaran = 'Mushaf Baru',
  selectedJenisNaskah = [],
  jenisStandarMushaf = '',
  selectedMateriTambahan = [],
  serviceTypes = [],
  addons = [],
}) => {
  const activeServices = Array.isArray(serviceTypes)
    ? serviceTypes.filter((s) => s.status === 'ACTIVE' || !s.status)
    : [];
  const activeAddons = Array.isArray(addons)
    ? addons.filter((a) => a.status === 'ACTIVE' || !a.status)
    : [];

  const findByName = (keyword) =>
    activeServices.find((s) => s.name?.toLowerCase().includes(keyword.toLowerCase()));

  let matchedService = null;
  const isLuarNegeri =
    kategoriPendaftaran === 'Mushaf Luar Negeri' ||
    selectedJenisNaskah.includes("1. Mushaf Al-Qur'an Luar Negeri");
  const isAudioVisual = selectedJenisNaskah.includes('2. Audio/Visual');
  const isDigital = selectedJenisNaskah.includes('2. Digital');
  const isBraille =
    jenisStandarMushaf === 'Mushaf Standar Braille' ||
    selectedJenisNaskah.some((j) => j.toLowerCase().includes('braille'));
  const isIsyarat =
    jenisStandarMushaf === "Mushaf Al-Qur'an Isyarat" ||
    jenisStandarMushaf === 'Mushaf Standar Isyarat' ||
    selectedJenisNaskah.some((j) => j.toLowerCase().includes('isyarat'));
  const isTafsir = selectedJenisNaskah.includes('3. Tafsir');
  const isTerjemah = selectedJenisNaskah.includes('3. Terjemah');
  const isTransliterasi = selectedJenisNaskah.includes('3. Transliterasi');
  const isTajwidWarna = selectedJenisNaskah.includes('3. Tajwid Warna');
  const isJuzAmma = selectedJenisNaskah.includes("1. Juz 'Amma");
  const isJuzPilihan = selectedJenisNaskah.includes('1. Juz-juz pilihan');
  const isSurahYasin = selectedJenisNaskah.includes('1. Surah Yasin dan Bacaan Tahlil');
  const isMajmuSyarif = selectedJenisNaskah.includes("1. Majmu' Syarif/ Surah-surah pilihan");
  const isMetodeBaca = selectedJenisNaskah.includes("1. Metode Baca Tulis Al-Qur'an");
  const isKaligrafi = selectedJenisNaskah.includes('1. Kaligrafi');

  if (isLuarNegeri) {
    matchedService =
      findByName('Luar Negeri') ||
      findByName('LN') ||
      activeServices[activeServices.length - 1];
  } else if (isAudioVisual) {
    matchedService = findByName('Audio') || findByName('Rekaman');
  } else if (isDigital) {
    matchedService = findByName('Digital') || findByName('Elektronik');
  } else if (isBraille) {
    matchedService = findByName('Braille');
  } else if (isIsyarat) {
    matchedService = findByName('Isyarat');
  } else if (isTafsir) {
    matchedService = findByName('Tafsir');
  } else if (isTerjemah) {
    matchedService = findByName('Terjemah');
  } else if (isTransliterasi) {
    matchedService = findByName('Transliterasi');
  } else if (isTajwidWarna) {
    matchedService = findByName('Tajwid');
  } else if (isMajmuSyarif) {
    matchedService = findByName("Majmu'") || findByName('Syarif');
  } else if (isSurahYasin) {
    matchedService = findByName('Yasin') || findByName('Tahlil');
  } else if (isJuzAmma) {
    matchedService = findByName("'Amma") || findByName('Amma');
  } else if (isJuzPilihan) {
    matchedService = findByName('Pilihan');
  } else if (isMetodeBaca) {
    matchedService = findByName('Metode') || findByName('Baca Tulis');
  } else if (isKaligrafi) {
    matchedService = findByName('Kaligrafi');
  } else {
    matchedService =
      findByName('30 Juz') ||
      findByName('Cetak Standar') ||
      findByName('Reguler') ||
      activeServices[0];
  }

  if (!matchedService && activeServices.length > 0) {
    matchedService = activeServices[0];
  }

  const hasGroup3 = selectedJenisNaskah.some((j) => j.startsWith('3.'));
  const hasMateriTambahan = selectedMateriTambahan.length > 0;

  const matchedAddons = [];
  if (hasGroup3 && hasMateriTambahan) {
    const materiAddon =
      activeAddons.find(
        (a) =>
          a.code === 'ADD-MATERI' ||
          a.name?.toLowerCase().includes('materi') ||
          a.name?.toLowerCase().includes('suplemen')
      ) || activeAddons[0];
    if (materiAddon && !matchedAddons.some((a) => a.id === materiAddon.id)) {
      matchedAddons.push(materiAddon);
    }
  }

  const baseTarif = Number(matchedService?.base_fee || 0);
  const addonsTarif = matchedAddons.reduce((acc, curr) => acc + Number(curr.fee || 0), 0);
  const totalTarif = baseTarif + addonsTarif;

  const estimasiSlaHari =
    Number(matchedService?.duration_initial || 15) +
    (matchedAddons.length > 0 ? 3 : 0);

  return {
    matchedService,
    matchedAddons,
    baseTarif,
    addonsTarif,
    totalTarif,
    estimasiSlaHari,
    isLuarNegeri,
    isDigital,
    isAudioVisual,
  };
};

export const NewRegistrationPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const AUTOSAVE_KEY = `${AUTOSAVE_KEY_PREFIX}_${currentUser?.id || 'guest'}`;

  // Navigation Steps
  const [currentStep, setCurrentStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);

  // Master Data
  const [categories, setCategories] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(false);

  // Step 1: Identitas & Data Mushaf
  const [kategoriPendaftaran, setKategoriPendaftaran] = useState('Mushaf Baru');
  const [namaMushaf, setNamaMushaf] = useState('');
  const [namaPercetakan, setNamaPercetakan] = useState('');
  const [penanggungJawabProduk, setPenanggungJawabProduk] = useState('');
  const [penanggungJawabWa, setPenanggungJawabWa] = useState('');
  const [penanggungJawabEmail, setPenanggungJawabEmail] = useState('');
  const [sizes, setSizes] = useState([{ ukuran: '', oplah: '' }]);
  const [jenisStandarMushaf, setJenisStandarMushaf] = useState('Mushaf Standar Usmani');
  const [deskripsiMushaf, setDeskripsiMushaf] = useState('');

  // Perpanjangan fields
  const [noPendaftaranLama, setNoPendaftaranLama] = useState('');
  const [nomorKodeUkuranLama, setNomorKodeUkuranLama] = useState('');
  const [selectedPreviousRegId, setSelectedPreviousRegId] = useState('');
  const [previousRegistrations, setPreviousRegistrations] = useState([]);
  const [loadingPrevRegs, setLoadingPrevRegs] = useState(false);

  // Luar Negeri fields
  const [negaraAsalMushaf, setNegaraAsalMushaf] = useState('');
  const [penerbitAsalMushaf, setPenerbitAsalMushaf] = useState('');
  const [lembagaPentashihAsal, setLembagaPentashihAsal] = useState('');

  // Step 2: Jenis Naskah & Materi Tambahan
  const [selectedJenisNaskah, setSelectedJenisNaskah] = useState(["1. Al-Qur'an 30 Juz"]);
  const [selectedMateriTambahan, setSelectedMateriTambahan] = useState([]);
  const [penanggungJawabMateri, setPenanggungJawabMateri] = useState('');

  // Step 3: Berkas Persyaratan
  const [suratPermohonanFile, setSuratPermohonanFile] = useState(null);
  const [suratPermohonanFileId, setSuratPermohonanFileId] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverFileId, setCoverFileId] = useState(null);
  const [contohHalamanFile, setContohHalamanFile] = useState(null);
  const [contohHalamanFileId, setContohHalamanFileId] = useState(null);
  const [apkFile, setApkFile] = useState(null);
  const [apkFileId, setApkFileId] = useState(null);
  const [apkUrl, setApkUrl] = useState('');
  const [suratPernyataanFile, setSuratPernyataanFile] = useState(null);
  const [suratPernyataanFileId, setSuratPernyataanFileId] = useState(null);
  const [buktiTashihFile, setBuktiTashihFile] = useState(null);
  const [buktiTashihFileId, setBuktiTashihFileId] = useState(null);

  // Validation & Feedback States
  const [fieldErrors, setFieldErrors] = useState({});
  const [namaMushafError, setNamaMushafError] = useState('');
  const [penanggungJawabError, setPenanggungJawabError] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Autosave notification state
  const [hasAutosaveDraft, setHasAutosaveDraft] = useState(false);
  const isDirtyRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Helper to clear a field error
  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    if (fieldName === 'namaMushaf') setNamaMushafError('');
    if (fieldName === 'penanggungJawabProduk') setPenanggungJawabError('');
  }, []);

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

  // Check sessionStorage for autosaved draft on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(AUTOSAVE_KEY) || sessionStorage.getItem('lpmq_registration_autosave_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.namaMushaf || parsed?.penanggungJawabProduk) {
          setHasAutosaveDraft(true);
        }
      }
    } catch {}
  }, [AUTOSAVE_KEY]);

  // Restore autosaved draft
  const handleRestoreAutosave = () => {
    try {
      const raw = sessionStorage.getItem(AUTOSAVE_KEY) || sessionStorage.getItem('lpmq_registration_autosave_v1');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.namaMushaf) setNamaMushaf(data.namaMushaf);
      if (data.namaPercetakan) setNamaPercetakan(data.namaPercetakan);
      if (data.penanggungJawabProduk) setPenanggungJawabProduk(data.penanggungJawabProduk);
      if (data.penanggungJawabWa) setPenanggungJawabWa(data.penanggungJawabWa);
      if (data.penanggungJawabEmail) setPenanggungJawabEmail(data.penanggungJawabEmail);
      if (Array.isArray(data.sizes) && data.sizes.length > 0) setSizes(data.sizes);
      if (data.jenisStandarMushaf) setJenisStandarMushaf(data.jenisStandarMushaf);
      if (data.kategoriPendaftaran) setKategoriPendaftaran(data.kategoriPendaftaran);
      if (data.deskripsiMushaf) setDeskripsiMushaf(data.deskripsiMushaf);
      if (Array.isArray(data.selectedJenisNaskah)) setSelectedJenisNaskah(data.selectedJenisNaskah);
      if (Array.isArray(data.selectedMateriTambahan)) setSelectedMateriTambahan(data.selectedMateriTambahan);
      if (data.penanggungJawabMateri) setPenanggungJawabMateri(data.penanggungJawabMateri);
      if (data.noPendaftaranLama) setNoPendaftaranLama(data.noPendaftaranLama);
      if (data.nomorKodeUkuranLama) setNomorKodeUkuranLama(data.nomorKodeUkuranLama);
      if (data.negaraAsalMushaf) setNegaraAsalMushaf(data.negaraAsalMushaf);
      if (data.penerbitAsalMushaf) setPenerbitAsalMushaf(data.penerbitAsalMushaf);
      if (data.lembagaPentashihAsal) setLembagaPentashihAsal(data.lembagaPentashihAsal);
      if (data.apkUrl) setApkUrl(data.apkUrl);
      if (data.currentStep) setCurrentStep(data.currentStep);
      setHasAutosaveDraft(false);
      setSuccessMsg('Draf dari sesi sebelumnya berhasil dipulihkan.');
    } catch {}
  };

  const handleDiscardAutosave = () => {
    try {
      sessionStorage.removeItem(AUTOSAVE_KEY);
      sessionStorage.removeItem('lpmq_registration_autosave_v1');
    } catch {}
    setHasAutosaveDraft(false);
  };

  // Debounced Autosave to sessionStorage & mark dirty
  useEffect(() => {
    isDirtyRef.current = Boolean(
      namaMushaf.trim() ||
      penanggungJawabProduk.trim() ||
      namaPercetakan.trim() ||
      penanggungJawabWa.trim() ||
      suratPermohonanFile ||
      coverFile ||
      contohHalamanFile
    );

    const timer = setTimeout(() => {
      if (isDirtyRef.current && !isSubmittingRef.current) {
        try {
          const snapshot = {
            namaMushaf,
            namaPercetakan,
            penanggungJawabProduk,
            penanggungJawabWa,
            penanggungJawabEmail,
            sizes,
            jenisStandarMushaf,
            kategoriPendaftaran,
            deskripsiMushaf,
            selectedJenisNaskah,
            selectedMateriTambahan,
            penanggungJawabMateri,
            noPendaftaranLama,
            nomorKodeUkuranLama,
            negaraAsalMushaf,
            penerbitAsalMushaf,
            lembagaPentashihAsal,
            apkUrl,
            currentStep,
            savedAt: new Date().toISOString(),
          };
          sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
        } catch {}
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    namaMushaf,
    namaPercetakan,
    penanggungJawabProduk,
    penanggungJawabWa,
    penanggungJawabEmail,
    sizes,
    jenisStandarMushaf,
    kategoriPendaftaran,
    deskripsiMushaf,
    selectedJenisNaskah,
    selectedMateriTambahan,
    penanggungJawabMateri,
    noPendaftaranLama,
    nomorKodeUkuranLama,
    negaraAsalMushaf,
    penerbitAsalMushaf,
    lembagaPentashihAsal,
    apkUrl,
    currentStep,
    suratPermohonanFile,
    coverFile,
    contohHalamanFile,
  ]);

  // Beforeunload warning if user tries to leave with unsaved input
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirtyRef.current && !isSubmittingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Fetch previous registrations for Perpanjangan
  useEffect(() => {
    if (kategoriPendaftaran === 'Perpanjangan Tanda Tashih') {
      setLoadingPrevRegs(true);
      registrationApi
        .listRegistrations({ page: 1, limit: 100 })
        .then((res) => {
          if (res?.items) {
            setPreviousRegistrations(res.items);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPrevRegs(false));
    }
  }, [kategoriPendaftaran]);

  // Reactive calculation
  const calculation = useMemo(() => {
    return resolveMatchedServiceAndAddons({
      kategoriPendaftaran,
      selectedJenisNaskah,
      jenisStandarMushaf,
      selectedMateriTambahan,
      serviceTypes,
      addons,
    });
  }, [
    kategoriPendaftaran,
    selectedJenisNaskah,
    jenisStandarMushaf,
    selectedMateriTambahan,
    serviceTypes,
    addons,
  ]);

  const isDigital = selectedJenisNaskah.includes('2. Digital');
  const isPerpanjangan = kategoriPendaftaran === 'Perpanjangan Tanda Tashih';
  const isLuarNegeri =
    kategoriPendaftaran === 'Mushaf Luar Negeri' ||
    selectedJenisNaskah.includes("1. Mushaf Al-Qur'an Luar Negeri");

  // Dynamic Sizes handlers
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
    clearFieldError('jenisNaskah');
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

  // Focus helper for the first invalid input element
  const focusFirstInvalidElement = (errors) => {
    const fieldMapping = {
      namaMushaf: 'registration-mushaf-name',
      penanggungJawabProduk: 'registration-product-owner',
      penanggungJawabWa: 'registration-owner-wa',
      penanggungJawabEmail: 'registration-owner-email',
      noPendaftaranLama: 'old-reg-no',
      negaraAsalMushaf: 'foreign-country-select',
      penerbitAsalMushaf: 'foreign-publisher',
      lembagaPentashihAsal: 'foreign-institution',
      suratPermohonan: 'file-surat-permohonan',
      cover: 'file-cover',
      contohHalaman: 'file-contoh-halaman',
      apk: 'file-apk',
      suratPernyataan: 'file-surat-pernyataan',
      buktiTashih: 'file-bukti-tashih',
    };

    for (const key of Object.keys(errors)) {
      const id = fieldMapping[key];
      if (id) {
        const el = document.getElementById(id);
        if (el) {
          if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          if (typeof el.focus === 'function') {
            el.focus();
          }
          break;
        }
      }
    }
  };

  // Validation for Step 1
  const validateStep1 = () => {
    const errors = {};
    if (namaMushaf.trim().length < 3) {
      errors.namaMushaf = 'Nama mushaf minimal 3 karakter.';
      setNamaMushafError('Nama mushaf minimal 3 karakter.');
    }
    if (!penanggungJawabProduk.trim()) {
      errors.penanggungJawabProduk = 'Nama penanggung jawab produk/mushaf wajib diisi.';
      setPenanggungJawabError('Nama penanggung jawab produk/mushaf wajib diisi.');
    }
    if (penanggungJawabWa.trim()) {
      const waError = validateWhatsApp(penanggungJawabWa);
      if (waError) errors.penanggungJawabWa = waError;
    }
    if (penanggungJawabEmail.trim()) {
      const emailError = validateEmail(penanggungJawabEmail);
      if (emailError) errors.penanggungJawabEmail = emailError;
    }
    if (sizes.some((s) => s.ukuran.trim() && !s.oplah)) {
      errors.sizes = 'Jika ukuran diisi, rencana oplah juga wajib diisi.';
    }
    if (isPerpanjangan && !noPendaftaranLama.trim()) {
      errors.noPendaftaranLama = 'Nomor pendaftaran mushaf lama wajib diisi.';
    }
    if (isLuarNegeri) {
      if (!negaraAsalMushaf.trim()) {
        errors.negaraAsalMushaf = 'Negara asal mushaf wajib dipilih.';
      }
      if (!penerbitAsalMushaf.trim()) {
        errors.penerbitAsalMushaf = 'Penerbit asal mushaf wajib diisi.';
      }
      if (!lembagaPentashihAsal.trim()) {
        errors.lembagaPentashihAsal = 'Lembaga pentashih asal mushaf wajib diisi.';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalidElement(errors);
      return false;
    }
    return true;
  };

  // Validation for Step 2
  const validateStep2 = () => {
    const errors = {};
    if (!selectedJenisNaskah || selectedJenisNaskah.length === 0) {
      errors.jenisNaskah = 'Pilih minimal satu jenis naskah mushaf yang didaftarkan.';
    }
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    if (Object.keys(errors).length > 0) {
      return false;
    }
    return true;
  };

  // Validation for Step 3
  const validateStep3 = () => {
    const errors = {};
    if (!suratPermohonanFile && !suratPermohonanFileId) {
      errors.suratPermohonan = 'Surat permohonan tanda tashih (PDF) wajib diunggah sebelum mengirim.';
    }
    if (!coverFile && !coverFileId) {
      errors.cover = 'Gambar cover/sampul mushaf wajib diunggah sebelum mengirim.';
    }
    if (!contohHalamanFile && !contohHalamanFileId) {
      errors.contohHalaman = 'Contoh halaman mushaf (Halaman 1–3) (PDF) wajib diunggah sebelum mengirim.';
    }
    if (isDigital && !apkFile && !apkFileId && !apkUrl.trim()) {
      errors.apk = 'File aplikasi mushaf digital (.apk) atau tautan unduhan cloud wajib disediakan.';
    }
    if (isPerpanjangan && !suratPernyataanFile && !suratPernyataanFileId) {
      errors.suratPernyataan = 'Surat pernyataan tidak ada perubahan pada master naskah wajib diunggah.';
    }
    if (isLuarNegeri && !buktiTashihFile && !buktiTashihFileId) {
      errors.buktiTashih = 'Unggah bukti tanda tashih dari lembaga pentashih asal mushaf.';
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    if (Object.keys(errors).length > 0) {
      focusFirstInvalidElement(errors);
      return false;
    }
    return true;
  };

  // Move forward to a step with validation
  const handleGoToNextStep = (targetStep) => {
    if (targetStep === 2) {
      if (validateStep1()) {
        setCurrentStep(2);
        setMaxVisitedStep((prev) => Math.max(prev, 2));
      }
    } else if (targetStep === 3) {
      if (validateStep1() && validateStep2()) {
        setCurrentStep(3);
        setMaxVisitedStep((prev) => Math.max(prev, 3));
      }
    } else if (targetStep === 4) {
      if (validateStep1() && validateStep2() && validateStep3()) {
        setCurrentStep(4);
        setMaxVisitedStep((prev) => Math.max(prev, 4));
      }
    }
  };

  // Trigger modal confirmation (REV-07)
  const handleInitiateSubmit = () => {
    setError('');
    const step1Ok = validateStep1();
    if (!step1Ok) {
      setCurrentStep(1);
      return;
    }
    const step2Ok = validateStep2();
    if (!step2Ok) {
      setCurrentStep(2);
      return;
    }
    const step3Ok = validateStep3();
    if (!step3Ok) {
      setCurrentStep(3);
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

    // Minimal validation for draft
    if (namaMushaf.trim().length < 3) {
      setNamaMushafError('Nama mushaf minimal 3 karakter.');
      setFieldErrors((prev) => ({ ...prev, namaMushaf: 'Nama mushaf minimal 3 karakter.' }));
      setCurrentStep(1);
      focusFirstInvalidElement({ namaMushaf: true });
      return;
    }

    if (!penanggungJawabProduk.trim()) {
      setPenanggungJawabError('Nama penanggung jawab produk/mushaf wajib diisi.');
      setFieldErrors((prev) => ({ ...prev, penanggungJawabProduk: 'Nama penanggung jawab produk/mushaf wajib diisi.' }));
      setCurrentStep(1);
      focusFirstInvalidElement({ penanggungJawabProduk: true });
      return;
    }

    if (sizes.some((s) => s.ukuran.trim() && !s.oplah)) {
      setError('Jika ukuran diisi, rencana oplah juga wajib diisi.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setUploadingFiles(true);

    try {
      // 1. Upload files
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

      let regType = 'NEW';
      let regCategory = 'NEW';
      if (kategoriPendaftaran === 'Perpanjangan Tanda Tashih') {
        regType = 'EXTENSION';
        regCategory = 'EXTENSION';
      } else if (kategoriPendaftaran === 'Mushaf Luar Negeri') {
        regType = 'FOREIGN_MANUSCRIPT';
        regCategory = 'FOREIGN_MANUSCRIPT';
      }

      const resolved = calculation;

      const mushafDetails = {
        nama_produk: namaMushaf.trim(),
        nama_mushaf: namaMushaf.trim(),
        penanggung_jawab_produk: penanggungJawabProduk.trim(),
        penanggung_jawab_wa: normalizeWhatsApp(penanggungJawabWa),
        penanggung_jawab_email: penanggungJawabEmail.trim(),
        sizes: sizes.filter((s) => s.ukuran.trim() || s.oplah),
        jenis_naskah: selectedJenisNaskah,
        jenis_mushaf: jenisStandarMushaf,
        kategori_pendaftaran: kategoriPendaftaran,
        nama_percetakan: kategoriPendaftaran === 'Mushaf Luar Negeri' ? '' : namaPercetakan.trim(),
        deskripsi_mushaf: deskripsiMushaf.trim(),
        materi_tambahan: selectedMateriTambahan,
        penanggung_jawab_materi_tambahan: penanggungJawabMateri.trim(),
        apk_url: apkUrl.trim() || undefined,
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
        service_type_id: resolved.matchedService?.id || serviceTypes[0]?.id,
        addon_ids: resolved.matchedAddons.map((a) => a.id),
        ...(isPerpanjangan && selectedPreviousRegId && selectedPreviousRegId !== 'MANUAL'
          ? { previous_registration_id: selectedPreviousRegId }
          : {}),
        statement_accepted: true,
        foreign_metadata: mushafDetails,
        mushaf_details: mushafDetails,
        cover_file_id: uploadedCoverId,
        surat_permohonan_file_id: uploadedPermohonanId,
        contoh_halaman_file_id: uploadedContohHalamanId,
        surat_pernyataan_perubahan_file_id: uploadedPernyataanId,
        apk_file_id: uploadedApkId,
        apk_url: apkUrl.trim() || undefined,
        bukti_tashih_file_id: uploadedBuktiTashihId,
      };

      const res = await registrationApi.createDraft(payload);
      const created = res.data;

      // Attach manuscript records with explicit error reporting
      if (uploadedCoverId) {
        try {
          await registrationApi.addManuscript(created.id, { type: 'COVER', file_id: uploadedCoverId });
        } catch (mErr) {
          console.warn('Cover attachment note:', mErr);
          if (!created.cover_file_id && !created.foreign_metadata?.cover_file_id) {
            setError('Peringatan: Berkas sampul belum tersambung ke permohonan: ' + mErr.message);
          }
        }
      }
      if (uploadedContohHalamanId) {
        try {
          await registrationApi.addManuscript(created.id, { type: 'SAMPLE_PAGE_1_5', file_id: uploadedContohHalamanId });
        } catch (mErr) {
          console.warn('Sample page attachment note:', mErr);
          if (!created.contoh_halaman_file_id && !created.foreign_metadata?.contoh_halaman_file_id) {
            setError('Peringatan: Berkas contoh halaman belum tersambung ke permohonan: ' + mErr.message);
          }
        }
      }

      setCreatedReceipt(created);
      isDirtyRef.current = false;

      // Clear autosaved draft on successful submit / save
      try {
        sessionStorage.removeItem(AUTOSAVE_KEY);
      } catch {}

      if (isDirectSubmit) {
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
      isSubmittingRef.current = false;
      setUploadingFiles(false);
    }
  };

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

        {/* Global Action Toolbar */}
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

      {/* Autosave Draft Notification Banner */}
      {hasAutosaveDraft && (
        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 text-ink text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-brand-900">Draf Formulir Belum Tersimpan Ditemukan: </span>
              <span className="text-ink-muted">
                Terdapat isian formulir otomatis dari sesi sebelumnya yang belum disimpan. Ingin memulihkannya?
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleRestoreAutosave}
              className="px-3 py-1.5 rounded-lg bg-brand-700 text-white font-bold text-xs hover:bg-brand-800 transition-colors shadow-2xs"
            >
              Pulihkan Draf
            </button>
            <button
              type="button"
              onClick={handleDiscardAutosave}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-line text-ink-muted font-semibold text-xs hover:bg-canvas transition-colors"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <RegistrationStepper
        currentStep={currentStep}
        maxVisitedStep={maxVisitedStep}
        onSelectStep={(stepId) => {
          if (stepId < currentStep) {
            setCurrentStep(stepId);
          } else {
            handleGoToNextStep(stepId);
          }
        }}
      />

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

      {/* Form Steps Panels (Kept in DOM for testing & continuous state persistence) */}
      <div className="space-y-6">
        {/* Step 1: Informasi Data Mushaf */}
        <div className={currentStep === 1 ? 'block space-y-4' : 'hidden'}>
          <Step1MushafData
            kategoriPendaftaran={kategoriPendaftaran}
            setKategoriPendaftaran={setKategoriPendaftaran}
            namaMushaf={namaMushaf}
            setNamaMushaf={setNamaMushaf}
            jenisStandarMushaf={jenisStandarMushaf}
            setJenisStandarMushaf={setJenisStandarMushaf}
            penanggungJawabProduk={penanggungJawabProduk}
            setPenanggungJawabProduk={setPenanggungJawabProduk}
            penanggungJawabWa={penanggungJawabWa}
            setPenanggungJawabWa={setPenanggungJawabWa}
            penanggungJawabEmail={penanggungJawabEmail}
            setPenanggungJawabEmail={setPenanggungJawabEmail}
            sizes={sizes}
            handleAddSizeRow={handleAddSizeRow}
            handleRemoveSizeRow={handleRemoveSizeRow}
            handleSizeChange={handleSizeChange}
            namaPercetakan={namaPercetakan}
            setNamaPercetakan={setNamaPercetakan}
            deskripsiMushaf={deskripsiMushaf}
            setDeskripsiMushaf={setDeskripsiMushaf}
            noPendaftaranLama={noPendaftaranLama}
            setNoPendaftaranLama={setNoPendaftaranLama}
            nomorKodeUkuranLama={nomorKodeUkuranLama}
            setNomorKodeUkuranLama={setNomorKodeUkuranLama}
            selectedPreviousRegId={selectedPreviousRegId}
            setSelectedPreviousRegId={setSelectedPreviousRegId}
            previousRegistrations={previousRegistrations}
            loadingPrevious={loadingPrevRegs}
            negaraAsalMushaf={negaraAsalMushaf}
            setNegaraAsalMushaf={setNegaraAsalMushaf}
            penerbitAsalMushaf={penerbitAsalMushaf}
            setPenerbitAsalMushaf={setPenerbitAsalMushaf}
            lembagaPentashihAsal={lembagaPentashihAsal}
            setLembagaPentashihAsal={setLembagaPentashihAsal}
            fieldErrors={fieldErrors}
            clearFieldError={clearFieldError}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleGoToNextStep(2)}
              icon={<ArrowRight className="w-4 h-4" />}
              className="text-xs font-bold"
            >
              Lanjut: Langkah 2 (Jenis & Materi)
            </Button>
          </div>
        </div>

        {/* Step 2: Jenis & Materi */}
        <div className={currentStep === 2 ? 'block space-y-4' : 'hidden'}>
          <Step2JenisMateri
            selectedJenisNaskah={selectedJenisNaskah}
            toggleJenisNaskah={toggleJenisNaskah}
            selectedMateriTambahan={selectedMateriTambahan}
            toggleMateriTambahan={toggleMateriTambahan}
            penanggungJawabMateri={penanggungJawabMateri}
            setPenanggungJawabMateri={setPenanggungJawabMateri}
            fieldErrors={fieldErrors}
          />

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCurrentStep(1)}
              icon={<ArrowLeft className="w-4 h-4" />}
              className="text-xs"
            >
              Sebelumnya: Langkah 1
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleGoToNextStep(3)}
              icon={<ArrowRight className="w-4 h-4" />}
              className="text-xs font-bold"
            >
              Lanjut: Langkah 3 (Berkas Persyaratan)
            </Button>
          </div>
        </div>

        {/* Step 3: Berkas Persyaratan */}
        <div className={currentStep === 3 ? 'block space-y-4' : 'hidden'}>
          <Step3Berkas
            kategoriPendaftaran={kategoriPendaftaran}
            suratPermohonanFile={suratPermohonanFile}
            setSuratPermohonanFile={setSuratPermohonanFile}
            suratPermohonanFileId={suratPermohonanFileId}
            setSuratPermohonanFileId={setSuratPermohonanFileId}
            coverFile={coverFile}
            setCoverFile={setCoverFile}
            coverFileId={coverFileId}
            setCoverFileId={setCoverFileId}
            contohHalamanFile={contohHalamanFile}
            setContohHalamanFile={setContohHalamanFile}
            contohHalamanFileId={contohHalamanFileId}
            setContohHalamanFileId={setContohHalamanFileId}
            apkFile={apkFile}
            setApkFile={setApkFile}
            apkFileId={apkFileId}
            setApkFileId={setApkFileId}
            apkUrl={apkUrl}
            setApkUrl={setApkUrl}
            suratPernyataanFile={suratPernyataanFile}
            setSuratPernyataanFile={setSuratPernyataanFile}
            suratPernyataanFileId={suratPernyataanFileId}
            setSuratPernyataanFileId={setSuratPernyataanFileId}
            buktiTashihFile={buktiTashihFile}
            setBuktiTashihFile={setBuktiTashihFile}
            buktiTashihFileId={buktiTashihFileId}
            setBuktiTashihFileId={setBuktiTashihFileId}
            isDigital={isDigital}
            fieldErrors={fieldErrors}
            clearFieldError={clearFieldError}
          />

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCurrentStep(2)}
              icon={<ArrowLeft className="w-4 h-4" />}
              className="text-xs"
            >
              Sebelumnya: Langkah 2
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleGoToNextStep(4)}
              icon={<ArrowRight className="w-4 h-4" />}
              className="text-xs font-bold"
            >
              Lanjut: Langkah 4 (Tinjau & Kirim)
            </Button>
          </div>
        </div>

        {/* Step 4: Tinjau & Kirim */}
        <div className={currentStep === 4 ? 'block' : 'hidden'}>
          <Step4ReviewSubmit
            kategoriPendaftaran={kategoriPendaftaran}
            namaMushaf={namaMushaf}
            jenisStandarMushaf={jenisStandarMushaf}
            penanggungJawabProduk={penanggungJawabProduk}
            penanggungJawabWa={penanggungJawabWa}
            penanggungJawabEmail={penanggungJawabEmail}
            namaPercetakan={namaPercetakan}
            deskripsiMushaf={deskripsiMushaf}
            sizes={sizes}
            selectedJenisNaskah={selectedJenisNaskah}
            selectedMateriTambahan={selectedMateriTambahan}
            penanggungJawabMateri={penanggungJawabMateri}
            suratPermohonanFile={suratPermohonanFile}
            suratPermohonanFileId={suratPermohonanFileId}
            coverFile={coverFile}
            coverFileId={coverFileId}
            contohHalamanFile={contohHalamanFile}
            contohHalamanFileId={contohHalamanFileId}
            apkFile={apkFile}
            apkFileId={apkFileId}
            apkUrl={apkUrl}
            suratPernyataanFile={suratPernyataanFile}
            suratPernyataanFileId={suratPernyataanFileId}
            buktiTashihFile={buktiTashihFile}
            buktiTashihFileId={buktiTashihFileId}
            isDigital={isDigital}
            isPerpanjangan={isPerpanjangan}
            isLuarNegeri={isLuarNegeri}
            calculation={calculation}
            isSubmitting={isSubmitting}
            uploadingFiles={uploadingFiles}
            onSaveDraft={() => executeSubmit(false)}
            onSubmitRegistration={handleInitiateSubmit}
            onPreviousStep={() => setCurrentStep(3)}
          />
        </div>
      </div>

      {/* Confirmation Modal Before Sending (REV-07) */}
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

              <div className="pt-2 border-t border-line text-xs text-ink-muted space-y-1">
                <p className="font-bold text-ink text-xs">Berkas Digital Terlampir:</p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  Surat Permohonan: <span className="font-medium text-ink">{suratPermohonanFile?.name || (suratPermohonanFileId ? 'Berkas tersimpan' : 'File dipilih')}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  Cover Mushaf: <span className="font-medium text-ink">{coverFile?.name || (coverFileId ? 'Berkas tersimpan' : 'File dipilih')}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  Contoh Halaman (1–3): <span className="font-medium text-ink">{contohHalamanFile?.name || (contohHalamanFileId ? 'Berkas tersimpan' : 'File dipilih')}</span>
                </p>
                {isDigital && (apkFile || apkUrl) && (
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                    File APK: <span className="font-medium text-ink">{apkFile?.name || apkUrl}</span>
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
