import React, { useState, useMemo } from 'react';
import {
  Calculator,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Layers,
  Clock,
  Coins,
} from 'lucide-react';
import {
  ITEM_DASAR_MAP,
  ITEM_TAMBAHAN_MAP,
  calculateItemTarifAndSla,
  calculateRegistrationSummary,
  SLA_INITIAL_CAP_DAYS,
} from '@/lib/item-calculator';

export const VerificationCalculatorTab = ({ registration = null }) => {
  const [isExtension, setIsExtension] = useState(
    registration?.registration_type === 'EXTENSION' || false
  );

  // Initial manuscripts simulation state
  const initialManuscripts = useMemo(() => {
    if (registration?.manuscripts && registration.manuscripts.length > 0) {
      return registration.manuscripts.map((m, idx) => {
        const itemCodes = (m.items || []).map((it) => it.item?.code || it.code).filter(Boolean);
        const dasarCode = itemCodes.find((c) => ITEM_DASAR_MAP[c]) || 'JUZ30';
        const tambahanCodes = itemCodes.filter((c) => ITEM_TAMBAHAN_MAP[c]);
        return {
          id: m.id || `m-${idx + 1}`,
          title: m.title || `Naskah ${idx + 1}`,
          dasar: dasarCode,
          tambahan: tambahanCodes,
        };
      });
    }

    // Fallback from fee_sla_snapshot or default 30 Juz
    const snapshotItems = registration?.fee_sla_snapshot?.items || [];
    const dasarFromSnap = snapshotItems.find((i) => i.role === 'DASAR')?.code || 'JUZ30';
    const tambahanFromSnap = snapshotItems.filter((i) => i.role === 'TAMBAHAN').map((i) => i.code);

    return [
      {
        id: 'm-1',
        title: registration?.title || "Mushaf Al-Qur'an 30 Juz",
        dasar: dasarFromSnap,
        tambahan: tambahanFromSnap,
      },
    ];
  }, [registration]);

  const [simulatedManuscripts, setSimulatedManuscripts] = useState(initialManuscripts);

  // Reset to registration actual data
  const handleResetToRegistration = () => {
    setSimulatedManuscripts(initialManuscripts);
    setIsExtension(registration?.registration_type === 'EXTENSION' || false);
  };

  // Add a new manuscript simulation row (up to 20)
  const handleAddManuscript = () => {
    if (simulatedManuscripts.length >= 20) return;
    const nextIdx = simulatedManuscripts.length + 1;
    setSimulatedManuscripts([
      ...simulatedManuscripts,
      {
        id: `m-${Date.now()}-${nextIdx}`,
        title: `Naskah Mushaf ${nextIdx}`,
        dasar: 'JUZ30',
        tambahan: [],
      },
    ]);
  };

  // Remove a manuscript simulation row
  const handleRemoveManuscript = (index) => {
    if (simulatedManuscripts.length <= 1) return;
    setSimulatedManuscripts(simulatedManuscripts.filter((_, idx) => idx !== index));
  };

  // Update item dasar
  const handleUpdateDasar = (index, dasarCode) => {
    const next = [...simulatedManuscripts];
    next[index] = { ...next[index], dasar: dasarCode };
    setSimulatedManuscripts(next);
  };

  // Toggle item tambahan
  const handleToggleTambahan = (index, itemCode) => {
    const next = [...simulatedManuscripts];
    const currentList = next[index].tambahan || [];
    const exists = currentList.includes(itemCode);
    const updated = exists ? currentList.filter((c) => c !== itemCode) : [...currentList, itemCode];
    next[index] = { ...next[index], tambahan: updated };
    setSimulatedManuscripts(next);
  };

  // Calculate per-manuscript results
  const manuscriptResults = useMemo(() => {
    return simulatedManuscripts.map((m) => {
      const allCodes = [m.dasar, ...(m.tambahan || [])];
      const calc = calculateItemTarifAndSla(allCodes, { isExtensionOrTambahOplah: isExtension });
      return {
        ...m,
        calc,
      };
    });
  }, [simulatedManuscripts, isExtension]);

  // Aggregate registration summary
  const summary = useMemo(() => {
    return calculateRegistrationSummary(manuscriptResults.map((r) => r.calc));
  }, [manuscriptResults]);

  const formatRupiah = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white rounded-2xl border border-line p-5 sm:p-7 shadow-xs space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Kalkulator PNBP & Acuan Waktu Layanan (SLA)
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted">
              Acuan simulasi tarif dan SLA berbasis item naskah sesuai B-01 & PP No. 59 Tahun 2020.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {registration && (
            <button
              type="button"
              onClick={handleResetToRegistration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink-muted hover:text-brand-800 hover:bg-canvas transition-colors"
              title="Isi kalkulator dengan data naskah aktual dari pengajuan ini"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Muat Data Pengajuan</span>
            </button>
          )}

          <div className="inline-flex items-center bg-canvas border border-line rounded-lg p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsExtension(false)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                !isExtension
                  ? 'bg-white text-brand-900 shadow-2xs font-bold border border-line'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Perdana
            </button>
            <button
              type="button"
              onClick={() => setIsExtension(true)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                isExtension
                  ? 'bg-white text-brand-900 shadow-2xs font-bold border border-line'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Perpanjangan / Tambah Oplah
            </button>
          </div>
        </div>
      </div>

      {/* Summary Highlight Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-brand-50/50 border border-brand-200">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand-900 uppercase tracking-wider">
            <Coins className="w-4 h-4 text-brand-700" />
            <span>Total Tarif PNBP</span>
          </div>
          <p data-testid="summary-total-fee" className="text-xl font-black text-brand-950">
            {formatRupiah(summary.totalFee)}
          </p>
          <p className="text-xs text-brand-700">
            {simulatedManuscripts.length} Naskah Terhitung
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Clock className="w-4 h-4 text-brand-700" />
            <span>SLA Perdana</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span data-testid="summary-sla-initial" className="text-xl font-black text-ink">{summary.slaInitial}</span>
            <span className="text-xs font-bold text-ink-muted">Hari Kerja (HK)</span>
          </div>
          {summary.slaInitial === SLA_INITIAL_CAP_DAYS && (
            <p className="text-xs font-semibold text-civic-warning">
              (Maksimal 60 HK per aturan)
            </p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Clock className="w-4 h-4 text-brand-700" />
            <span>SLA Revisi</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span data-testid="summary-sla-revision" className="text-xl font-black text-ink">{summary.slaRevision}</span>
            <span className="text-xs font-bold text-ink-muted">Hari Kerja (HK)</span>
          </div>
          <p className="text-xs text-ink-muted">Tanpa batas plafon</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Clock className="w-4 h-4 text-brand-700" />
            <span>SLA Dumi / Perpanjangan</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span data-testid="summary-sla-dummy" className="text-xl font-black text-ink">{summary.slaDummy}</span>
            <span className="text-xs font-bold text-ink-muted">Hari Kerja (HK)</span>
          </div>
          <p className="text-xs text-ink-muted">Tanpa batas plafon</p>
        </div>
      </div>

      {/* Manuscripts List */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-700" />
            <span>Daftar Naskah Simulasi ({simulatedManuscripts.length}/20)</span>
          </h3>
          {simulatedManuscripts.length < 20 && (
            <button
              type="button"
              onClick={handleAddManuscript}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-800 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Naskah</span>
            </button>
          )}
        </div>

        {manuscriptResults.map((m, idx) => {
          const calc = m.calc;
          const hasAbsorbedTerjemah = calc.items.some((i) => i.code === 'TERJEMAH' && i.is_covered);

          return (
            <div
              key={m.id}
              className="rounded-xl border border-line bg-canvas p-4 sm:p-5 space-y-4 shadow-2xs"
            >
              {/* Manuscript Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-900 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => {
                      const next = [...simulatedManuscripts];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setSimulatedManuscripts(next);
                    }}
                    className="text-xs sm:text-sm font-bold text-ink bg-white px-2.5 py-1 rounded-md border border-line focus:outline-none focus:ring-1 focus:ring-brand-700"
                    placeholder={`Nama Naskah ${idx + 1}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-900 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-md">
                    {formatRupiah(calc.fee)} • {calc.slaInitial} HK
                  </span>

                  {simulatedManuscripts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveManuscript(idx)}
                      className="p-1 rounded-md text-ink-muted hover:text-civic-danger hover:bg-civic-dangerSoft transition-colors"
                      title="Hapus naskah ini dari simulasi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Item Dasar Selector (Kelompok 1 & 2) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink">
                  1. Item Dasar (Kelompok 1 & 2 — Pilih tepat satu):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Object.values(ITEM_DASAR_MAP).map((dasar) => (
                    <button
                      key={dasar.code}
                      type="button"
                      aria-label={dasar.name}
                      onClick={() => handleUpdateDasar(idx, dasar.code)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        m.dasar === dasar.code
                          ? 'border-brand-700 bg-white font-bold text-brand-950 shadow-2xs ring-1 ring-brand-700'
                          : 'border-line bg-white/70 hover:bg-white text-ink'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{dasar.name}</span>
                        {m.dasar === dasar.code && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                        )}
                      </div>
                      <div className="text-2xs text-ink-muted mt-1">
                        {formatRupiah(dasar.fee)} • {dasar.sla_initial} HK
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Tambahan Selector (Kelompok 3) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-ink">
                    2. Item Tambahan (Kelompok 3 — Pilih materi terkait):
                  </label>
                  {hasAbsorbedTerjemah && (
                    <span className="inline-flex items-center gap-1 text-2xs font-bold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">
                      <Sparkles className="w-3 h-3 text-brand-700" />
                      Terjemah diserap (Rp 0 & 0 HK) oleh Perkata/Tafsir
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.values(ITEM_TAMBAHAN_MAP).map((tamb) => {
                    const isSelected = (m.tambahan || []).includes(tamb.code);
                    const isCoveredByOther =
                      tamb.code === 'TERJEMAH' &&
                      ((m.tambahan || []).includes('PERKATA') || (m.tambahan || []).includes('TAFSIR'));

                    return (
                      <label
                        key={tamb.code}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-700 bg-white font-bold text-brand-950 shadow-2xs'
                            : 'border-line bg-white/70 hover:bg-white text-ink'
                        }`}
                      >
                        <input
                          type="checkbox"
                          aria-label={tamb.name}
                          checked={isSelected}
                          onChange={() => handleToggleTambahan(idx, tamb.code)}
                          className="mt-0.5 rounded border-line text-brand-700 focus:ring-brand-700 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{tamb.name}</span>
                            {isCoveredByOther && (
                              <span className="text-3xs bg-civic-warningSoft text-civic-warning px-1 rounded font-normal">
                                Absorpsi
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-ink-muted">
                            +{formatRupiah(isCoveredByOther ? 0 : tamb.fee)} • +{isCoveredByOther ? 0 : tamb.delta_initial} HK
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Result Line */}
              <div className="p-2.5 rounded-lg bg-white border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-ink-muted font-medium">
                  Label Layanan: <strong className="text-ink">{calc.layananDisplay}</strong>
                </span>
                <span className="text-ink-muted font-medium">
                  Rincian: <strong className="text-ink">{calc.items.length} item</strong> • Perdana: <strong className="text-brand-900">{calc.slaInitial} HK</strong> • Revisi: <strong>{calc.slaRevision} HK</strong> • Dumi: <strong>{calc.slaDummy} HK</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationCalculatorTab;

