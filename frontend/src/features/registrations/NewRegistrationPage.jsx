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
  Layers,
  Sparkles,
  HelpCircle,
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
    }).format(number || 0);
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
        ...(formData.registration_type === 'EXTENSION' && formData.previous_registration_id
          ? { previous_registration_id: formData.previous_registration_id }
          : {}),
        addons: formData.selectedAddons,
        addon_ids: formData.selectedAddons,
      };

      const createRes = await registrationApi.createDraft(draftPayload);
      const createdReg = createRes.data;

      if (isDirectSubmit) {
        // Continue to the owned detail page to upload required samples first.
        // Final submission is an explicit action after the files are reviewed.
        setSuccessMsg(
          `Draf "${formData.title}" (${createdReg.registration_no}) dibuat. Lanjutkan melengkapi berkas sebelum mengirim.`
        );
      } else {
        setSuccessMsg(
          `Draf pengajuan "${formData.title}" (${createdReg.registration_no}) berhasil disimpan.`
        );
      }

      navigate(`/publisher/registrations/${createdReg.id}`);
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
    <div className="space-y-5 max-w-6xl mx-auto pb-28 lg:pb-12">
      {/* Header Bar dengan Tombol Aksi Cepat di Bagian Atas (No need to scroll!) */}
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
            Formulir Pengajuan Pentashihan Baru
          </h1>
          <p className="text-xs text-slate-500">
            Pendaftaran naskah mushaf Al-Qur'an, pemilihan profil layanan resmi, dan snapshot tarif PNBP.
          </p>
        </div>

        {/* Top Quick Actions Toolbar: Simpan & Kirim langsung dari atas */}
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
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-status-danger text-xs sm:text-sm flex items-start gap-3 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Terjadi Kesalahan: </span>
            {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-3 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <span className="font-bold">Berhasil: </span>
            {successMsg}
          </div>
        </div>
      )}

      {/* 2-Column Layout: Form di Kiri (8 cols), Sticky Billing Rail di Kanan (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri: Form Utama */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-5 sm:p-6 shadow-xs border-slate-200/90 rounded-2xl">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mb-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-emerald-700" />
                Identitas Naskah Mushaf
              </span>
              <span className="text-[11px] font-semibold text-slate-400 font-normal">
                * Wajib Diisi
              </span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Judul Lengkap Mushaf / Naskah *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Mushaf Al-Qur'an Al-Karim Rasm Usmani Terjemah Tajwid Warna"
                  className="block w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tuliskan judul lengkap naskah sesuai yang akan dicetak pada sampul/cover mushaf.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jenis Pengajuan
                  </label>
                  <select
                    value={formData.registration_type}
                    onChange={(e) =>
                      setFormData({ ...formData, registration_type: e.target.value })
                    }
                    className="block w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none bg-white font-medium"
                  >
                    <option value="NEW">Pengajuan Baru (Reguler)</option>
                    <option value="EXTENSION">Perpanjangan Surat Tanda Tashih (STT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Mushaf *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="block w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none bg-white font-medium"
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pilihan Profil Layanan (17 Layanan Resmi LPMQ) *
                </label>
                <select
                  value={formData.service_type_id}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="block w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none bg-white font-medium text-slate-800"
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
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                    ID / Nomor Dokumen STT Sebelumnya *
                  </label>
                  <input
                    type="text"
                    value={formData.previous_registration_id}
                    onChange={(e) =>
                      setFormData({ ...formData, previous_registration_id: e.target.value })
                    }
                    placeholder="Contoh: STT/LPMQ/2024/001"
                    className="block w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium"
                  />
                  <span className="text-[11px] text-amber-800 mt-1 block font-medium">
                    Sesuai BR-08: Perpanjangan wajib menautkan dokumen STT aktif milik penerbit yang sama.
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Ketentuan Berkas Sesuai SOP Ringkas */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 text-xs space-y-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>Ketentuan Berkas Penanda Awal (SOP LPMQ)</span>
            </h3>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside leading-relaxed pl-1">
              <li>
                Sesuai <strong>DESIGN.md §4</strong>, penerbit cukup mengunggah cover mushaf dan halaman sampel penanda (hlm 1–5).
              </li>
              <li>
                Naskah master fisik (cetak A4 dijilid per juz) dikirimkan ke loket LPMQ setelah formulir pendaftaran diterbitkan.
              </li>
              <li>
                Berita Acara Tashih bukan syarat upload awal melainkan keluaran proses sidang pentashihan internal.
              </li>
            </ul>
          </div>
        </div>

        {/* Kolom Kanan: Sticky Rail (Billing, SLA & Action Buttons) - STAYS IN VIEW */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          
          {/* Card Kalkulasi Tarif PNBP & SLA */}
          <Card variant="billing" className="p-5 rounded-2xl shadow-xs border-gold-300">
            <h2 className="text-xs font-black uppercase tracking-wider text-gold-800 flex items-center gap-2 mb-2 pb-2 border-b border-gold-300/60">
              <Coins className="w-4 h-4 text-gold-600" />
              <span>Kalkulasi Tarif PNBP</span>
            </h2>

            <div className="my-3">
              <span className="text-[11px] text-slate-500 block">Tarif Dasar Layanan Resmi:</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                {selectedService ? formatRupiah(selectedService.base_fee) : 'Rp 0'}
              </div>
              <span className="text-[10px] font-semibold text-gold-800 bg-gold-100/80 px-2 py-0.5 rounded-full border border-gold-300 mt-1 inline-block">
                Satuan: {selectedService?.fee_unit || 'PER_STT'}
              </span>
            </div>

            <div className="pt-3 border-t border-gold-200/80 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Standar Pelayanan (SLA Resmi)</span>
              </h3>
              
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-2 rounded-lg bg-white/90 border border-gold-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-medium">Awal</div>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-800">
                    {selectedService?.duration_initial || 0} HK
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/90 border border-gold-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-medium">Revisi</div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-700">
                    {selectedService?.duration_revision || 0} HK
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/90 border border-gold-200 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-medium">Dumi</div>
                  <div className="text-xs sm:text-sm font-extrabold text-teal-700">
                    {selectedService?.duration_dummy || 0} HK
                  </div>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 leading-tight italic pt-1">
                * HK = Hari Kerja (dihitung berdasar kalender kerja master SKB 3 Menteri).
              </p>
            </div>
          </Card>

          {/* Action Buttons (Sticky & Clear on Desktop) */}
          <div className="space-y-2.5 hidden lg:block">
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting || loadingMaster}
              onClick={() => handleSave(true)}
              className="w-full justify-center py-3 text-sm font-bold shadow-sm"
              icon={<Send className="w-4 h-4" />}
            >
              {isSubmitting ? 'Memproses Pengajuan...' : 'Lanjutkan ke Berkas'}
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

      {/* Floating Bottom Action Bar on Mobile/Tablet (Never scroll all the way down!) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3.5 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-500 font-medium block">Total Tarif PNBP</span>
          <span className="text-sm font-black text-slate-900 tabular-nums">
            {selectedService ? formatRupiah(selectedService.base_fee) : 'Rp 0'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
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
            className="text-xs font-bold px-4"
            icon={<Send className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Memproses...' : 'Lanjutkan'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewRegistrationPage;
