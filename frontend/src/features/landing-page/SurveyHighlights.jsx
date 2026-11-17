import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { publicApi } from '@/api/public.api';
import { DistributionCard } from '@/features/internal/survey/SurveyViews';
import { SURVEY_RESULTS_PATH, UnsurChart, indexTitle, indexCode } from '@/features/information/SurveyResultsInfoPage';

const fmt = (value) => (value == null ? '-' : Number(value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function SurveyCard({ report }) {
  return (
    <article className="space-y-4 rounded-2xl border border-line bg-white p-5" aria-label={report.survey.name}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-lpmq-green">{indexTitle(report.survey.kind)}</p>
          <h3 className="mt-1 text-lg font-black text-ink">{report.survey.name}</h3>
        </div>
        <Link
          to={`${SURVEY_RESULTS_PATH}?survey=${report.survey.id}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-lpmq-green hover:bg-lpmq-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpmq-green"
        >
          Rincian <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-lpmq-green p-4 text-center text-white">
        <div><p className="text-[11px] text-white/80">Mutu</p><p className="text-lg font-extrabold">{report.mutu?.label || '-'}</p></div>
        <div><p className="text-[11px] text-white/80">{indexCode(report.survey.kind)} Terkonversi</p><p className="text-lg font-extrabold">{fmt(report.index)}</p></div>
        <div><p className="text-[11px] text-white/80">Responden</p><p className="text-lg font-extrabold">{report.respondents}</p></div>
      </div>
      <UnsurChart report={report} />
      <div className="grid gap-3 sm:grid-cols-2">
        <DistributionCard title="Jenis Kelamin" rows={report.demographics.gender} />
        <DistributionCard title="Pendidikan" rows={report.demographics.education} />
      </div>
    </article>
  );
}

// Ringkasan survei IKM & IPAK terbaru di landing page; tidak tampil bila belum ada responden.
export default function SurveyHighlights() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    let active = true;
    publicApi.surveys()
      .then((res) => {
        const list = res?.data || [];
        const picks = ['IKM', 'IPAK'].map((kind) => list.find((s) => s.kind === kind)).filter(Boolean);
        return Promise.all(picks.map((s) => publicApi.surveyReport(s.id).then((r) => r?.data).catch(() => null)));
      })
      .then((items) => active && setReports(items.filter((r) => r?.respondents > 0)))
      .catch(() => active && setReports([]));
    return () => { active = false; };
  }, []);

  if (!reports.length) return null;
  return (
    <section id="survei-ikm-ipak" aria-labelledby="survei-ikm-ipak-title" className="space-y-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="border-b border-line pb-4">
        <h2 id="survei-ikm-ipak-title" className="mt-1 text-2xl font-black text-ink">Survei IKM dan IPAK</h2>
        <p className="mt-1 text-xs text-ink-muted sm:text-sm">Hasil survei kepuasan dan persepsi anti korupsi pengguna layanan Surat Tanda Tashih.</p>
      </div>
      <div className={`grid gap-6 ${reports.length > 1 ? 'xl:grid-cols-2' : ''}`}>
        {reports.map((r) => <SurveyCard key={r.survey.id} report={r} />)}
      </div>
    </section>
  );
}
