import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PlusCircle, CreditCard, Clock, CheckCircle2, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { registrationApi } from '@/api/registration.api';
import { useAuth } from '@/features/auth/AuthContext';

export const PublisherDashboard = () => {
  const { currentUser } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await registrationApi.listRegistrations();
      if (res?.data) {
        setRegistrations(res.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data pengajuan dari server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [currentUser]);

  // Kalkulasi metrik ringkasan dari data riil
  const inProgressCount = registrations.filter((r) =>
    ['READY_FOR_VERIFICATION', 'IN_VERIFICATION', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(r.status)
  ).length;

  const completedCount = registrations.filter((r) =>
    ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(r.status)
  ).length;

  const totalBilling = registrations.reduce((sum, r) => {
    const fee = r.fee_sla_snapshot?.base_fee || r.service_type?.base_fee || 0;
    return sum + Number(fee);
  }, 0);

  const formatRupiah = (val) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-100 text-primary-700">
              Penerbit Terdaftar
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              {currentUser?.publisherName || currentUser?.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">
            Portal Penerbit Mushaf Al-Qur'an
          </h1>
          <p className="text-sm text-neutral-500">
            Pantau status pentashihan naskah, konfirmasi pembayaran PNBP, dan unduh dokumen resmi LPMQ.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRegistrations}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Segarkan Data
          </Button>
          <Link to="/publisher/new-registration">
            <Button icon={<PlusCircle className="w-4 h-4" />}>
              Ajukan Pentashihan Naskah
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-status-danger text-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Info Koneksi API: </span>
              {error}. Menampilkan data lokal jika ada.
            </div>
          </div>
          <button
            onClick={fetchRegistrations}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Ringkasan & Billing Card (Sesuai DESIGN.md: Latar emas muda, nominal besar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card variant="billing" className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gold-700">
              Billing PNBP Terdaftar
            </span>
            <CreditCard className="w-5 h-5 text-gold-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900 tabular-nums">
              {formatRupiah(totalBilling)}
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Dari <span className="font-semibold">{registrations.length}</span> pengajuan naskah
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gold-400/30 flex items-center justify-between text-xs">
            <span className="text-neutral-600">Simulasi & Penagihan SIMPONI</span>
            <Link to="/publisher/billing" className="text-primary-700 font-medium hover:underline">
              Rincian PNBP &rarr;
            </Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Sedang Diproses / Ditashih
            </span>
            <Clock className="w-5 h-5 text-primary-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900">{inProgressCount} Naskah</div>
            <p className="text-xs text-neutral-500 mt-1">
              Dalam verifikasi administrasi & sidang pentashihan
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
            Diproses sesuai SLA hari kerja SKB 3 Menteri
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Surat Tanda Tashih Terbit
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900">{completedCount} Dokumen</div>
            <p className="text-xs text-neutral-500 mt-1">
              Dokumen resmi terbit & bersertifikat
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs">
            <Link to="/publisher/documents" className="text-primary-700 font-medium hover:underline">
              Buka Arsip Surat Tashih &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Tabel Pengajuan Terbaru */}
      <Card
        title="Daftar Pengajuan Mushaf Terbaru"
        subtitle={`Sinkronisasi real-time dengan Basis Data LPMQ (${registrations.length} Pengajuan)`}
      >
        {loading ? (
          <div className="py-12 text-center text-neutral-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-700" />
            <p className="text-xs">Memuat daftar pengajuan naskah...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-12 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800">Belum Ada Pengajuan Naskah</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Mulai daftarkan naskah mushaf Al-Qur'an perdana Anda untuk proses verifikasi dan pentashihan resmi LPMQ.
            </p>
            <Link to="/publisher/new-registration">
              <Button size="sm" icon={<PlusCircle className="w-3.5 h-3.5" />}>
                Buat Pengajuan Baru
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Nomor & Tanggal</th>
                  <th className="py-3 px-6">Judul Naskah Mushaf</th>
                  <th className="py-3 px-6">Jenis Layanan</th>
                  <th className="py-3 px-6">Tarif & SLA Snapshot</th>
                  <th className="py-3 px-6">Status Pengajuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {registrations.map((reg) => {
                  const snapshot = reg.fee_sla_snapshot || {};
                  const fee = snapshot.base_fee || reg.service_type?.base_fee || 0;
                  const sla = snapshot.sla_initial_days || reg.service_type?.duration_initial || '-';

                  return (
                    <tr key={reg.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-bold text-neutral-900 block">
                          {reg.registration_no || reg.registrationNumber}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {new Date(reg.created_at || reg.submittedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-neutral-900 block line-clamp-1">
                          {reg.title || reg.mushafTitle}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {reg.service_type?.category?.name || 'Mushaf Standar'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-neutral-700">
                        {reg.service_type?.name || reg.serviceType || 'Layanan Reguler'}
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <span className="font-semibold text-neutral-900 block tabular-nums">
                          {formatRupiah(fee)}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          SLA: {sla} Hari Kerja
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={reg.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PublisherDashboard;
