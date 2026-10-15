import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ShieldCheck, LockKeyhole, ArrowRight, ArrowLeft, Sun, Moon } from 'lucide-react';
import kemenagLogo from '@/assets/kemenag1.png';
import lpmqLogo from '@/assets/logo-lpmq1.png';
import quran3dImg from '@/assets/quran-3d.jpg';
import Switcher from '../darkmode/Switcher';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const LoginPage = () => {
  const { login, isLoading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Harap masukkan email dan kata sandi.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      const isPublisher = res.user.roles?.includes('PENERBIT') || res.user.role === 'PENERBIT';
      const defaultTarget = isPublisher ? '/publisher' : '/internal';
      const redirectTarget = location.state?.from?.pathname || defaultTarget;
      navigate(redirectTarget, { replace: true });
    } else {
      setError(res.error || 'Autentikasi gagal. Periksa email atau kata sandi Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-3 sm:p-4">
      {/* Tombol Navigasi Kembali ke Landing Page */}
      <div className="w-full max-w-4xl mb-2.5 flex items-center justify-start">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-muted hover:text-ink bg-surface border border-line shadow-2xs hover:border-brand-600/30 hover:bg-surface-subtle transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand-fg transition-transform group-hover:-translate-x-0.5" />
          <span>Kembali</span>
        </Link>
      </div>

      {/* Main Container - Compact and responsive on 100% zoom */}
      <div className="w-full max-w-4xl bg-surface rounded-2xl shadow-sm border border-line p-2 sm:p-2.5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch">
          
          {/* SISI KIRI: Ilustrasi Quran Sleek & Kompak */}
          <div className="hidden lg:col-span-5 relative rounded-xl overflow-hidden bg-brand-950 lg:flex flex-col justify-between min-h-[420px] max-h-[500px]">
            {/* Gambar 3D Quran */}
            <img
              src={quran3dImg}
              alt="Ilustrasi Pentashihan Al-Qur'an 3D"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75" />

            {/* Badge Kemenag Overlay Atas */}
            <div className="relative z-10 p-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/95 border border-line shadow-2xs backdrop-blur">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-bold tracking-wide text-ink">
                  LPMQ Kemenag RI
                </span>
              </div>
            </div>

            {/* Caption Bawah - Glassmorphism Elegan & Bersih */}
            <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8">
              <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-xl border border-white/15 text-white shadow-2xs">
                <p className="text-[11px] font-bold text-brand-fg mb-0.5">
                  SIPNA (Sistem Informasi Pentashih Mushaf Quran)
                </p>
                <h3 className="text-xs font-semibold text-white/90 leading-snug">
                  Lajnah Pentashihan Mushaf Quran RI
                </h3>
              </div>
            </div>
          </div>

          {/* SISI KANAN: Form Login Compact & Proporsional */}
          <div className="lg:col-span-7 flex flex-col justify-between p-5 sm:p-6 lg:p-7">
            
            {/* Header Atas: Navigasi Daftar */}
            <div className="flex justify-between items-center gap-3 text-xs text-ink-muted mb-4">
              <Switcher />
              <div>
                <span>Belum terdaftar?&nbsp;</span>
                <Link
                  to="/register"
                  className="font-bold text-brand-fg hover:text-brand-fill-hover hover:underline transition-colors"
                >
                  Registrasi penerbit
                </Link>
              </div>
            </div>

            {/* Tengah: Logo, Heading & Form Input */}
            <div className="max-w-sm w-full mx-auto my-auto space-y-4">
              
              {/* Logo Area */}
              <div className="text-center sm:text-left space-y-2">
                <div className="inline-flex items-center gap-3 py-0.5">
                  <img
                    src={kemenagLogo}
                    alt="Kementerian Agama RI"
                    className="h-10 w-auto object-contain"
                  />
                  <div className="h-7 w-[1px] bg-line" />
                  <img
                    src={lpmqLogo}
                    alt="LPMQ"
                    className="h-9 w-auto object-contain rounded"
                  />
                </div>

                <div>
                  <h1 className="text-xl font-extrabold text-ink tracking-tight">
                    Akses Sistem Pentashihan
                  </h1>
                  <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                    Gunakan akun resmi untuk mengakses layanan pentashihan mushaf Al-Qur'an.
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {(error || authError) && (
                <div className="p-3 rounded-xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error || authError}</span>
                </div>
              )}

              {/* Form Input Clean Minimalis */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-bold text-ink">
                    Alamat email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@instansi.go.id"
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-lg outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-bold text-ink">
                    Kata sandi
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      autoComplete="current-password"
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-canvas focus:bg-surface border border-line-strong rounded-lg outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-fg transition-all text-ink placeholder:text-ink-muted"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-muted hover:text-ink transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-semibold text-brand-fg hover:text-brand-fill-hover hover:underline transition-colors cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                  <span className="text-xs text-ink-muted">Bantuan loket</span>
                </div>

                {/* Tombol Masuk Hijau Muda Segar */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-5 rounded-lg text-white font-bold text-xs sm:text-sm bg-brand-fill hover:bg-brand-fill-hover active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memvalidasi...
                    </span>
                  ) : (
                    <>
                      <LockKeyhole className="h-4 w-4" />
                      <span>Masuk ke Sistem</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footer Bawah */}
            <div className="pt-3 text-center text-[11px] text-ink-muted">
              Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama RI
            </div>
          </div>
        </div>
      </div>

      {/* Modal Lupa Kata Sandi */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </div>
  );
};

export default LoginPage;
