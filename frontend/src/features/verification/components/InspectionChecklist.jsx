import React from 'react';
import { CheckSquare, AlertTriangle, AlertCircle } from 'lucide-react';

export const InspectionChecklist = ({
  activeMobileTab,
  sesuaiCount = 0,
  tidakSesuaiCount = 0,
  tidakBerlakuCount = 0,
  checklist = [],
  validationErrors = {},
  isReadOnly = false,
  handleChecklistChange,
  definitions = [],
  className,
}) => {
  const CHECKLIST_DEFINITIONS = definitions;
  const currentTidakSesuai =
    typeof tidakSesuaiCount === 'number'
      ? tidakSesuaiCount
      : checklist.filter((c) => c.result === 'TIDAK_SESUAI').length;

  return (
    <div
      className={
        className ||
        `lg:col-span-4 space-y-4 ${
          activeMobileTab === 'checklist' ? 'block' : 'hidden lg:block'
        }`
      }
    >
      {/* Section Checklist */}
      <div className="p-5 bg-white rounded-xl border border-line shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-brand-800" />
              Lembar Kerja Checklist Pemeriksaan
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Evaluasi {CHECKLIST_DEFINITIONS?.length || 8} butir standar verifikasi administrasi & rasm
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentTidakSesuai > 0 && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-civic-dangerSoft text-civic-danger border border-civic-dangerLine">
                {currentTidakSesuai} Tidak Sesuai
              </span>
            )}
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-900 border border-brand-100">
              {sesuaiCount + tidakBerlakuCount}/{CHECKLIST_DEFINITIONS?.length || 8} Lengkap
            </span>
          </div>
        </div>

        {/* Informative banner when any item is TIDAK_SESUAI */}
        {currentTidakSesuai > 0 && (
          <div className="p-3 bg-civic-dangerSoft/80 border border-civic-dangerLine rounded-xl text-xs text-civic-danger flex items-start gap-2.5 shadow-2xs animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 text-civic-danger mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">
                Perhatian: Terdapat {currentTidakSesuai} butir checklist dinyatakan Tidak Sesuai
              </span>
              <p className="text-xs text-ink-muted leading-relaxed">
                Naskah otomatis diputuskan <strong>Ditolak / Dikembalikan untuk Perbaikan Penerbit</strong> pada lembar hasil pemeriksaan. Catatan rincian kekurangan pada butir yang ditolak wajib diisi agar tercantum pada surat resmi pengembalian naskah.
              </p>
            </div>
          </div>
        )}

        {/* Checklist items list */}
        <div className="space-y-3.5">
          {CHECKLIST_DEFINITIONS.map((def) => {
            const currentItem = checklist.find((c) => c.code === def.code) || {
              code: def.code,
              result: 'SESUAI',
              notes: '',
            };
            const itemError = validationErrors[`${def.code}_notes`];
            const isItemRejected = currentItem.result === 'TIDAK_SESUAI';

            return (
              <div
                key={def.code}
                className={`p-3.5 rounded-xl border transition-all ${
                  currentItem.result === 'SESUAI'
                    ? 'bg-brand-50/20 border-brand-100'
                    : isItemRejected
                    ? 'bg-civic-dangerSoft/25 border-civic-dangerLine ring-1 ring-civic-dangerLine/40'
                    : 'bg-canvas border-line'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-ink">
                      {def.title}
                    </span>
                    {isItemRejected && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-civic-danger text-white uppercase tracking-wider shrink-0">
                        Tidak Sesuai
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {def.description}
                  </p>
                </div>

                {/* Radio Results */}
                <div className="mt-3 flex items-center gap-1.5 p-1 bg-white rounded-lg border border-line text-xs">
                  <label
                    className={`flex-1 py-1.5 px-2 rounded-md text-center cursor-pointer transition-all font-semibold ${
                      currentItem.result === 'SESUAI'
                        ? 'bg-brand-800 text-white shadow-2xs'
                        : 'text-ink-muted hover:text-ink'
                    } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`result_${def.code}`}
                      value="SESUAI"
                      checked={currentItem.result === 'SESUAI'}
                      onChange={() => handleChecklistChange(def.code, 'result', 'SESUAI')}
                      disabled={isReadOnly}
                      className="sr-only"
                    />
                    <span>Sesuai</span>
                  </label>

                  <label
                    className={`flex-1 py-1.5 px-2 rounded-md text-center cursor-pointer transition-all font-semibold ${
                      currentItem.result === 'TIDAK_SESUAI'
                        ? 'bg-civic-danger text-white shadow-2xs'
                        : 'text-ink-muted hover:text-ink'
                    } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`result_${def.code}`}
                      value="TIDAK_SESUAI"
                      checked={currentItem.result === 'TIDAK_SESUAI'}
                      onChange={() => handleChecklistChange(def.code, 'result', 'TIDAK_SESUAI')}
                      disabled={isReadOnly}
                      className="sr-only"
                    />
                    <span>Tidak Sesuai</span>
                  </label>

                  <label
                    className={`flex-1 py-1.5 px-2 rounded-md text-center cursor-pointer transition-all font-semibold ${
                      currentItem.result === 'TIDAK_BERLAKU'
                        ? 'bg-ink text-white shadow-2xs'
                        : 'text-ink-muted hover:text-ink'
                    } ${isReadOnly ? 'pointer-events-none opacity-80' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`result_${def.code}`}
                      value="TIDAK_BERLAKU"
                      checked={currentItem.result === 'TIDAK_BERLAKU'}
                      onChange={() => handleChecklistChange(def.code, 'result', 'TIDAK_BERLAKU')}
                      disabled={isReadOnly}
                      className="sr-only"
                    />
                    <span>N/A</span>
                  </label>
                </div>

                {/* Rejection Prompt & Note Input */}
                {isItemRejected && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-civic-dangerLine/60 text-xs text-civic-danger flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Butir ini dinyatakan <strong>Tidak Sesuai</strong>. Naskah otomatis direkomendasikan <strong>Ditolak / Dikembalikan</strong> ke penerbit. Tuliskan rincian kekurangan secara spesifik di bawah:
                    </span>
                  </div>
                )}

                <div className="mt-2">
                  <input
                    type="text"
                    value={currentItem.notes || ''}
                    maxLength={1000}
                    onChange={(e) => handleChecklistChange(def.code, 'notes', e.target.value)}
                    disabled={isReadOnly}
                    placeholder={
                      isItemRejected
                        ? 'Tuliskan catatan rincian kekurangan butir ini (wajib)...'
                        : 'Catatan tambahan (opsional)...'
                    }
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                      isItemRejected && !currentItem.notes?.trim()
                        ? 'border-civic-dangerLine bg-civic-dangerSoft/20 focus:ring-civic-danger/20'
                        : itemError
                        ? 'border-civic-dangerLine focus:ring-civic-danger/20'
                        : 'border-line focus:ring-brand-700/20 focus:border-brand-700'
                    } ${isReadOnly ? 'bg-canvas text-ink-muted' : ''}`}
                  />
                  {itemError && (
                    <p className="text-xs text-civic-danger mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{itemError}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InspectionChecklist;
