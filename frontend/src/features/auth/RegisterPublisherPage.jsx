import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Building, User, Mail, Lock, Phone, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import kemenagLogo from '@/assets/kemenag.png';
import lpmqLogo from '@/assets/lpmq.jpg';

export const RegisterPublisherPage = () => {
  const { registerPublisher, login, isLoading, authError } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    legal_name: '',
    entity_type: 'PT',
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }

    try {
      const res = await registerPublisher(formData);
      if (res?.success) {
        setSuccess(true);
        // Login otomatis setelah registrasi berhasil
        setTimeout(async () => {
          await login(formData.email, formData.password);
          navigate('/publisher');
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Gagal mendaftarkan penerbit. Silakan periksa kembali formulir Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src={kemenagLogo} alt="Logo Kementerian Agama RI" className="h-12 w-auto object-contain drop-shadow-sm" />
          <img src={lpmqLogo} alt="Logo LPMQ" className="h-12 w-auto rounded-xl object-contain shadow-xs border border-neutral-200" />
        </div>
        <span className="text-xs font-bold tracking-widest text-primary-700 uppercase block mb-1">
          Kementerian Agama RI
        </span>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Pendaftaran Akun Penerbit Mushaf
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Daftarkan badan usaha/badan hukum untuk mengajukan pentashihan naskah Al-Qur'an secara resmi.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <Card className="p-8 shadow-md border-neutral-200">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-primary-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Pendaftaran Berhasil!</h3>
              <p className="text-sm text-neutral-600">
                Akun badan usaha <span className="font-semibold">{formData.legal_name}</span> telah dibuat. Mengarahkan ke Portal Penerbit...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || authError) && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-status-danger text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error || authError}</span>
                </div>
              )}

              {/* Data Badan Usaha */}
              <div className="border-b border-neutral-200 pb-3 mb-3">
                <h2 className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                  1. Identitas Badan Hukum
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Nama Badan Usaha / Penerbit *
                  </label>
                  <div className="relative rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="legal_name"
                      value={formData.legal_name}
                      onChange={handleChange}
                      placeholder="PT Mushaf Berkah Nusantara"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Bentuk Usaha *
                  </label>
                  <select
                    name="entity_type"
                    value={formData.entity_type}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="PT">PT</option>
                    <option value="CV">CV</option>
                    <option value="YAYASAN">Yayasan</option>
                    <option value="PERORANGAN">Perorangan</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Alamat Kantor Penerbit
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Jl. Percetakan Al-Qur'an No. 8, Jakarta"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Data Akun PIC */}
              <div className="border-b border-neutral-200 pb-3 pt-2 mb-3">
                <h2 className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                  2. Akun Penanggung Jawab (PIC)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Nama Lengkap PIC *
                  </label>
                  <div className="relative rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ahmad Fauzan, S.Pd"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Nomor WhatsApp / Telepon
                  </label>
                  <div className="relative rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="081234567890"
                      className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Akun (Digunakan untuk Login) *
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="redaksi@penerbitmushaf.co.id"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Kata Sandi Akun (Min. 8 Karakter) *
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full justify-center py-2.5 text-sm font-semibold"
                >
                  {isLoading ? 'Mendaftarkan Badan Usaha...' : 'Daftar Sebagai Penerbit'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-neutral-600 border-t border-neutral-200 pt-4">
            Sudah memiliki akun terdaftar?{' '}
            <Link to="/login" className="font-semibold text-primary-700 hover:underline">
              Masuk ke Sistem
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPublisherPage;
