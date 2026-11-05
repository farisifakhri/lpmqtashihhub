import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SurveyListTab } from './SurveyListTab';
import { SurveyDetail } from './SurveyDetail';
import { UnsurTab } from './UnsurTab';
import { QuestionBankTab } from './QuestionBankTab';

const TABS = [
  { id: 'survei', label: 'Daftar Survei' },
  { id: 'unsur', label: 'Unsur' },
  { id: 'pertanyaan', label: 'Bank Pertanyaan' },
];

export function SurveyManagementPage() {
  const [tab, setTab] = useState('survei');
  const [openSurveyId, setOpenSurveyId] = useState(null);

  return (
    <main className="mx-auto max-w-7xl space-y-5 pb-12">
      <PageHeader
        breadcrumbs={[{ label: 'Tata Kelola Sistem' }, { label: 'Survei Layanan' }]}
        title="Survei Layanan"
        subtitle="Kelola survei IKM dan IPAK pelayanan Surat Tanda Tashih: unsur penilaian, bank pertanyaan, susunan survei, jawaban, dan laporan indeks."
      />

      {openSurveyId ? (
        <SurveyDetail surveyId={openSurveyId} onBack={() => setOpenSurveyId(null)} />
      ) : (
        <>
          <div role="tablist" aria-label="Menu survei" className="flex gap-1 rounded-xl border border-line bg-surface-subtle p-1 text-sm">
            {TABS.map((t) => (
              <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg px-3 py-2 font-semibold transition-colors ${tab === t.id ? 'bg-white text-brand-900 shadow-2xs' : 'text-ink-muted hover:text-ink'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'survei' && <SurveyListTab onOpen={setOpenSurveyId} />}
          {tab === 'unsur' && <UnsurTab />}
          {tab === 'pertanyaan' && <QuestionBankTab />}
        </>
      )}
    </main>
  );
}
