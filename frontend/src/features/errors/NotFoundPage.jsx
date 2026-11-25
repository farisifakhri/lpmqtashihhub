import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchX, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-line shadow-lg p-8 sm:p-10 text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-surface-subtle border-2 border-line flex items-center justify-center text-ink-muted">
          <SearchX className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Error 404 - Halaman Tidak Ditemukan</p>
          <h1 className="text-2xl sm:text-3xl font-black text-ink">Halaman yang Anda cari tidak tersedia</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Periksa kembali alamat halaman atau gunakan menu navigasi untuk melanjutkan.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full justify-center" icon={<Home className="w-4 h-4" />}>
              Kembali ke Beranda
            </Button>
          </Link>
          <Button variant="outline" size="md" className="w-full sm:w-auto justify-center" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>
            Halaman Sebelumnya
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
