import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { masterApi } from '@/api/master.api';
import { registrationApi } from '@/api/registration.api';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BookOpen,
  Send,
  Save,
  Clock,
  Coins,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Info,
  Calendar,
} from 'lucide-react';

export const NewRegistrationPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    service_type_id: '',
    registration_type: 'NEW',
    previous_registration_id: '',
    selectedAddons: [],
  });

  const [selectedService, setSelectedService] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

        // Pre-select first category and first service type if available
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
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(number);
  };

  const handleSave = async (isDirectSubmit = false) => {
    setError('');
    setSuccessMsg('');

    if (!formData.title.trim()) {
      setError('Judul naskah mushaf wajib diisi.');
      return;
    }
    if (!formData.service_type_id) {
      setError('Pilih jenis layanan pentashihan.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Buat draf pengajuan
      const draftPayload = {
        title: formData.title,
        service_type_id: formData.service_type_id,
        registration_type: formData.registration_type,
        previous_registration_id: formData.previous_registration_id || undefined,
        addon_ids: formData.selectedAddons,
      };

      const createRes = await registrationApi.createDraft(draftPayload);
      const createdReg = createRes.data;

      if (isDirectSubmit) {
        // 2. Submit langsung untuk mengunci snapshot tarif & SLA
        await registrationApi.submitRegistration(createdReg.id);
        setSuccessMsg(
          `Pengajuan "${formData.title}" (${createdReg.registration_no}) berhasil dikirim dan siap diverifikasi!`
        );
      } else {
        setSuccessMsg(
          `Draf pengajuan "${formData.title}" (${createdReg.registration_no}) berhasil disimpan.`
        );
      }

      setTimeout(() => {
        navigate('/publisher');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pengajuan ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = serviceTypes.filter(
    (st) => !formData.category_id || st.category_id === formData.category_id
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Tombol Kembali */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/publisher"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-primary-700 font-medium mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dasbor
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">
            Formulir Pengajuan Pentashihan Baru
          </h1>
          <p className="text-sm text-neutral-500">
            Pendaftaran naskah mushaf Al-Qur'an, pemilihan profil layanan resmi, dan snapshot tarif PNBP.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-status-danger text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Terjadi Kesalahan: </span>
            {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-primary-700 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Berhasil: </span>
            {successMsg}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form Utama */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-bold text-neutral-900 mb-4 pb-2 border-b border-neutral-200 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-700" />
              Identitas Naskah Mushaf
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Judul Lengkap Mushaf / Naskah *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Mushaf Al-Qur'an Al-Karim Rasm Usmani Terjemah Tajwid Warna"
                  className="block w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Tuliskan judul lengkap naskah sesuai yang akan dicetak pada sampul/cover.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Jenis Pengajuan
                  </label>
                  <select
                    value={formData.registration_type}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_type: e.target.value })
                    }
                    className="block w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="NEW">Pengajuan Baru (Reguler)</option>
                    <option value="EXTENSION">Perpanjangan Surat Tanda Tashih (STT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Kategori Mushaf *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                    disabled={loadingMaster}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Pilihan Profil Layanan (17 Layanan Resmi LPMQ) *
                </label>
                <select
                  value={formData.service_type_id}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  disabled={loadingMaster}
                >
                  {filteredServices.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {formatRupiah(st.base_fee)}
                    </option>
                  ))}
                </select>
              </div>

              {formData.registration_type === 'EXTENSION' && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200">
                  <label className="block text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                    ID / Nomor Dokumen STT Sebelumnya *
                  </label>
                  <input
                    type="text"
                    value={formData.previous_registration_id}
                    onChange={(e) =>
                      setFormData({ ...formData, previous_registration_id: e.target.value })
                    }
                    placeholder="Contoh: STT/LPMQ/2024/001"
                    className="block w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  />
                  <span className="text-[11px] text-amber-700 mt-1 block">
                    Sesuai BR-08: Perpanjangan wajib menautkan dokumen STT aktif milik penerbit yang sama.
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Ketentuan Berkas Sesuai SOP */}
          <Card className="p-6 bg-neutral-50/70 border-neutral-200">
            <h3 className="text-sm font-bold text-neutral-800 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-700" />
              Ketentuan Berkas Penanda Awal (SOP LPMQ)
            </h3>
            <ul className="text-xs text-neutral-600 space-y-1.5 list-disc list-inside">
              <li>
                Sesuai <strong>DESIGN.md §4</strong>, penerbit cukup mengunggah cover mushaf dan halaman sampel penanda (hlm 1–5).
              </li>
              <li>
                Naskah master fisik (cetak A4 dijilid per juz) dikirimkan ke sekretariat LPMQ setelah formulir pendaftaran diterbitkan.
              </li>
              <li>
                Berita Acara Tashih bukan syarat upload awal penerbit melainkan keluaran proses sidang tashih internal.
              </li>
            </ul>
          </Card>
        </div>

        {/* Kolom Kanan: Rincian Tarif & SLA Snapshot */}
        <div className="space-y-6">
          <Card variant="billing" className="p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gold-700 flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4" />
              Kalkulasi Tarif PNBP
            </h2>

            <div className="my-4">
              <span className="text-xs text-neutral-500 block">Tarif Dasar Layanan:</span>
              <div className="text-3xl font-extrabold text-neutral-900 tabular-nums">
                {selectedService ? formatRupiah(selectedService.base_fee) : 'Rp 0'}
              </div>
              <span className="text-[11px] text-neutral-500">
                Unit tarif: {selectedService?.fee_unit || 'PER_STT'}
              </span>
            </div>

            <div className="pt-4 border-t border-gold-400/30 space-y-3">
              <h3 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-700" />
                Standar Pelayanan (SLA Resmi)
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-white border border-gold-400/20">
                  <div className="text-xs text-neutral-500">Awal</div>
                  <div className="text-sm font-bold text-primary-700">
                    {selectedService?.duration_initial || 0} HK
                  </div>
                </div>
                <div className="p-2 rounded bg-white border border-gold-400/20">
                  <div className="text-xs text-neutral-500">Revisi</div>
                  <div className="text-sm font-bold text-amber-700">
                    {selectedService?.duration_revision || 0} HK
                  </div>
                </div>
                <div className="p-2 rounded bg-white border border-gold-400/20">
                  <div className="text-xs text-neutral-500">Dumi</div>
                  <div className="text-sm font-bold text-teal-700">
                    {selectedService?.duration_dummy || 0} HK
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 leading-tight">
                * HK = Hari Kerja (dihitung berdasar kalender kerja master SKB 3 Menteri, bukan hari kalender).
              </p>
            </div>
          </Card>

          {/* Tombol Aksi */}
          <div className="space-y-3">
            <Button
              type="button"
              disabled={isSubmitting || loadingMaster}
              onClick={() => handleSave(true)}
              className="w-full justify-center py-3 text-sm font-bold shadow-md shadow-primary-700/20"
              icon={<Send className="w-4 h-4" />}
            >
              {isSubmitting ? 'Memproses Pengajuan...' : 'Kirim & Ajukan Pentashihan'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting || loadingMaster}
              onClick={() => handleSave(false)}
              className="w-full justify-center py-2.5 text-sm"
              icon={<Save className="w-4 h-4" />}
            >
              Simpan Sebagai Draf
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewRegistrationPage;
