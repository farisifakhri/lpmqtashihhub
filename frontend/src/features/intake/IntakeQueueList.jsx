import React from 'react';
import { PackageCheck, RefreshCw, Truck, Store, ChevronRight, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueuePagination } from '@/components/common/QueueOverview';
import { courierLabel, formatDate, isLoket } from './intake-parts';

// Antrean hanya berisi master yang sudah dikirim penerbit (filter backend MASTER_INTAKE).
const queueBadge = (item) => {
  if (item.status === 'REVISION_REQUIRED' && item.physical_master_intake?.status === 'RETURNED') {
    return <Badge variant="danger">Dikembalikan · menunggu perbaikan</Badge>;
  }
  if (item.status === 'REVISION_REQUIRED') return <Badge variant="gold">Naskah perbaikan / dumi</Badge>;
  return <Badge variant="info">Dikirim · siap diperiksa</Badge>;
};

export const IntakeQueueList = ({ items, loading, pagination, onRefresh, onOpen, onPageChange }) => (
  <section aria-labelledby="intake-queue-title" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="intake-queue-title" className="text-sm font-bold text-ink">
          Antrean Naskah Menunggu Master Fisik
        </h2>
        <Badge variant="success">{pagination.total} naskah</Badge>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onRefresh()} disabled={loading}>
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        Segarkan
      </Button>
    </div>

    {loading ? (
      <div className="space-y-2" role="status" aria-busy="true" aria-label="Memuat antrean naskah masuk">
        {[0, 1, 2].map((key) => <Skeleton key={key} className="h-20" />)}
      </div>
    ) : items.length === 0 ? (
      <EmptyState
        icon={Inbox}
        title="Belum ada master fisik yang dikirim"
        description="Naskah baru muncul di sini setelah penerbit mengonfirmasi pengiriman (kurir + nomor resi, atau antar langsung ke loket). Gunakan pencarian di atas untuk memeriksa status nomor registrasi tertentu."
      />
    ) : (
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const loket = isLoket(item.dispatch_courier);
            const ShipIcon = loket ? Store : Truck;
            return (
              <li key={item.id} className="grid gap-3 p-4 transition-colors hover:bg-canvas/60 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-5">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-900">{item.registration_no}</span>
                    {queueBadge(item)}
                  </div>
                  <p className="truncate text-sm font-bold text-ink">{item.title}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {item.publisher?.legal_name || item.publisher?.name || '-'} · {item.physical_master_intake?.volume_count || 30} jilid A4
                  </p>
                </div>

                <div className="flex min-w-0 items-start gap-2.5 rounded-lg bg-canvas/70 px-3 py-2 md:bg-transparent md:p-0">
                  <ShipIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-semibold text-ink">{courierLabel(item.dispatch_courier)}</p>
                    <p className="truncate font-mono text-ink-muted">
                      {item.dispatch_tracking_no || (loket ? 'Antar langsung' : '-')} · {formatDate(item.dispatch_date, 'short')}
                    </p>
                  </div>
                </div>

                <Button variant="primary" size="sm" onClick={() => onOpen(item.id)} className="w-full md:w-auto">
                  <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Proses Penerimaan Fisik
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
        <QueuePagination pagination={pagination} loading={loading} onPageChange={onPageChange} />
      </div>
    )}
  </section>
);

export default IntakeQueueList;
