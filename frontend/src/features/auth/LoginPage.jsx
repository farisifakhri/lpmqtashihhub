import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, ShieldCheck, Sparkles, LockKeyhole, ArrowRight } from 'lucide-react';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.png';
import quran3dImg from '@/assets/quran-3d.jpg';

export const LoginPage = () => {
  const { login, isLoading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      const defaultTarget = isPublisher ? '/publisher' : '/internal';
      const redirectTarget = location.state?.from?.pathname || defaultTarget;
      navigate(redirectTarget, { replace: true });
    } else {
      setError(res.error || 'Autentikasi gagal. Periksa email atau kata sandi Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F5] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] rounded-full bg-brand-100/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand-100/30 blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] rounded-full bg-civic-warningSoft/40 blur-2xl pointer-events-none" />

      {/* Main Glass Card Container (Sesuai Desain yang Sudah Diapprove Stakeholder) */}
      <div className="relative z-10 w-full max-w-6xl bg-white rounded-2xl shadow-[0_24px_80px_-24px_rgba(8,50,36,0.24)] border border-line p-2 sm:p-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch">
          
          {/* SISI KIRI: Ilustrasi Animasi 3D Quran (Frame Melengkung Halus) */}
          <div className="lg:col-span-6 relative rounded-xl overflow-hidden bg-brand-950 flex flex-col justify-between min-h-[320px] sm:min-h-[440px] lg:min-h-[610px]">
            {/* Gambar 3D Quran */}
            <img
              src={quran3dImg}
              alt="Ilustrasi Pentashihan Al-Qur'an 3D"
              className="absolute inset-0 w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700 ease-out"
            />

            {/* Badge Kemenag Overlay Atas */}
            <div className="relative z-10 p-5 sm:p-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/60 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-brand-700" />
                <span className="text-xs font-bold tracking-wide text-ink">
                  Lajnah Pentashihan Mushaf Quran RI
                </span>
              </div>
            </div>

            {/* Caption Glassmorphism Bawah */}
            <div className="relative z-10 p-5 sm:p-5 bg-gradient-to-t from-ink/60 via-ink/20 to-transparent pt-12">
              <div className="bg-brand-700/50 backdrop-blur-sm p-4 rounded-2xl border border-white/30 text-white shadow-sm">
                <p className="text-xs font-semibold text-brand-100 flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-civicGold-700" />
                  SIPNA (Sistem Informasi Pentashih Mushaf Quran)
                </p>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                  Sistem Informasi Pentashihan Naskah Al-Qur'an (SIPNA) - LPMQ Kementerian Agama RI
                </h3>
              </div>
            </div>
          </div>

          {/* SISI KANAN: Form Login Clean & Modern */}
          <div className="lg:col-span-6 flex flex-col justify-between px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
            
            {/* Header Atas: Navigasi Daftar */}
            <div className="flex justify-end items-center text-xs text-ink-muted mb-8">
              <span>Belum terdaftar?&nbsp;</span>
              <Link
                to="/register"
                className="font-bold text-brand-700 hover:text-brand-800 hover:underline transition-colors"
              >
                Registrasi penerbit
              </Link>
            </div>

            {/* Tengah: Logo Clean Putih, Heading & Form Input */}
            <div className="max-w-md w-full mx-auto my-auto space-y-7">
              
              {/* Logo Area (Clean & Latar Putih Sesuai Permintaan User) */}
              <div className="text-center sm:text-left space-y-3">
                <div className="inline-flex items-center gap-4 bg-white py-1">
                  <img
                    src={kemenagLogo}
                    alt="Kementerian Agama RI"
                    className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm"
                  />
                  <div className="h-9 w-[1px] bg-surface-strong" />
                  <img
                    src={lpmqLogo}
                    alt="LPMQ"
                    className="h-12 sm:h-14 w-auto object-contain rounded-lg shadow-2xs"
                  />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                    Akses Sistem Pentashihan
                  </h1>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1">
                    Gunakan akun resmi untuk mengakses layanan pengajuan, verifikasi, dan pengendalian proses.
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {(error || authError) && (
                <div className="p-3.5 rounded-2xl bg-civic-dangerSoft border border-civic-dangerLine text-civic-danger text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error || authError}</span>
                </div>
              )}

              {/* Form Input Clean Minimalis */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-2 block text-xs font-bold text-ink">Alamat email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@instansi.go.id"
                    autoComplete="email"
                    className="w-full px-4 py-3 text-sm bg-canvas focus:bg-white border border-line-strong rounded-lg outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-700 transition-all text-ink placeholder:text-ink-muted"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-xs font-bold text-ink">Kata sandi</label>
                  <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    className="w-full pl-4 pr-11 py-3 text-sm bg-canvas focus:bg-white border border-line-strong rounded-lg outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-700 transition-all text-ink placeholder:text-ink-muted"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-ink-muted hover:text-ink-muted transition-colors"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  </div>
                </div>

                <div className="flex justify-end pt-0.5">
                  <span className="text-xs text-ink-muted">Hubungi administrator apabila akses terkunci.</span>
                </div>

                {/* Tombol Masuk / Sign In (Gradien / Bayangan Mewah) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-lg text-white font-bold text-sm bg-brand-700 hover:bg-brand-800 active:scale-[0.99] transition-all shadow-md shadow-brand-900/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memvalidasi kredensial...
                    </span>
                  ) : (
                    <><LockKeyhole className="h-4 w-4" /><span>Masuk ke Sistem</span><ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </form>
            </div>

            {/* Footer Bawah */}
            <div className="pt-6 text-center text-[11px] text-ink-muted">
              Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama RI
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
