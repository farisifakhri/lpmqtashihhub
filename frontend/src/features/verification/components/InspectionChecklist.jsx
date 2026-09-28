import React from 'react';
import { CheckSquare } from 'lucide-react';
import { ResultLetterPanel } from './ResultLetterPanel';

export const InspectionChecklist = ({
  activeMobileTab, sesuaiCount, tidakBerlakuCount, checklist, validationErrors,
  isReadOnly, handleChecklistChange, decision, setDecision, loadOfficialTemplate,
  setIsDirty, notes, setNotes, letterTab, setLetterTab, letterText, setLetterText,
  definitions,
}) => {
  const CHECKLIST_DEFINITIONS = definitions;
  return (
        <div
          className={`lg:col-span-4 space-y-4 ${
            activeMobileTab === 'checklist' || activeMobileTab === 'hasil' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Section Checklist (Always accessible or active on mobile checklist tab) */}
          <div
            className={`p-5 bg-white rounded-xl border border-line shadow-2xs space-y-4 ${
              activeMobileTab === 'hasil' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-brand-800" />
                  Lembar Kerja Checklist Pemeriksaan
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Evaluasi 4 butir standar verifikasi administrasi & rasm
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-900 border border-brand-100">
                {sesuaiCount + tidakBerlakuCount}/4 Lengkap
              </span>
            </div>

            {/* Checklist items list */}
            <div className="space-y-3.5">
              {CHECKLIST_DEFINITIONS.map((def, idx) => {
                const currentItem = checklist.find((c) => c.code === def.code) || {
                  code: def.code,
                  result: 'SESUAI',
                  notes: '',
                };
                const itemError = validationErrors[`${def.code}_notes`];

                return (
                  <div
                    key={def.code}
                    className={`p-3.5 rounded-xl border transition-all ${
                      currentItem.result === 'SESUAI'
                        ? 'bg-brand-50/20 border-brand-100'
                        : currentItem.result === 'TIDAK_SESUAI'
                        ? 'bg-civic-dangerSoft/20 border-civic-dangerLine'
                        : 'bg-canvas border-line'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-ink">
                          {def.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted leading-relaxed">
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

                    {/* Note Input */}
                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={currentItem.notes || ''}
                        maxLength={1000}
                        onChange={(e) => handleChecklistChange(def.code, 'notes', e.target.value)}
                        disabled={isReadOnly}
                        placeholder={
                          currentItem.result === 'TIDAK_SESUAI'
                            ? 'Catatan kekurangan butir ini (wajib)...'
                            : 'Catatan tambahan (opsional)...'
                        }
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                          itemError
                            ? 'border-civic-dangerLine focus:ring-civic-danger/20'
                            : 'border-line focus:ring-brand-700/20 focus:border-brand-700'
                        } ${isReadOnly ? 'bg-canvas text-ink-muted' : ''}`}
                      />
                      {itemError && <p className="text-[11px] text-civic-danger mt-0.5 font-medium">{itemError}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Keputusan & Surat (Always accessible or active on mobile hasil tab) */}
          <ResultLetterPanel
            activeMobileTab={activeMobileTab}
            decision={decision}
            setDecision={setDecision}
            loadOfficialTemplate={loadOfficialTemplate}
            setIsDirty={setIsDirty}
            isReadOnly={isReadOnly}
            validationErrors={validationErrors}
            notes={notes}
            setNotes={setNotes}
            letterTab={letterTab}
            setLetterTab={setLetterTab}
            letterText={letterText}
            setLetterText={setLetterText}
          />
        </div>
  );
};
