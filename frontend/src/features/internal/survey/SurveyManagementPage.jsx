import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { surveyApi } from '@/api/survey.api';
import { SurveyListTab } from './SurveyListTab';
import { UnsurTab } from './UnsurTab';
import { QuestionBankTab } from './QuestionBankTab';
import { SurveySetupView, ResponsesView, RespondentsView, ReportView } from './SurveyViews';
import { inputClass } from './survey-constants';

// Sub-menu sidebar Survei → ?tab=… (mengikuti susunan menu Survey di sistem lama).
export const SURVEY_VIEWS = {
  survei: { title: 'Nama Survei', subtitle: 'Tambahkan topik survei dan statusnya. Survei berstatus Aktif dapat diisi penerbit.' },
  unsur: { title: 'Nama Unsur', subtitle: 'Unsur penilaian yang dipakai ulang di semua survei.' },
  pertanyaan: { title: 'Pertanyaan Survei', subtitle: 'Bank pertanyaan beserta opsi jawaban bernilai 1–4.' },
  pemilihan: { title: 'Pemilihan Survei', subtitle: 'Susun pertanyaan per unsur untuk survei yang dipilih.', perSurvey: SurveySetupView },
  jawaban: { title: 'Jawaban Survei', subtitle: 'Jawaban yang masuk per responden.', perSurvey: ResponsesView },
  responden: { title: 'Responden Survei', subtitle: 'Profil responden: jenis kelamin, usia, pendidikan, pekerjaan.', perSurvey: RespondentsView },
  laporan: { title: 'Laporan Survei', subtitle: 'Nilai per unsur, indeks, dan mutu pelayanan.', perSurvey: ReportView },
};

function SurveyPicker({ value, onChange }) {
  const [surveys, setSurveys] = useState([]);
  useEffect(() => { surveyApi.listSurveys().then((r) => setSurveys(r.data || [])).catch(() => {}); }, []);
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <label htmlFor="survey-picker" className="block text-[13px] font-semibold text-ink mb-1.5">Nama Survei</label>
      <select id="survey-picker" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pilih nama survei…</option>
        {surveys.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}

export function SurveyManagementPage() {
  const [params, setParams] = useSearchParams();
  const tab = SURVEY_VIEWS[params.get('tab')] ? params.get('tab') : 'survei';
  const surveyId = params.get('survey') || '';
  const view = SURVEY_VIEWS[tab];

  // Tanpa ?tab, tampilkan Nama Survei dan tandai sub-menunya aktif di sidebar.
  useEffect(() => {
    if (params.get('tab') !== tab) setParams({ tab }, { replace: true });
  }, [params, tab, setParams]);

  const go = (nextTab, id) => setParams({ tab: nextTab, ...(id ? { survey: id } : {}) });
  const PerSurvey = view.perSurvey;

  return (
    <main className="mx-auto max-w-7xl space-y-5 pb-12">
      <PageHeader
        breadcrumbs={[{ label: 'Tata Kelola Sistem' }, { label: 'Survei' }, { label: view.title }]}
        title={view.title}
        subtitle={view.subtitle}
      />

      {tab === 'survei' && <SurveyListTab onOpen={(id) => go('pemilihan', id)} />}
      {tab === 'unsur' && <UnsurTab />}
      {tab === 'pertanyaan' && <QuestionBankTab />}
      {PerSurvey && (
        <>
          <SurveyPicker value={surveyId} onChange={(id) => go(tab, id)} />
          {surveyId
            ? <PerSurvey key={surveyId} surveyId={surveyId} />
            : <EmptyState title="Pilih survei" description="Pilih nama survei di atas untuk menampilkan datanya." />}
        </>
      )}
    </main>
  );
}
