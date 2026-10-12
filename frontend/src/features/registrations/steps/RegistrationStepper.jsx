import React from 'react';
import { BookOpen, ListChecks, UploadCloud, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

export const REGISTRATION_STEPS = [
  { id: 1, title: 'Data Mushaf', desc: 'Identitas & spesifikasi naskah', icon: BookOpen },
  { id: 2, title: 'Jenis & Materi', desc: 'Klasifikasi & materi tambahan', icon: ListChecks },
  { id: 3, title: 'Berkas Persyaratan', desc: 'Surat permohonan, cover & sampel', icon: UploadCloud },
  { id: 4, title: 'Tinjau & Kirim', desc: 'Verifikasi ringkasan & ajukan', icon: CheckCircle2 },
];

export const RegistrationStepper = ({ currentStep, onSelectStep, maxVisitedStep = 1 }) => {
  return (
    <nav aria-label="Tahapan Formulir Permohonan" className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {REGISTRATION_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = step.id <= maxVisitedStep;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => isClickable && onSelectStep(step.id)}
                disabled={!isClickable}
                aria-current={isActive ? 'step' : undefined}
                className={clsx(
                  'flex items-center gap-3 p-2.5 rounded-xl transition-all text-left flex-1',
                  isActive && 'bg-brand-50/80 border border-brand-200/80 shadow-2xs',
                  !isActive && isCompleted && 'hover:bg-canvas cursor-pointer',
                  !isActive && !isCompleted && 'opacity-60 cursor-not-allowed'
                )}
              >
                <div
                  className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs transition-colors',
                    isActive && 'bg-brand-700 text-white shadow-2xs',
                    isCompleted && 'bg-brand-100 text-brand-800 border border-brand-300',
                    !isActive && !isCompleted && 'bg-surface-subtle text-ink-muted border border-line'
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 text-brand-800" /> : <Icon className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                      Langkah {step.id}
                    </span>
                    {isCompleted && (
                      <span className="text-xs font-bold text-civic-success bg-civic-successSoft px-1.5 py-0.5 rounded">
                        Selesai
                      </span>
                    )}
                  </div>
                  <div className={clsx('text-xs font-bold truncate', isActive ? 'text-brand-900' : 'text-ink')}>
                    {step.title}
                  </div>
                </div>
              </button>

              {idx < REGISTRATION_STEPS.length - 1 && (
                <div className="hidden md:block w-6 h-[2px] bg-line shrink-0 mx-1" aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default RegistrationStepper;
