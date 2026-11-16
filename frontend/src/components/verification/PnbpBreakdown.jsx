import React from 'react';
import { Coins, Clock, FileText, CheckCircle2 } from 'lucide-react';

const formatRupiah = (val) => {
  const num = Number(val) || 0;
  if (num === 0) return 'Rp 0 (Bebas Tarif)';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const PnbpBreakdown = ({
  feeSlaSnapshot = null,
  registration = null,
  showTitle = true,
  compact = false,
  className = '',
}) => {
  // Ambil snapshot dari prop atau registration
  const snapshot = feeSlaSnapshot || registration?.fee_sla_snapshot || {};
  const manuscripts = snapshot.manuscripts || [];
  const baseFee = Number(snapshot.base_fee || 0);
  const addonsFee = Number(snapshot.addons_fee || 0);
  const totalFee = Number(snapshot.total_fee || baseFee + addonsFee);
  const totalSlaDays = Number(snapshot.sla_initial_days || 15);

  const isMulti = manuscripts.length > 1;

  return (
    <div
      data-testid="pnbp-breakdown"
      className={`rounded-xl border border-line bg-white shadow-2xs overflow-hidden ${className}`}
    >
      {showTitle && (
        <div className="flex items-center justify-between px-4 py-3 bg-brand-50/60 border-b border-line">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-brand-700" />
            <span className="font-bold text-xs text-brand-900">
              Rincian Perhitungan Tarif PNBP & Acuan SLA
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-100/70 text-brand-800 border border-brand-200">
            PP No. 59 Tahun 2020
          </span>
        </div>
      )}

      {/* Tabel Rincian per Naskah */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-canvas border-b border-line text-ink-muted font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-3">No</th>
              <th className="py-2.5 px-3">Naskah / Ukuran</th>
              <th className="py-2.5 px-3">Item Dasar</th>
              <th className="py-2.5 px-3">Item Tambahan</th>
              <th className="py-2.5 px-3 text-right">Tarif PNBP</th>
              <th className="py-2.5 px-3 text-center">SLA Awal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink">
            {manuscripts.length > 0 ? (
              manuscripts.map((m, idx) => {
                const itemDasar = m.items?.find((it) => it.role === 'DASAR') || {
                  name: m.dasar || "Mushaf Al-Qur'an 30 Juz",
                };
                const itemsTambahan = m.items?.filter((it) => it.role === 'TAMBAHAN') || [];
                const variantText = m.variants?.length
                  ? m.variants.map((v) => `${v.ukuran || '-'} (${v.oplah || 0} ekspl)`).join(', ')
                  : null;

                return (
                  <tr key={m.seq_number || idx} className="hover:bg-brand-50/20 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-ink-muted">
                      {m.seq_number || idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-ink">
                        {isMulti ? (m.title || `Naskah ${idx + 1}`) : `Naskah: ${m.title || `Naskah ${idx + 1}`}`}
                      </div>
                      {variantText && (
                        <div className="text-[11px] text-ink-muted font-mono">
                          Ukuran: {variantText}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 text-[11px] font-medium">
                        {itemDasar.name || itemDasar.code || m.dasar || "Al-Qur'an 30 Juz"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {itemsTambahan.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {itemsTambahan.map((it, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-1.5 py-0.2 rounded bg-canvas text-ink text-[10px] border border-line"
                            >
                              {it.name || it.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-muted text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                      {formatRupiah(m.fee)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-ink-muted">
                      {m.sla_initial ?? m.slaInitial ?? 15} HK
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="py-2.5 px-3 font-mono font-medium text-ink-muted">1</td>
                <td className="py-2.5 px-3">
                  <div className="font-bold text-ink">
                    {snapshot.service_name || "Mushaf Al-Qur'an"}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Layanan: {snapshot.layanan_display || snapshot.service_name || "Mushaf Cetak"}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 text-[11px] font-medium">
                    {snapshot.base_service_code || "Al-Qur'an 30 Juz"}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-ink-muted text-[11px]">
                    {addonsFee > 0 ? `Add-on (${formatRupiah(addonsFee)})` : '-'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink">
                  {formatRupiah(totalFee)}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-ink-muted">
                  {totalSlaDays} HK
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ringkasan & Total Fee */}
      <div className="px-4 py-3 bg-canvas/70 border-t border-line space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <CheckCircle2 className="w-3.5 h-3.5 text-civic-success" />
              <span>Total Kewajiban Pembayaran PNBP (Simponi)</span>
            </div>
            <p className="text-[11px] text-ink-muted">
              Tarif PNBP dikalikan dengan jumlah ukuran naskah sesuai PP No. 59 Tahun 2020.
            </p>
          </div>

          <div className="text-right">
            <div
              data-testid="pnbp-breakdown-total"
              className={`font-mono font-black text-base sm:text-lg ${
                totalFee === 0 ? 'text-civic-success' : 'text-brand-900'
              }`}
            >
              {formatRupiah(totalFee)}
            </div>
            <div className="text-[11px] text-ink-muted font-medium flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-brand-700" />
              <span>Estimasi SLA Layanan: <strong>{totalSlaDays} Hari Kerja</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PnbpBreakdown;
