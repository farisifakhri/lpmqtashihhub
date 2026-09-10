import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.jpg';
import quran3dImg from '@/assets/quran-3d.jpg';

export const LoginPage = () => {
  const { login, isLoading, authError, seedAccounts } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Harap masukkan email dan kata sandi.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      const isPublisher = res.user.roles?.includes('ADMIN_PENERBIT') || res.user.role === 'ADMIN_PENERBIT';
      navigate(isPublisher ? '/publisher' : '/internal');
    } else {
      setError(res.error || 'Autentikasi gagal. Periksa email atau kata sandi Anda.');
    }
  };

  const handleQuickLogin = async (acc) => {
    setEmail(acc.email);
    setPassword('password123');
    setError('');

    const res = await login(acc.email, 'password123');
    if (res.success) {
      navigate(acc.portalPath);
    } else {
      setError(res.error || `Gagal login dengan akun ${acc.label}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] rounded-full bg-amber-100/40 blur-2xl pointer-events-none" />

      {/* Main Glass Card Container (Sesuai Referensi Gambar) */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-[32px] sm:rounded-[38px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.08)] border border-white/80 p-3.5 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* SISI KIRI: Ilustrasi Animasi 3D Quran (Frame Melengkung Halus) */}
          <div className="lg:col-span-6 relative rounded-[26px] sm:rounded-[30px] overflow-hidden bg-gradient-to-b from-[#E2F0EA] to-[#D0E6DC] flex flex-col justify-between shadow-inner min-h-[380px] sm:min-h-[480px] lg:min-h-[590px]">
            {/* Gambar 3D Quran */}
            <img
              src={quran3dImg}
              alt="Ilustrasi Pentashihan Al-Qur'an 3D"
              className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
            />

            {/* Badge Kemenag Overlay Atas */}
            <div className="relative z-10 p-5 sm:p-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-primary-700" />
                <span className="text-xs font-bold tracking-wide text-neutral-800">
                  LPMQ Kemenag RI
                </span>
              </div>
            </div>

            {/* Caption Glassmorphism Bawah */}
            <div className="relative z-10 p-5 sm:p-6 bg-gradient-to-t from-neutral-900/60 via-neutral-900/20 to-transparent pt-12">
              <div className="backdrop-blur-sm bg-white/20 p-4 rounded-2xl border border-white/30 text-white shadow-sm">
                <p className="text-xs font-semibold text-emerald-100 flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                  Mushaf Standar Indonesia
                </p>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                  Layanan Pentashihan Naskah Al-Qur'an Terpadu & Terverifikasi
                </h3>
              </div>
            </div>
          </div>

          {/* SISI KANAN: Form Login Clean & Modern */}
          <div className="lg:col-span-6 flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-4 lg:px-6">
            
            {/* Header Atas: Navigasi Daftar */}
            <div className="flex justify-end items-center text-xs text-neutral-500 mb-4 sm:mb-6">
              <span>Belum terdaftar?&nbsp;</span>
              <Link
                to="/register"
                className="font-bold text-primary-700 hover:text-primary-800 hover:underline transition-colors"
              >
                Daftar sekarang
              </Link>
            </div>

            {/* Tengah: Logo Clean Putih, Heading & Form Input */}
            <div className="max-w-md w-full mx-auto my-auto space-y-6">
              
              {/* Logo Area (Clean & Latar Putih Sesuai Permintaan User) */}
              <div className="text-center sm:text-left space-y-3">
                <div className="inline-flex items-center gap-3 bg-white py-1">
                  <img
                    src={kemenagLogo}
                    alt="Kementerian Agama RI"
                    className="h-11 w-auto object-contain drop-shadow-xs"
                  />
                  <div className="h-7 w-[1px] bg-neutral-200" />
                  <img
                    src={lpmqLogo}
                    alt="LPMQ"
                    className="h-10 w-auto object-contain rounded-md"
                  />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                    Selamat Datang!
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                    Masuk ke akun Anda untuk memproses pentashihan naskah.
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {(error || authError) && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-status-danger text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error || authError}</span>
                </div>
              )}

              {/* Form Input Clean Minimalis (Sesuai Desain Referensi) */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="sr-only">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan alamat email resmi..."
                    className="w-full px-4 py-3.5 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                    required
                  />
                </div>

                <div className="relative">
                  <label className="sr-only">Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Kata sandi..."
                    className="w-full pl-4 pr-11 py-3.5 text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200/80 rounded-2xl outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-600 transition-all text-neutral-900 placeholder:text-neutral-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end pt-0.5">
                  <span className="text-xs text-neutral-400 hover:text-primary-700 cursor-pointer transition-colors">
                    Lupa kata sandi?
                  </span>
                </div>

                {/* Tombol Masuk / Sign In (Gradien / Bayangan Mewah) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-2xl text-white font-bold text-sm bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-800 hover:to-primary-700 active:scale-[0.99] transition-all shadow-lg shadow-primary-700/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses Autentikasi...
                    </span>
                  ) : (
                    <span>Masuk ke Sistem</span>
                  )}
                </button>
              </form>

              {/* Divider Sesuai Referensi "Or continue with" */}
              <div className="relative my-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200/80" />
                </div>
                <div className="relative inline-block bg-white px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Atau Masuk Cepat Akun Uji Coba (1-Klik)
                </div>
              </div>

              {/* Pilihan Akun Uji Coba Cepat (Grid Sleek) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {seedAccounts.slice(0, 6).map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    disabled={isLoading}
                    title={`${acc.label} (${acc.email})`}
                    className="p-2.5 rounded-xl border border-neutral-200/70 hover:border-primary-500 hover:bg-primary-50/40 active:scale-[0.98] transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="text-[11px] font-bold text-neutral-800 group-hover:text-primary-700 truncate">
                      {acc.label}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                      {acc.email.split('@')[0]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Bawah */}
            <div className="pt-6 text-center text-[11px] text-neutral-400">
              Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama RI
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
