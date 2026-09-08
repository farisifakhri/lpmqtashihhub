import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PlusCircle, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_REGISTRATIONS = [
  {
    id: 'reg-001',
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
  },
  {
    id: 'reg-002',
    registrationNumber: 'REG/LPMQ/2026/09/0021',
    publisherId: 'pub-01',
    publisherName: 'PT Penerbit Al-Huda Nusantara',
    mushafTitle: "Al-Qur'an Hafalan Saku Praktis 30 Juz",
    mushafCategory: 'Al-Qur’an Tanpa Terjemah',
    serviceType: 'Tashih Baru Reguler',
    status: 'REVISION_REQUIRED',
    paymentStatus: 'PAID',
    submittedAt: '2026-09-03T08:00:00Z',
    updatedAt: '2026-09-06T16:00:00Z',
    estimatedSlaDays: 30,
    totalFee: 3500000,
  },
  {
    id: 'reg-003',
    registrationNumber: 'REG/LPMQ/2026/08/0098',
    publisherId: 'pub-01',
    publisherName: 'PT Penerbit Al-Huda Nusantara',
    mushafTitle: "Mushaf Al-Qur'an Tajwid Digital & Audio Bookmark",
    mushafCategory: 'Al-Qur’an Digital',
    serviceType: 'Tashih Mushaf Elektronik/Digital',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    submittedAt: '2026-08-10T11:00:00Z',
    updatedAt: '2026-09-02T09:00:00Z',
    estimatedSlaDays: 30,
    totalFee: 4000000,
  },
];

export const PublisherDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Portal Penerbit Mushaf Al-Qur'an
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Pantau status pentashihan naskah, konfirmasi pembayaran PNBP, dan unduh dokumen resmi LPMQ.
          </p>
        </div>
        <Link to="/publisher/new-registration">
          <Button icon={<PlusCircle className="w-4 h-4" />}>
            Ajukan Pentashihan Naskah
          </Button>
        </Link>
      </div>

      {/* Ringkasan & Billing Card (Sesuai DESIGN.md: Latar emas muda, nominal besar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card variant="billing" className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gold-700">
              Billing PNBP Aktif
            </span>
            <CreditCard className="w-5 h-5 text-gold-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900 tabular-nums">
              Rp 5.500.000
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              Kode Billing SIMPONI: <span className="font-mono font-bold">820260908001</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gold-400/30 flex items-center justify-between text-xs">
            <span className="text-status-warning font-semibold">Batas Bayar: 10 Sep 2026</span>
            <span className="text-primary-700 font-medium hover:underline cursor-pointer">
              Instruksi Bayar &rarr;
            </span>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Sedang Ditashih
            </span>
            <Clock className="w-5 h-5 text-primary-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-neutral-900">2 Naskah</div>
            <p className="text-xs text-neutral-500 mt-1">
              1 Tahap Awal · 1 Menunggu Revisi Penerbit
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
            Rata-rata sisa durasi: <span className="font-semibold text-neutral-700">18 Hari Kerja</span>
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
            <div className="text-2xl font-bold text-neutral-900">1 Dokumen</div>
            <p className="text-xs text-neutral-500 mt-1">
              Siap diunduh & diverifikasi keabsahannya
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs">
            <Link to="/publisher/documents" className="text-primary-700 font-medium hover:underline">
              Buka Arsip Surat Tashih &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Tabel Pengajuan Terbaru (Sesuai DESIGN.md §4: Header hijau muda, badge status teks+ikon) */}
      <Card
        title="Daftar Pengajuan Mushaf Terbaru"
        subtitle="Data sinkron dengan basis data terpadu LPMQ"
      >
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Nomor & Tanggal</th>
                <th className="py-3 px-6">Judul Naskah Mushaf</th>
                <th className="py-3 px-6">Jenis Layanan</th>
                <th className="py-3 px-6">Status Pengajuan</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {MOCK_REGISTRATIONS.map((reg) => (
                <tr key={reg.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-mono text-xs font-bold text-neutral-900 block">
                      {reg.registrationNumber}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(reg.submittedAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-neutral-900 block line-clamp-1">
                      {reg.mushafTitle}
                    </span>
                    <span className="text-xs text-neutral-500">{reg.mushafCategory}</span>
                  </td>
                  <td className="py-4 px-6 text-xs text-neutral-700">
                    {reg.serviceType}
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={reg.status} />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Button variant="outline" size="sm">
                      Detail
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
