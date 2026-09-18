import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('ACTION_REQUIRED'); // 'ACTION_REQUIRED' | 'INFO'
  const dropdownRef = useRef(null);
  const { currentUser } = useAuth();

  const role = currentUser?.role || '';
  const isPublisher = role === 'ADMIN_PENERBIT' || currentUser?.roles?.includes('ADMIN_PENERBIT');

  // Sample operational notifications based on user context
  const actionRequiredNotifications = isPublisher
    ? [
        {
          id: 'notif-1',
          title: 'Perbaikan Berkas Sampel',
          desc: 'Naskah REG-2026-004 memerlukan revisi halaman 1-5 dan surat permohonan.',
          time: '30 menit yang lalu',
          link: '/publisher/registrations',
          badge: 'Tindakan',
        },
        {
          id: 'notif-2',
          title: 'Tagihan SIMPONI Menunggu Pembayaran',
          desc: 'Kode billing naskah REG-2026-002 aktif. Berlaku hingga 7 hari kalender.',
          time: '2 jam yang lalu',
          link: '/publisher/billing',
          badge: 'Bayar',
        },
      ]
    : [
        {
          id: 'notif-in-1',
          title: 'Penugasan Verifikator Baru',
          desc: 'Naskah REG-2026-001 dari PT Mushaf Nusantara siap ditugaskan verifikator.',
          time: '15 menit yang lalu',
          link: '/internal/verifications?tab=NEED_ASSIGNMENT',
          badge: 'Penugasan',
        },
        {
          id: 'notif-in-2',
          title: 'Verifikasi Pembayaran Masuk',
          desc: 'Bukti setor NTPN naskah REG-2026-003 telah diunggah penerbit.',
          time: '1 jam yang lalu',
          link: '/internal/payments',
          badge: 'Validasi',
        },
      ];

  const infoNotifications = [
    {
      id: 'notif-info-1',
      title: 'Pemeliharaan Terjadwal Selesai',
      desc: 'Sistem integrasi SIMPONI dan repositori berkas beroperasi normal.',
      time: 'Kemarin',
    },
    {
      id: 'notif-info-2',
      title: 'Pembaruan Panduan SOP v2.2',
      desc: 'Ketentuan batas waktu verifikasi berkas 2 hari kerja telah diberlakukan otomatis.',
      time: '3 hari yang lalu',
    },
  ];

  const currentItems = tab === 'ACTION_REQUIRED' ? actionRequiredNotifications : infoNotifications;
  const unreadCount = actionRequiredNotifications.length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-ink-muted hover:text-brand-900 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer"
        aria-label={`Pemberitahuan, ${unreadCount} perlu tindakan`}
        title="Pemberitahuan"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-xl shadow-xl border border-line py-2 z-50 animate-slideUp">
          {/* Header */}
          <div className="px-4 py-2 border-b border-line flex items-center justify-between">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              Pemberitahuan
            </h3>
            <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
              {unreadCount} Perlu Tindakan
            </span>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1.5 mx-2 my-1.5 bg-surface-subtle rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab('ACTION_REQUIRED')}
              className={clsx(
                'py-1.5 rounded-md transition-colors text-center',
                tab === 'ACTION_REQUIRED'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              Perlu Tindakan ({actionRequiredNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('INFO')}
              className={clsx(
                'py-1.5 rounded-md transition-colors text-center',
                tab === 'INFO'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              Informasi ({infoNotifications.length})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-72 overflow-y-auto px-2 py-1 space-y-1">
            {currentItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-muted">
                Tidak ada pemberitahuan pada kategori ini.
              </div>
            ) : (
              currentItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-line/60 hover:bg-surface-subtle transition-colors text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink truncate">{item.title}</span>
                    <span className="text-[10px] text-ink-muted shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed">{item.desc}</p>
                  {item.link && (
                    <div className="pt-1">
                      <Link
                        to={item.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        <span>Buka Pekerjaan</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

