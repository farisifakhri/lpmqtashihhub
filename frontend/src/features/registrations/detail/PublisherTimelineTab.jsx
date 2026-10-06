import React from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function PublisherTimelineTab({ data }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 space-y-4 shadow-2xs">
      <div className="border-b border-line pb-3">
        <h2 className="font-bold text-ink text-sm">Riwayat proses</h2>
        <p className="text-[11px] text-ink-muted mt-0.5">
          Catatan resmi tahapan penelaahan naskah
        </p>
      </div>

      {data.timeline?.length ? (
        <ol className="space-y-4 border-l-2 border-brand-100 pl-4 text-xs">
          {data.timeline.map((item) => (
            <li key={item.id} className="space-y-1.5 relative">
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-700 ring-4 ring-white" />
              <StatusBadge status={item.to_status} />
              <p className="text-[11px] text-ink-muted font-mono">
                {new Date(item.changed_at).toLocaleString('id-ID', {
                  timeZone: 'Asia/Jakarta',
                })}{' '}
                WIB
              </p>
              {item.notes && (
                <div className="p-2.5 bg-canvas rounded-lg border border-line/70 text-ink whitespace-pre-wrap break-words">
                  {item.notes}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-ink-muted">Belum ada perubahan status.</p>
      )}

      <p className="text-[10px] text-ink-muted pt-2 border-t border-line">
        Catatan ditampilkan sesuai hak akses penerbit.
      </p>
    </section>
  );
}
