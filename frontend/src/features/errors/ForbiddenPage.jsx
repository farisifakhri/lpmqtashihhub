import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldX, Home, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';

/**
 * Halaman 403 Forbidden Khusus LPMQ Kemenag RI
 * Ditampilkan saat pengguna mencoba mengakses rute atau berkas yang tidak sesuai hak akses/role-nya.
 */
export const ForbiddenPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isPublisher = userRoles.includes('PENERBIT') || currentUser?.role === 'PENERBIT';
  const dashboardPath = isPublisher ? '/publisher' : '/internal';

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-line shadow-lg p-8 sm:p-10 text-center space-y-6">
        {/* Shield Danger Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-civic-dangerSoft border-2 border-civic-dangerLine flex items-center justify-center text-civic-danger">
          <ShieldX className="w-10 h-10" />
        </div>

        {/* Kop Singkat */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-civic-danger uppercase tracking-widest">
            Error 403 — Akses Ditolak
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-ink">
            Akses Terbatas &amp; Dilindungi
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed max-w-md mx-auto pt-1">
            Anda tidak memiliki izin kedinasan atau hak akses yang memadai untuk membuka halaman atau modul ini.
          </p>
        </div>

        {/* Informasi Bantuan */}
        <div className="bg-canvas rounded-xl p-4 border border-line text-left text-xs text-ink-muted space-y-2">
          <p className="font-bold text-ink">Mengapa halaman ini muncul?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Akun Anda tidak memiliki role yang diwajibkan untuk modul ini.</li>
            <li>Dokumen atau menu yang Anda akses hanya diperuntukkan bagi verifikator atau penandatangan resmi LPMQ.</li>
            <li>Sesi otentikasi Anda mungkin telah dialihkan ke portal yang berbeda.</li>
          </ul>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {currentUser && (
            <Link to={dashboardPath} className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center"
                icon={<LayoutDashboard className="w-4 h-4" />}
              >
                Ke Dashboard Saya
              </Button>
            </Link>
          )}

          <Link to="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              className="w-full justify-center"
              icon={<Home className="w-4 h-4" />}
            >
              Kembali ke Beranda
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Halaman Sebelumnya
          </Button>
        </div>

        {/* Footer Brand */}
        <div className="pt-4 border-t border-line">
          <p className="text-xs text-ink-muted">
            Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ) &copy; 2026 Kementerian Agama RI
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
