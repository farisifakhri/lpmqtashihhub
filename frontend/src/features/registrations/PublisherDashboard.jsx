import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  BookOpen,
  AlertCircle,
  Award,
  Clock,
  FileText,
  CreditCard,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { registrationApi } from '@/api/registration.api';
import { Button } from '@/components/ui/Button';
import { GreetingHeroCard } from '@/components/dashboard/GreetingHeroCard';
import { DailyQuranWidget } from '@/components/dashboard/DailyQuranWidget';
import { PrimaryTaskCard } from '@/components/ui/PrimaryTaskCard';
import { PublisherRegistrationCard } from './PublisherRegistrationCard';
import { ACTION_STATUSES, publisherAction } from './publisher-status';

export const PublisherDashboard = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [recent, actions] = await Promise.all([
        registrationApi.listRegistrations({ page: 1, limit: 6 }),
        registrationApi.listRegistrations({ page: 1, limit: 5, segment: 'PUBLISHER_ACTIONS' }),
      ]);
      if (request === requestId.current) setData({ recent, actions });
    } catch (err) {
      if (request === requestId.current) setError(err.message || 'Dashboard tidak dapat dimuat. Coba kembali.');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
    load();
    return () => {
      requestId.current += 1;
    };
  }, [currentUser?.id]);

  const counts = data?.recent.summary?.by_status;
  const total = data?.recent.pagination?.total;
  const actionCount = counts
    ? ACTION_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0)
    : data?.actions.pagination?.total;
  const processing = counts
    ? Object.entries(counts).reduce(
        (sum, [status, count]) =>
          sum + (!ACTION_STATUSES.includes(status) && !['COMPLETED', 'CANCELLED'].includes(status) ? count : 0),
        0
      )
    : null;

  const metrics = [
    {
      label: 'Total permohonan',
      value: total,
      icon: BookOpen,
      iconColor: 'text-ink',
      bgColor: 'bg-surface-subtle',
      path: '/publisher/registrations',
    },
    {
      label: 'Perlu tindakan',
      value: actionCount,
      icon: AlertCircle,
      iconColor: 'text-civic-warning',
      bgColor: 'bg-civic-warningSoft',
      path: '/publisher/registrations?view=actions',
    },
    {
      label: 'Sedang diproses',
      value: processing,
      icon: Clock,
      iconColor: 'text-civic-info',
      bgColor: 'bg-civic-infoSoft',
      path: '/publisher/registrations?view=processing',
    },
    {
      label: 'STT Terbit',
      value: data?.recent.summary?.issued_stt,
      icon: Award,
      iconColor: 'text-brand-800',
      bgColor: 'bg-brand-100',
      path: '/publisher/documents',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-16 animate-fadeIn">
      {/* 1. Header with Live Digital Clock & Quran Verse Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GreetingHeroCard
            role="publisher"
            userName={currentUser?.publisherName || currentUser?.name}
          />
        </div>
        <div className="lg:col-span-1">
          <DailyQuranWidget />
        </div>
      </div>

      {/* Action Bar & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">
            Ringkasan seluruh permohonan surat tanda tashih Mushaf Al-Quran
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/publisher/new-registration"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Permohonan Baru
          </Link>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={load}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Muat ulang
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-civic-dangerLine bg-civic-dangerSoft p-4 text-xs font-semibold text-civic-danger flex items-center justify-between"
        >
          <span>{error} Gunakan Muat ulang untuk mencoba kembali.</span>
        </div>
      )}

      {/* 2. Metric Overview Cards (Semantic Government Surfaces) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map(({ label, value, icon: Icon, iconColor, bgColor, path }) => (
          <Link
            key={label}
            to={path}
            className="rounded-xl border border-line bg-white p-4 sm:p-5 hover:border-brand-700/60 hover:shadow-xs transition-all shadow-2xs group"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${bgColor} ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-line-strong group-hover:text-brand-700 transition-colors" />
            </div>
            <p className="mt-3 text-xs font-semibold text-ink-muted">{label}</p>
            <p className="mt-1 text-2xl font-black text-ink">
              {loading || error ? '—' : value ?? '—'}
            </p>
          </Link>
        ))}
      </div>

      {/* 3. Task Oriented Section: "Perlu Tindakan" */}
      <section
        role="region"
        aria-label="Perlu tindakan"
        aria-labelledby="publisher-actions-title"
        className="rounded-xl border border-civic-warningLine bg-civic-warningSoft/40 p-5 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-civic-warningLine/70 pb-3">
          <div>
            <h2 id="publisher-actions-title" className="flex items-center gap-2 text-base font-bold text-ink">
              <AlertCircle className="h-5 w-5 text-civic-warning" />
              Perlu tindakan
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Langkah perbaikan atau pembayaran yang menunggu tindak lanjut Anda saat ini.
            </p>
          </div>
          <Link
            to="/publisher/registrations?view=actions"
            className="text-xs font-bold text-brand-800 hover:underline inline-flex items-center gap-1"
          >
            Lihat semua tindakan
            <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <p role="status" className="py-4 text-xs text-ink-muted">
            Memuat pengajuan…
          </p>
        ) : !error && (
          <div className="space-y-3">
            {data?.actions.data?.length ? (
              data.actions.data.map((registration) => {
                const action = publisherAction(registration);
                if (!action) return null;
                return (
                  <article
                    key={registration.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-civic-warningLine bg-white p-4 shadow-2xs hover:border-civic-warningLine transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-ink bg-surface-subtle px-2 py-0.5 rounded border border-line">
                          {registration.registration_no}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-civic-warningSoft text-civic-warning">
                          {registration.status === 'REVISION_REQUIRED' ? 'Perlu Perbaikan' : 'Menunggu Tindakan'}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-ink break-words">
                        {registration.title}
                      </h3>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        {action.description}
                      </p>
                    </div>

                    <Link
                      to={action.path}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-800 hover:bg-brand-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
                    >
                      {action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl bg-white p-4 text-xs font-medium text-brand-900 border border-brand-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
                <span>
                  Tidak ada tindakan yang tertunda. Progres naskah tetap bisa dipantau di bawah.
                </span>
              </div>
            )}

            {data?.actions.pagination?.total > 5 && (
              <p className="text-xs text-ink-muted pt-1">
                Menampilkan 5 dari {data.actions.pagination.total} permohonan yang perlu tindakan.
              </p>
            )}
          </div>
        )}
      </section>

      {/* 4. Recent Registrations Section */}
      <section aria-labelledby="publisher-recent-title" className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 id="publisher-recent-title" className="text-base font-bold text-ink">
              Permohonan terbaru
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Urut permohonan terbaru. Antrean kerja FIFO dikelola tim internal LPMQ.
            </p>
          </div>
          <Link
            to="/publisher/registrations"
            className="text-xs font-bold text-brand-800 hover:underline inline-flex items-center gap-1"
          >
            Semua permohonan
            <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>

        {!loading && !error && (
          data?.recent.data?.length ? (
            <div className="grid md:grid-cols-2 gap-4">
              {data.recent.data.map((registration) => (
                <PublisherRegistrationCard key={registration.id} registration={registration} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-white p-8 text-center space-y-3 shadow-2xs">
              <BookOpen className="h-9 w-9 text-brand-700 mx-auto stroke-1" />
              <h3 className="font-bold text-ink text-sm">Belum ada permohonan</h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                Mulai dengan memilih layanan dan membuat draf naskah pertama Anda.
              </p>
              <Link
                to="/publisher/new-registration"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-800 text-white font-bold text-xs shadow-xs hover:bg-brand-900 transition-colors"
              >
                Buat permohonan pertama
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
          )
        )}
      </section>

      {/* 5. Quick Links: Billing & Documents */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            title: 'Tagihan & bukti bayar',
            desc: 'Periksa kode billing SIMPONI dan konfirmasi pembayaran.',
            path: '/publisher/billing',
            icon: CreditCard,
          },
          {
            title: 'Arsip Surat Tanda Tashih',
            desc: 'Akses Surat Tanda Tashih (STT) resmi yang telah diterbitkan untuk naskah Anda.',
            path: '/publisher/documents',
            icon: FileText,
          },
        ].map(({ title, desc, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className="flex gap-4 items-center rounded-xl border border-line p-5 bg-white hover:border-brand-700/60 hover:shadow-xs transition-all shadow-2xs group"
          >
            <div className="p-3 rounded-lg bg-brand-50 text-brand-800 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-ink">{title}</h3>
              <p className="text-[11px] text-ink-muted mt-0.5">{desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-brand-800 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default PublisherDashboard;
