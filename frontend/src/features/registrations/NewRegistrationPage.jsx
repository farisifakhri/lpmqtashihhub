import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RegistrationReceiptDialog } from './RegistrationReceiptDialog';
import {
  BookOpen,
  Send,
  Save,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Info,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Globe,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

const REGISTRATION_CATEGORIES = [
  {
    id: 'NEW',
    title: 'STT Baru',
    badge: 'Master Dalam Negeri',
    description: 'Permohonan Surat Tanda Tashih untuk master mushaf Al-Qur\'an baru cetak atau digital yang diterbitkan di dalam negeri.',
    icon: BookOpen,
    borderActive: 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/30',
  },
  {
    id: 'EXTENSION',
    title: 'Perpanjangan STT',
    badge: 'STT Aktif / Berakhir',
    description: 'Permohonan perpanjangan masa berlaku Surat Tanda Tashih yang telah diterbitkan sebelumnya oleh LPMQ.',
    icon: Clock,
    borderActive: 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-600/30',
  },
  {
    id: 'FOREIGN_MANUSCRIPT',
    title: 'Mushaf Luar Negeri',
    badge: 'Izin Edar Mushaf Impor',
    description: 'Permohonan Surat Izin Edar untuk mushaf Al-Qur\'an cetakan luar negeri agar sah dan legal diedarkan di Indonesia.',
    icon: Globe,
    borderActive: 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/30',
  },
];

export const NewRegistrationPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  // Kategori Permohonan Utama: NEW (STT Baru), EXTENSION (Perpanjangan), FOREIGN_MANUSCRIPT (Mushaf Luar Negeri)
  const [registrationCategory, setRegistrationCategory] = useState('NEW');

  // Multi-Naskah: Mendukung pendaftaran lebih dari 1 naskah dalam satu form
  const [manuscripts, setManuscripts] = useState([
    { title: '' },
  ]);

  const [formData, setFormData] = useState({
    category_id: '',
    service_type_id: '',
    previous_registration_id: '',
    selectedAddons: [],
  });

  // Metadata khusus Mushaf Luar Negeri
  const [foreignMetadata, setForeignMetadata] = useState({
    country_of_origin: '',
    foreign_publisher_name: '',
    recommendation_decree_no: '',
    import_license_no: '',
  });

  // Surat Pernyataan Keabsahan Naskah (Pre-checked by default, publisher can preview/uncheck)
  const [statementAccepted, setStatementAccepted] = useState(true);
  const [showStatementModal, setShowStatementModal] = useState(false);

  const [selectedService, setSelectedService] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dialog Bukti Pendaftaran
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

        // Pre-select first category and matching service type
        if (resCat?.data?.length > 0) {
          const firstCatId = resCat.data[0].id;
          const matchingTypes = resSt?.data?.filter((s) => s.category_id === firstCatId) || [];
          setFormData((prev) => ({
            ...prev,
            category_id: firstCatId,
            service_type_id: matchingTypes[0]?.id || '',
          }));
          if (matchingTypes[0]) {
            setSelectedService(matchingTypes[0]);
          }
        }
      } catch (err) {
        setError('Gagal memuat master data layanan dari server: ' + err.message);
      } finally {
        setLoadingMaster(false);
      }
    };

    fetchMaster();
  }, []);

  // Saat kategori pendaftaran berubah ke Mushaf Luar Negeri, sesuaikan jenis layanan
  const handleCategorySelect = (catId) => {
    setRegistrationCategory(catId);
    if (catId === 'FOREIGN_MANUSCRIPT') {
      const foreignService = serviceTypes.find((s) =>
        s.name.toLowerCase().includes('luar negeri')
      );
      if (foreignService) {
        setFormData((prev) => ({
          ...prev,
          category_id: foreignService.category_id,
          service_type_id: foreignService.id,
        }));
        setSelectedService(foreignService);
      }
    }
  };

  // Handle Category change
  const handleCategoryChange = (catId) => {
    const matchingTypes = serviceTypes.filter((s) => s.category_id === catId);
    const newServiceId = matchingTypes[0]?.id || '';
    setFormData((prev) => ({
      ...prev,
      category_id: catId,
      service_type_id: newServiceId,
    }));
    setSelectedService(matchingTypes[0] || null);
  };

  // Handle Service Type change
  const handleServiceChange = (serviceId) => {
    const found = serviceTypes.find((s) => s.id === serviceId);
    setFormData((prev) => ({ ...prev, service_type_id: serviceId }));
    setSelectedService(found || null);

    if (found?.name?.toLowerCase().includes('luar negeri')) {
      setRegistrationCategory('FOREIGN_MANUSCRIPT');
    }
  };

  // Manajemen Multi-Naskah
  const handleAddManuscript = () => {
    setManuscripts([...manuscripts, { title: '' }]);
  };

  const handleRemoveManuscript = (index) => {
    if (manuscripts.length <= 1) return;
    setManuscripts(manuscripts.filter((_, idx) => idx !== index));
  };

  const handleManuscriptTitleChange = (index, value) => {
    setManuscripts(
      manuscripts.map((item, idx) => (idx === index ? { ...item, title: value } : item))
    );
  };

  const handleSave = async (isDirectSubmit = false) => {
    setError('');
    setSuccessMsg('');

    // Validasi multi-naskah
    const invalidManuscript = manuscripts.find((m) => !m.title.trim());
    if (invalidManuscript !== undefined) {
      setError('Seluruh judul naskah mushaf yang didaftarkan wajib diisi.');
      return;
    }

    if (!formData.service_type_id) {
      setError('Pilih jenis profil layanan pentashihan.');
      return;
    }

    if (registrationCategory === 'EXTENSION' && !formData.previous_registration_id.trim()) {
      setError('Permohonan perpanjangan wajib menyertakan nomor atau ID registrasi STT sebelumnya.');
      return;
    }

    if (registrationCategory === 'FOREIGN_MANUSCRIPT') {
      if (!foreignMetadata.country_of_origin.trim()) {
        setError('Negara asal penerbitan mushaf luar negeri wajib diisi.');
        return;
      }
      if (!foreignMetadata.foreign_publisher_name.trim()) {
        setError('Nama penerbit asli luar negeri wajib diisi.');
        return;
      }
    }

    if (!statementAccepted) {
      setError('Anda wajib menyetujui Surat Pernyataan Keabsahan Naskah sebelum melanjutkan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: manuscripts[0].title,
        manuscripts: manuscripts.map((m) => ({ title: m.title.trim() })),
        service_type_id: formData.service_type_id,
        registration_type: registrationCategory === 'EXTENSION' ? 'EXTENSION' : 'NEW',
        registration_category: registrationCategory,
        ...(registrationCategory === 'EXTENSION' && formData.previous_registration_id
          ? { previous_registration_id: formData.previous_registration_id.trim() }
          : {}),
        ...(registrationCategory === 'FOREIGN_MANUSCRIPT'
          ? { foreign_metadata: foreignMetadata }
          : {}),
        statement_accepted: true,
        addons: formData.selectedAddons,
        addon_ids: formData.selectedAddons,
      };

      const createRes = await registrationApi.createDraft(payload);
      const createdReg = createRes.data;

      setCreatedReceipt(createdReg);

      if (isDirectSubmit) {
        setSuccessMsg(
          `Permohonan "${manuscripts[0].title}" (${createdReg.registration_no}) berhasil dibuat. Lanjutkan melengkapi berkas.`
        );
        navigate(`/publisher/registrations/${createdReg.id}`);
      } else {
        setSuccessMsg(
          `Draf permohonan (${createdReg.registration_no}) berhasil disimpan. Anda dapat mengunduh bukti pendaftaran.`
        );
        setShowReceiptDialog(true);
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan permohonan ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = serviceTypes.filter(
    (st) => !formData.category_id || st.category_id === formData.category_id
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-28 lg:pb-12 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <Link
            to="/publisher"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 font-semibold mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dasbor
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Formulir Permohonan Layanan Tanda Tashih
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pendaftaran naskah mushaf Al-Qur'an, pemilihan kategori layanan resmi, dan penetapan standar waktu pelayanan (SLA).
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
            icon={<Save className="w-3.5 h-3.5 text-slate-600" />}
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
            {isSubmitting ? 'Memproses...' : 'Lanjutkan ke Berkas'}
          </Button>
        </div>
      </div>

      {/* Error & Success Notices */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Terjadi Kesalahan: </span>
            {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <span className="font-bold">Berhasil: </span>
            {successMsg}
          </div>
        </div>
      )}

      {/* 1. Tiga Kategori Utama Permohonan (Sesuai tashih.kemenag.go.id) */}
      <section aria-labelledby="registration-category-title" className="space-y-3">
        <h2 id="registration-category-title" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-700" />
          Pilih Kategori Permohonan Resmi:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {REGISTRATION_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = registrationCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer bg-white relative ${
                  isSelected
                    ? cat.borderActive
                    : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    <Icon className="w-3 h-3 text-emerald-700" />
                    {cat.badge}
                  </span>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900">{cat.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Form Content & Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form Detail (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card Multi-Naskah */}
          <Card className="p-5 sm:p-6 shadow-xs border-slate-200/90 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                Daftar Naskah Mushaf yang Didaftarkan
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {manuscripts.length} Naskah
              </span>
            </div>

            <div className="space-y-3">
              {manuscripts.map((manuscript, index) => (
                <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Judul Naskah #{index + 1} *
                    </label>
                    {manuscripts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveManuscript(index)}
                        className="text-xs text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={manuscript.title}
                    onChange={(e) => handleManuscriptTitleChange(index, e.target.value)}
                    placeholder="Contoh: Mushaf Al-Qur'an Al-Karim Rasm Usmani Terjemah Tajwid Warna"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-emerald-700/20 bg-white"
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddManuscript}
                className="w-full text-xs font-bold border-dashed border-emerald-600/60 text-emerald-800 hover:bg-emerald-50 py-2.5"
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                + Tambah Naskah Lain (Daftarkan Lebih dari 1 Naskah)
              </Button>
            </div>
          </Card>

          {/* Form Khusus Perpanjangan STT */}
          {registrationCategory === 'EXTENSION' && (
            <Card className="p-5 sm:p-6 shadow-xs border-sky-200 bg-sky-50/30 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-sky-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-700" />
                Data Surat Tanda Tashih (STT) Sebelumnya
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Masukkan nomor registrasi atau nomor STT sebelumnya yang hendak diperpanjang.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor Registrasi / STT Terdahulu *
                </label>
                <input
                  type="text"
                  value={formData.previous_registration_id}
                  onChange={(e) => setFormData({ ...formData, previous_registration_id: e.target.value })}
                  placeholder="Contoh: REG-2025-06-0012 atau nomor SK Tanda Tashih"
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-sky-700/20 font-mono"
                />
              </div>
            </Card>
          )}

          {/* Form Khusus Mushaf Luar Negeri */}
          {registrationCategory === 'FOREIGN_MANUSCRIPT' && (
            <Card className="p-5 sm:p-6 shadow-xs border-amber-200 bg-amber-50/30 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-700" />
                Kelengkapan Khusus Izin Edar Mushaf Luar Negeri
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sesuai regulasi Kemenag RI, mushaf cetakan luar negeri memerlukan identitas penerbit asal dan surat rekomendasi/izin impor.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Negara Asal Penerbitan *
                  </label>
                  <input
                    type="text"
                    value={foreignMetadata.country_of_origin}
                    onChange={(e) => setForeignMetadata({ ...foreignMetadata, country_of_origin: e.target.value })}
                    placeholder="Contoh: Arab Saudi, Mesir, Turki, Lebanon"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-amber-700/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Penerbit Asli Luar Negeri *
                  </label>
                  <input
                    type="text"
                    value={foreignMetadata.foreign_publisher_name}
                    onChange={(e) => setForeignMetadata({ ...foreignMetadata, foreign_publisher_name: e.target.value })}
                    placeholder="Contoh: Mujamma Malik Fahd, Darussalam"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-amber-700/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor Rekomendasi / Izin Edar Kemenag
                  </label>
                  <input
                    type="text"
                    value={foreignMetadata.recommendation_decree_no}
                    onChange={(e) => setForeignMetadata({ ...foreignMetadata, recommendation_decree_no: e.target.value })}
                    placeholder="Jika sudah ada rekomendasi awal"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-amber-700/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor Izin Impor / Dokumen Bea Cukai
                  </label>
                  <input
                    type="text"
                    value={foreignMetadata.import_license_no}
                    onChange={(e) => setForeignMetadata({ ...foreignMetadata, import_license_no: e.target.value })}
                    placeholder="Nomor dokumen kepabeanan/impor"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-amber-700/20"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Pemilihan Jenis Layanan */}
          <Card className="p-5 sm:p-6 shadow-xs border-slate-200/90 rounded-2xl space-y-4">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700" />
              Profil Layanan & Kategori Mushaf
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kategori Mushaf
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-700/20"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Jenis Layanan Pentashihan *
                </label>
                <select
                  value={formData.service_type_id}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-700/20"
                >
                  {filteredServices.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Surat Pernyataan Keabsahan */}
          <Card className="p-5 sm:p-6 shadow-xs border-emerald-300/80 bg-emerald-50/40 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Surat Pernyataan Keabsahan & Kepatuhan SOP
              </h3>
              <button
                type="button"
                onClick={() => setShowStatementModal(true)}
                className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Baca Teks Lengkap
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Pemohon wajib menyatakan bahwa master mushaf Al-Qur'an yang diajukan tidak melanggar hak cipta, sesuai mushaf standar Indonesia, dan bersedia mengikuti koreksi sidang pentashihan LPMQ.
            </p>

            <label className="flex items-start gap-3 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={statementAccepted}
                onChange={(e) => setStatementAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-800 border-slate-300 rounded focus:ring-emerald-700"
              />
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                Saya menyetujui seluruh klausul <strong>Surat Pernyataan Keabsahan Naskah & Tanggung Jawab Mutlak</strong> dan menjamin kebenaran seluruh dokumen yang disampaikan.
              </span>
            </label>
          </Card>
        </div>

        {/* Kolom Kanan: Sticky Rail (Standar Pelayanan SLA Resmi & Aksi) - TANPA KALKULASI TARIF PNBP */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          <Card className="p-5 rounded-2xl shadow-xs border-slate-200 space-y-3.5 bg-white">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Standar Waktu Pelayanan (SLA Resmi)</span>
            </h2>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Sidang Awal</div>
                <div className="text-sm font-extrabold text-emerald-800 mt-0.5">
                  {selectedService?.duration_initial || 15} HK
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Perbaikan</div>
                <div className="text-sm font-extrabold text-amber-700 mt-0.5">
                  {selectedService?.duration_revision || 7} HK
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Dumi Bersih</div>
                <div className="text-sm font-extrabold text-teal-700 mt-0.5">
                  {selectedService?.duration_dummy || 3} HK
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              * HK = Hari Kerja resmi (Senin–Jumat, 07.30–16.00). Dihitung berdasarkan kalender kerja SKB 3 Menteri.
            </p>

            <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
              <span className="font-bold block text-slate-800">Ketentuan Berkas Fisik:</span>
              <ul className="list-disc list-inside space-y-1 pl-1 leading-relaxed">
                <li>Naskah cetak master fisik A4 dijilid per juz dikirimkan ke Loket LPMQ.</li>
                <li>Setelah pendaftaran berhasil, Anda dapat mencetak Bukti Pendaftaran Resmi.</li>
              </ul>
            </div>
          </Card>

          {/* Action Buttons Desktop */}
          <div className="space-y-2 hidden lg:block">
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting || loadingMaster}
              onClick={() => handleSave(true)}
              className="w-full justify-center py-3 text-xs font-bold shadow-xs"
              icon={<Send className="w-4 h-4" />}
            >
              {isSubmitting ? 'Memproses Permohonan...' : 'Lanjutkan ke Berkas'}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || loadingMaster}
              onClick={() => handleSave(false)}
              className="w-full justify-center py-2.5 text-xs font-semibold"
              icon={<Save className="w-3.5 h-3.5 text-slate-600" />}
            >
              Simpan Sebagai Draf
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar on Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-800 truncate">
          {manuscripts.length} Naskah · {selectedService?.name || 'Layanan Tashih'}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting || loadingMaster}
            onClick={() => handleSave(false)}
            className="text-xs px-3"
          >
            Draf
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSubmitting || loadingMaster}
            onClick={() => handleSave(true)}
            className="text-xs font-bold px-3.5"
            icon={<Send className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? '...' : 'Lanjutkan'}
          </Button>
        </div>
      </div>

      {/* Modal Teks Surat Pernyataan Lengkap */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Teks Surat Pernyataan Keabsahan</h3>
              <button
                type="button"
                onClick={() => setShowStatementModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-3 leading-relaxed text-slate-700 max-h-80 overflow-y-auto">
              <p className="font-bold text-slate-900 text-center uppercase">
                Surat Pernyataan Keabsahan & Tanggung Jawab Mutlak
              </p>
              <p>
                Yang bertanda tangan di bawah ini, pemohon permohonan tanda tashih dari badan usaha/perorangan penerbit terdaftar, menyatakan bahwa:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Seluruh data dan naskah mushaf yang diajukan adalah benar, orisinal, dan sah secara hukum.</li>
                <li>Naskah yang diajukan tidak melanggar hak cipta, merek, atau hak kekayaan intelektual pihak mana pun.</li>
                <li>Penerbit bersedia mematuhi seluruh kaidah Rasm Usmani, tanda waqaf, dan mushaf standar Indonesia.</li>
                <li>Penerbit bersedia melakukan perbaikan secara tertib sesuai hasil sidang pentashihan tim LPMQ.</li>
              </ol>
              <p>
                Demikian surat pernyataan ini dibuat dengan penuh kesadaran dan tanggung jawab mutlak.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStatementAccepted(true);
                  setShowStatementModal(false);
                }}
                className="text-xs font-bold"
              >
                Saya Mengerti & Setujui
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Bukti Pendaftaran */}
      <RegistrationReceiptDialog
        isOpen={showReceiptDialog}
        onClose={() => setShowReceiptDialog(false)}
        registration={createdReceipt}
      />
    </div>
  );
};

export default NewRegistrationPage;
