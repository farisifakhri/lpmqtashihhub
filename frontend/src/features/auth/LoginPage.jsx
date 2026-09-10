import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.jpg';

export const LoginPage = () => {
  const { login, isLoading, authError, seedAccounts } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(res.error || `Gagal login dengan akun demo ${acc.label}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={kemenagLogo} alt="Logo Kementerian Agama RI" className="h-14 w-auto object-contain drop-shadow-sm" />
          <img src={lpmqLogo} alt="Logo LPMQ" className="h-14 w-auto rounded-xl object-contain shadow-xs border border-neutral-200" />
        </div>
        <span className="text-xs font-bold tracking-widest text-primary-700 uppercase block mb-1">
          Kementerian Agama RI
        </span>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          LPMQ Pentashihan Hub
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sistem Informasi Manajemen Layanan Pentashihan Mushaf Al-Qur'an
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-8 shadow-md border-neutral-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {(error || authError) && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-status-danger text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error || authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Alamat Email Resmi
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@penerbit.co.id atau kemenag.go.id"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Kata Sandi
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full justify-center py-2.5 text-sm font-semibold"
            >
              {isLoading ? 'Memverifikasi Kredensial...' : 'Masuk ke Sistem'}
            </Button>
          </form>

          {/* Quick preset for testing/reviewing */}
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Pilih Akun Uji Coba (1-Klik)
              </span>
              <span className="text-[11px] text-primary-700 font-medium bg-primary-100 px-2 py-0.5 rounded">
                Password: password123
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {seedAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  disabled={isLoading}
                  className="text-left p-2.5 rounded-lg border border-neutral-200 hover:border-primary-500 hover:bg-primary-50/50 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-bold text-neutral-800 group-hover:text-primary-700 flex items-center gap-1.5">
                      <span>{acc.label}</span>
                      <span className="text-[10px] text-neutral-500 font-normal">({acc.desc})</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">{acc.email}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary-700 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-neutral-600">
            Penerbit baru belum terdaftar?{' '}
            <Link to="/register" className="font-semibold text-primary-700 hover:underline">
              Daftarkan Badan Usaha Anda
            </Link>
          </div>
        </Card>

        {/* Info footer */}
        <p className="mt-4 text-center text-xs text-neutral-500">
          Lajnah Pentashihan Mushaf Al-Qur'an &copy; 2026 Kementerian Agama RI
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
