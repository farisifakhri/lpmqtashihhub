import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Registration } from '@/types/domain';
import {
  CheckSquare,
  Users,
  FileCheck,
  Award,
  Filter,
  UserCheck,
  FileSignature,
} from 'lucide-react';

const MOCK_INTERNAL_ITEMS: (Registration & { assignedToMe: boolean; taskType: string })[] = [
  {
    id: 'reg-101',
    registrationNumber: 'REG/LPMQ/2026/09/0014',
    publisherId: 'pub-01',
    publisherName: 'PT Penerbit Al-Huda Nusantara',
    mushafTitle: "Mushaf Al-Qur'an Al-Karim Rasm Usmani Terjemah Tajwid Warna",
    mushafCategory: 'Al-Qur’an dan Terjemah',
    serviceType: 'Tashih Baru Reguler (30 Juz)',
    status: 'TASHIH_IN_PROGRESS',
    paymentStatus: 'PAID',
    currentStage: 'INITIAL',
    submittedAt: '2026-09-01T10:30:00Z',
    updatedAt: '2026-09-07T14:15:00Z',
    estimatedSlaDays: 45,
    totalFee: 5500000,
    assignedToMe: true,
    taskType: 'Sidang Tashih (Juz 1-5)',
  },
  {
    id: 'reg-102',
    registrationNumber: 'REG/LPMQ/2026/09/0033',
    publisherId: 'pub-02',
    publisherName: 'CV Pustaka Qurani',
    mushafTitle: "Mushaf Al-Mubarok Ukuran B5 Rasm Usmani Standar Indonesia",
    mushafCategory: 'Al-Qur’an Tanpa Terjemah',
    serviceType: 'Tashih Baru Reguler',
    status: 'READY_FOR_VERIFICATION',
    paymentStatus: 'PAID',
    submittedAt: '2026-09-07T08:30:00Z',
    updatedAt: '2026-09-07T09:00:00Z',
    estimatedSlaDays: 30,
    totalFee: 3500000,
    assignedToMe: false,
    taskType: 'Pemeriksaan Kelengkapan Berkas & Cover',
  },
  {
    id: 'reg-103',
    registrationNumber: 'REG/LPMQ/2026/08/0077',
    publisherId: 'pub-03',
    publisherName: 'Darul Ulum Press',
    mushafTitle: "Al-Qur'an dan Terjemahan Kemenag Edisi Penyempurnaan",
    mushafCategory: 'Al-Qur’an dan Terjemah',
    serviceType: 'Tashih Baru Reguler',
    status: 'DOCUMENTATION',
    paymentStatus: 'PAID',
    submittedAt: '2026-08-15T09:00:00Z',
    updatedAt: '2026-09-06T15:20:00Z',
    estimatedSlaDays: 45,
    totalFee: 5500000,
    assignedToMe: true,
    taskType: 'Penyusunan & Pengesahan Berita Acara',
  },
];

export const InternalDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  // CODING_BASELINE_PROMPT.md §33: Tugas Saya adalah filter berdasarkan assignment, bukan status lifecycle
  const [filterMyTasksOnly, setFilterMyTasksOnly] = useState(false);

  const displayedItems = filterMyTasksOnly
    ? MOCK_INTERNAL_ITEMS.filter((item) => item.assignedToMe)
    : MOCK_INTERNAL_ITEMS;

  return (
    <div className="space-y-6">
      {/* Header Petugas Internal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-100 text-primary-700">
              Role: {currentUser.role}
            </span>
            <span className="text-xs text-neutral-500">
              NIP: {currentUser.nip || 'Admin Pusat'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">
            Dasbor Operasional Pentashihan LPMQ
          </h1>
          <p className="text-sm text-neutral-500">
            Pemrosesan verifikasi naskah, distribusi sidang tim, dan penerbitan dokumen resmi.
          </p>
        </div>

        {/* Quick action buttons according to role */}
        <div className="flex items-center gap-2">
          {currentUser.role === 'HEAD_OF_LPMQ' && (
            <Button variant="gold" icon={<Award className="w-4 h-4" />}>
              Tetapkan Surat Tanda Tashih
            </Button>
          )}
          {currentUser.role === 'TASHIH_LEADER' && (
            <Button variant="primary" icon={<FileSignature className="w-4 h-4" />}>
              Tandatangani Berita Acara
            </Button>
          )}
          {currentUser.role === 'ADMIN' && (
            <Button variant="outline" icon={<UserCheck className="w-4 h-4" />}>
              Input Atas Nama Penerbit
            </Button>
          )}
        </div>
      </div>

      {/* Ringkasan Beban Kerja */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Antrean Verifikasi</span>
            <CheckSquare className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2">12 Naskah</div>
          <p className="text-[11px] text-neutral-500 mt-1">Menunggu pemeriksaan awal</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Menunggu Distribusi</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2">5 Naskah</div>
          <p className="text-[11px] text-neutral-500 mt-1">Verifikasi berkas lolos</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Sidang Tashih Aktif</span>
            <FileCheck className="w-4 h-4 text-primary-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2">18 Naskah</div>
          <p className="text-[11px] text-neutral-500 mt-1">Pada 6 Tim Pentashih</p>
        </Card>

        <Card className="p-4 bg-gold-50 border-gold-400">
          <div className="flex items-center justify-between text-gold-700 text-xs font-medium">
            <span>Siap Penetapan SK</span>
            <Award className="w-4 h-4 text-gold-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 mt-2">3 Dokumen</div>
          <p className="text-[11px] text-gold-700 mt-1">Berita Acara sudah lengkap</p>
        </Card>
      </div>

      {/* Daftar Penugasan & Filter Tugas Saya */}
      <Card
        title="Daftar Antrean Kerja & Naskah Mushaf"
        subtitle="Aturan alur: Semua perubahan status tercatat dalam Jejak Audit (Audit Trail)"
        headerAction={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMyTasksOnly(!filterMyTasksOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                filterMyTasksOnly
                  ? 'bg-primary-700 text-white border-primary-700 shadow-xs'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter: Tugas Saya Saja</span>
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Nomor Registrasi</th>
                <th className="py-3 px-6">Penerbit & Mushaf</th>
                <th className="py-3 px-6">Tugas / Agenda</th>
                <th className="py-3 px-6">Status Pengajuan</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {displayedItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-mono text-xs font-bold text-neutral-900 block">
                      {item.registrationNumber}
                    </span>
                    {item.assignedToMe && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded mt-1">
                        Ditugaskan ke Anda
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-neutral-900 block text-xs">
                      {item.publisherName}
                    </span>
                    <span className="text-xs text-neutral-600 block line-clamp-1 mt-0.5">
                      {item.mushafTitle}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-medium text-neutral-800 block">
                      {item.taskType}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      SLA: {item.estimatedSlaDays} hari kerja
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <Button variant="primary" size="sm">
                      Proses Naskah
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
