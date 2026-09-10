import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  UserCheck,
} from 'lucide-react';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.jpg';
import quran3dImg from '@/assets/quran-3d.jpg';

export const RegisterPublisherPage = () => {
  const { registerPublisher, login, isLoading, authError } = useAuth();
  const navigate = useNavigate();

  // Mode: 'LEMBAGA' vs 'PERORANGAN'
  const [accountType, setAccountType] = useState('LEMBAGA');

  const [formData, setFormData] = useState({
    legal_name: '',
    entity_type: 'PT',
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Handle Tab Switch: Lembaga vs Perorangan
  const handleAccountTypeChange = (type) => {
    setAccountType(type);
    setError('');
    if (type === 'PERORANGAN') {
      setFormData((prev) => ({
        ...prev,
        entity_type: 'PERORANGAN',
        // Jika nama sudah diisi, samakan legal_name dengan nama pribadi
        legal_name: prev.name || prev.legal_name,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        entity_type: prev.entity_type === 'PERORANGAN' ? 'PT' : prev.entity_type,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Khusus perorangan: jika mengubah nama lengkap pemohon, otomatis legal_name = name
      if (accountType === 'PERORANGAN' && name === 'name') {
        updated.legal_name = value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validasi
    const finalLegalName =
      accountType === 'PERORANGAN' ? formData.name : formData.legal_name;

    if (!finalLegalName || finalLegalName.trim().length < 3) {
      setError(
        accountType === 'PERORANGAN'
          ? 'Nama lengkap pemohon minimal 3 karakter.'
          : 'Nama lembaga / badan usaha minimal 3 karakter.'
      );
      return;
    }

    if (!formData.name || formData.name.trim().length < 3) {
      setError('Nama penanggung jawab / pemohon minimal 3 karakter.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Kata sandi akun minimal 8 karakter.');
      return;
    }

    const payload = {
      ...formData,
      legal_name: finalLegalName,
      entity_type: accountType === 'PERORANGAN' ? 'PERORANGAN' : formData.entity_type,
    };

    try {
      const res = await registerPublisher(payload);
      if (res?.success) {
        setSuccess(true);
        // Login otomatis setelah registrasi berhasil
        setTimeout(async () => {
          await login(formData.email, formData.password);
          navigate('/publisher');
        }, 1500);
      }
    } catch (err) {
      setError(
        err.message || 'Gagal mendaftarkan akun. Silakan periksa kembali kelengkapan formulir Anda.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-[32px] sm:rounded-[38px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.08)] border border-white/80 p-3.5 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* SISI KIRI: Ilustrasi Animasi 3D Quran & Info */}
          <div className="lg:col-span-5 relative rounded-[26px] sm:rounded-[30px] overflow-hidden bg-gradient-to-b from-[#E2F0EA] to-[#D0E6DC] flex flex-col justify-between shadow-inner min-h-[340px] lg:min-h-[640px]">
            <img
              src={quran3dImg}
              alt="Ilustrasi Pentashihan Al-Qur'an 3D"
              className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
            />

            {/* Badge Atas */}
            <div className="relative z-10 p-5 sm:p-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white/60 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-primary-700" />
                <span className="text-xs font-bold tracking-wide text-neutral-800">
                  Registrasi Resmi LPMQ
                </span>
              </div>
            </div>

            {/* Info Box Bawah */}
            <div className="relative z-10 p-5 sm:p-6 bg-gradient-to-t from-neutral-900/70 via-neutral-900/30 to-transparent pt-12">
              <div className="backdrop-blur-sm bg-white/20 p-4 rounded-2xl border border-white/30 text-white shadow-sm space-y-1">
                <p className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                  Keterbukaan Layanan
                </p>
                <h3 className="text-sm font-bold text-white leading-snug">
                  Terbuka untuk Lembaga Penerbit maupun Pemohon Perorangan
                </h3>
                <p className="text-[11px] text-neutral-200 leading-relaxed pt-0.5">
                  Setiap mushaf Al-Qur'an, juz 'amma, surah pilihan, braille, maupun kaligrafi yang akan diedarkan wajib ditashih oleh LPMQ Kemenag RI.
                </p>
              </div>
            </div>
          </div>

          {/* SISI KANAN: Formulir Registrasi Fleksibel (Lembaga & Perorangan) */}
          <div className="lg:col-span-7 flex flex-col justify-between py-2 sm:py-3 px-2 sm:px-4">
            
            {/* Navigasi Atas */}
            <div className="flex justify-end items-center text-xs text-neutral-500 mb-3 sm:mb-4">
              <span>Sudah memiliki akun?&nbsp;</span>
              <Link
                to="/login"
                className="font-bold text-primary-700 hover:text-primary-800 hover:underline transition-colors"
              >
                Masuk sekarang
              </Link>
            </div>

            <div className="max-w-xl w-full mx-auto space-y-4">
              
              {/* Header & Logo Clean Putih */}
              <div>
                <div className="inline-flex items-center gap-3 bg-white py-1 mb-2">
                  <img
                    src={kemenagLogo}
                    alt="Kementerian Agama RI"
                    className="h-9 w-auto object-contain drop-shadow-xs"
                  />
                  <div className="h-6 w-[1px] bg-neutral-200" />
                  <img
                    src={lpmqLogo}
                    alt="LPMQ"
                    className="h-8 w-auto object-contain rounded-md"
                  />
                </div>

                <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                  Pendaftaran Akun Pemohon
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pilih kategori pendaftar untuk pembuatan akun pentashihan resmi.
                </p>
              </div>

              {/* Segmented Switcher: Lembaga vs Perorangan */}
              <div className="p-1 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('LEMBAGA')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    accountType === 'LEMBAGA'
                      ? 'bg-white text-primary-800 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Lembaga / Badan Usaha</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('PERORANGAN')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    accountType === 'PERORANGAN'
                      ? 'bg-white text-primary-800 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Perorangan / Mandiri</span>
                </button>
              </div>

              {/* Success / Error Message */}
              {success ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-primary-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">Pendaftaran Berhasil!</h3>
                  <p className="text-xs text-neutral-600">
                    Akun pemohon <strong>{formData.legal_name || formData.name}</strong> berhasil dibuat. Mengalihkan ke Portal Pentashihan...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {(error || authError) && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-status-danger text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error || authError}</span>
                    </div>
                  )}

                  {/* FORM KHUSUS PERORANGAN */}
                  {accountType === 'PERORANGAN' ? (
                    <>
                      <div className="p-3 rounded-2xl bg-primary-50/60 border border-primary-100 text-xs text-primary-800 leading-relaxed">
                        <span className="font-bold">Mode Perorangan:</span> Cocok untuk kaligrafer, penulis naskah, penghafal Al-Qur'an, penerjemah mandiri, atau individu pemohon tashih pribadi tanpa badan hukum PT/CV.
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Nama Lengkap Pemohon (Sesuai KTP) *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Contoh: Muhammad Ilham Pratama, S.Hum"
                            className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Nomor WhatsApp / HP Aktif *
                          </label>
                          <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="081234567890"
                            className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Alamat Domisili / KTP
                          </label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Kota / Kabupaten domisili"
                            className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* FORM KHUSUS LEMBAGA / BADAN USAHA */
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Nama Lembaga / Penerbit *
                          </label>
                          <input
                            type="text"
                            name="legal_name"
                            value={formData.legal_name}
                            onChange={handleChange}
                            placeholder="PT Mushaf Berkah Nusantara"
                            className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Bentuk Usaha *
                          </label>
                          <select
                            name="entity_type"
                            value={formData.entity_type}
                            onChange={handleChange}
                            className="w-full px-3 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 cursor-pointer"
                          >
                            <option value="PT">PT</option>
                            <option value="CV">CV</option>
                            <option value="YAYASAN">Yayasan / Pesantren</option>
                            <option value="LAINNYA">Lembaga Lainnya</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Nama Penanggung Jawab (PIC) *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ahmad Fauzan, S.Pd"
                            className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                            Nomor WhatsApp / Kantor
                          </label>
                          <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="081234567890"
                            className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                          Alamat Kantor / Sekretariat
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="Jl. Percetakan Mushaf No. 12, Jakarta"
                          className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                        />
                      </div>
                    </>
                  )}

                  {/* KREDENSIAL AKUN LOGIN (BERLAKU UNTUK KEDUA TIPE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Email Akun (Untuk Login) *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="nama@email.com"
                        className="w-full px-4 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                        required
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                        Kata Sandi (Min. 8 Karakter) *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-11 py-3 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 top-5 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Tombol Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-800 hover:to-primary-700 active:scale-[0.99] transition-all shadow-lg shadow-primary-700/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                      {isLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Mendaftarkan Akun...
                        </span>
                      ) : (
                        <span>
                          Daftar Sebagai {accountType === 'PERORANGAN' ? 'Pemohon Perorangan' : 'Lembaga Penerbit'}
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>

            {/* Footer Bawah */}
            <div className="pt-4 text-center text-[11px] text-neutral-400">
              Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama RI
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPublisherPage;
