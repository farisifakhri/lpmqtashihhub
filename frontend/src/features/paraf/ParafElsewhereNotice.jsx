import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Stamp } from 'lucide-react';
import { parafApi } from '@/api/paraf.api';
import { PARAF_TYPES } from './ParafCheckout';

/**
 * Pemaraf: halaman Persetujuan Verifikasi hanya memuat surat hasil verifikasi. Dokumen lain yang menunggu
 * paraf (keputusan sidang distributor, STT, surat master) diberi tahu di sini agar tidak terlewat.
 */
export const ParafElsewhereNotice = ({ excludeType = 'VERIFICATION_RESULT' }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    parafApi.queue()
      .then((res) => { if (active) setItems((Array.isArray(res?.data) ? res.data : []).filter((item) => item.type !== excludeType)); })
      .catch(() => {}); // pemberitahuan pelengkap: gagal dimuat tidak mengganggu halaman utama
    return () => { active = false; };
  }, [excludeType]);

  if (!items.length) return null;
  const byType = items.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + 1 }), {});

  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border border-civic-infoLine bg-civic-infoSoft p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-civic-info shadow-2xs" aria-hidden="true">
          <Stamp className="h-4 w-4" />
        </span>
        <div className="text-xs text-ink">
          <p className="font-bold">Ada {items.length} dokumen lain menunggu paraf Anda</p>
          <p className="mt-0.5 text-ink-muted">
            {Object.entries(byType).map(([type, n]) => `${PARAF_TYPES[type]?.label || type} (${n})`).join(' · ')}
          </p>
        </div>
      </div>
      <Link
        to="/internal/paraf"
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-fill px-4 py-2 text-xs font-bold text-white hover:bg-brand-fill-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fill"
      >
        Buka Antrean Paraf <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
};

export default ParafElsewhereNotice;
