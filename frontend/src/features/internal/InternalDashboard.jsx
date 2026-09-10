import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  CheckSquare,
  Users,
  FileCheck,
  Award,
  Filter,
  UserCheck,
  FileSignature,
  RefreshCw,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import { registrationApi } from '@/api/registration.api';

export const InternalDashboard = () => {
  const { currentUser } = useAuth();
  // CODING_BASELINE_PROMPT.md §33: Tugas Saya adalah filter berdasarkan assignment, bukan status lifecycle
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await registrationApi.listRegistrations({
        my_tasks: filterMyTasksOnly ? 'true' : undefined,
      });
      if (res?.data) {
        setRegistrations(res.data);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat antrean pentashihan dari server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [currentUser, filterMyTasksOnly]);

  const countVerification = registrations.filter((r) =>
    ['READY_FOR_VERIFICATION', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL'].includes(r.status)
  ).length;

  const countTashih = registrations.filter((r) =>
    ['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(r.status)
  ).length;

  const countSTT = registrations.filter((r) =>
    ['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'].includes(r.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Petugas Internal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-100 text-primary-700">
              Role: {currentUser?.role || 'PETUGAS'}
            </span>
            <span className="text-xs text-neutral-500">
              NIP: {currentUser?.nip || 'Admin Pusat'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">
            Dasbor Operasional Pentashihan LPMQ
          </h1>
          <p className="text-sm text-neutral-500">
            Pemrosesan verifikasi naskah, distribusi sidang tim, dan penerbitan dokumen resmi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchItems}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Segarkan Antrean
          </Button>

          {currentUser?.role === 'HEAD_OF_LPMQ' && (
            <Button variant="gold" size="sm" icon={<Award className="w-4 h-4" />}>
              Penetapan STT
            </Button>
          )}
          {currentUser?.role === 'TASHIH_LEADER' && (
            <Button variant="primary" size="sm" icon={<FileSignature className="w-4 h-4" />}>
              Tandatangan BA
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-status-danger text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Info Koneksi API: </span>
            {error}
          </div>
        </div>
      )}

      {/* Ringkasan Beban Kerja Antrean Internal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-status-info">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">
              Verifikasi Berkas
            </span>
            <CheckSquare className="w-4 h-4 text-status-info" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-neutral-900">{countVerification}</div>
            <p className="text-xs text-neutral-500 mt-0.5">Naskah penanda & berkas</p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">
              Sidang Pentashihan
            </span>
            <BookOpen className="w-4 h-4 text-primary-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-neutral-900">{countTashih}</div>
            <p className="text-xs text-neutral-500 mt-0.5">Penugasan tim pentashih</p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-gold-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">
              Penetapan Dokumen & STT
            </span>
            <Award className="w-4 h-4 text-gold-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-neutral-900">{countSTT}</div>
            <p className="text-xs text-neutral-500 mt-0.5">SK Tashih & tanda tangan</p>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-500">
              Total Pengajuan
            </span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-neutral-900">{registrations.length}</div>
            <p className="text-xs text-neutral-500 mt-0.5">Dalam seluruh tahapan</p>
          </div>
        </Card>
      </div>

      {/* Filter Tugas Saya (CODING_BASELINE_PROMPT.md §33) */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
            Penyaringan Antrean:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMyTasksOnly(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                !filterMyTasksOnly
                  ? 'bg-primary-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Semua Naskah ({registrations.length})
            </button>
            <button
              onClick={() => setFilterMyTasksOnly(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterMyTasksOnly
                  ? 'bg-primary-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Tugas Saya
            </button>
          </div>
        </div>
        <span className="text-xs text-neutral-500 hidden sm:inline">
          Filter tugas berbasis penugasan resmi (SK Tim Tashih / Verifikator)
        </span>
      </div>

      {/* Tabel Antrean */}
      <Card
        title="Antrean Naskah Pentashihan Masuk"
        subtitle={`Sinkronisasi real-time dengan server LPMQ (${registrations.length} Naskah)`}
      >
        {loading ? (
          <div className="py-12 text-center text-neutral-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-700" />
            <p className="text-xs">Memuat antrean naskah...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
            <p className="text-sm font-semibold">Tidak ada antrean naskah saat ini</p>
            <p className="text-xs mt-1">Seluruh berkas telah diproses atau belum ada naskah baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Nomor & Tanggal</th>
                  <th className="py-3 px-6">Penerbit & Judul Naskah</th>
                  <th className="py-3 px-6">Profil Layanan</th>
                  <th className="py-3 px-6">Status Sistem</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm">
                {registrations.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono text-xs font-bold text-neutral-900 block">
                        {item.registration_no || item.registrationNumber}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(item.created_at || item.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-neutral-900 block line-clamp-1">
                        {item.title || item.mushafTitle}
                      </span>
                      <span className="text-xs text-primary-700 font-semibold block">
                        {item.publisher?.legal_name || item.publisherName || 'Penerbit'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-neutral-700">
                      {item.service_type?.name || item.serviceType || 'Tashih Reguler'}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="outline" size="sm">
                        Buka Berkas
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InternalDashboard;
