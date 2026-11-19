import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PublicAppPromotion } from '@/components/public/PublicAppPromotion';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicHeader, PUBLIC_INFORMATION_NAV_ITEMS } from '@/components/public/PublicHeader';
import { publicApi } from '@/api/public.api';
import { DistributionCard } from '@/features/internal/survey/SurveyViews';
import { DateRangeField } from './DateRangeField';
import { inputClass, IKM_CATEGORIES, IPAK_KINERJA } from '@/features/internal/survey/survey-constants';

const BASE_PATH = '/informasi/survei-ikm-ipak-pelayanan-surat-tanda-tashih';
const TITLE = 'Survei IKM dan IPAK Pelayanan Surat Tanda Tashih';

const fmt = (value) => (value == null ? '-' : Number(value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export const SURVEY_RESULTS_PATH = BASE_PATH;


const StatCard = ({ label, value }) => (
  <div className="rounded-xl border border-line bg-white p-4">
    <p className="text-xs text-ink-muted">{label}</p>
    <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
  </div>
);

const GRADE_BAR = { A: 'bg-brand-700', B: 'bg-brand-500', C: 'bg-civic-warning', D: 'bg-civic-danger' };

// Diagram batang horizontal; angka tetap tertulis sehingga terbaca tanpa melihat panjang batang.
export function BarChart({ title, rows, max }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="space-y-3 rounded-xl border border-line bg-white p-4">
      <figcaption className="text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</figcaption>
      {!rows.length ? <p className="text-xs text-ink-muted">Belum ada data.</p> : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-xs">
              <span className="truncate text-ink" title={r.label}>{r.label}</span>
              <span className="h-2.5 rounded-full bg-surface-subtle">
                <span className={`block h-full rounded-full ${r.color || 'bg-brand-700'}`} style={{ width: `${Math.min(100, (r.value / top) * 100)}%` }} />
              </span>
              <span className="w-20 text-right text-ink-muted">{r.display ?? r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

// Nilai konversi per unsur (skala 25–100), warna batang mengikuti mutu A–D.
export const UnsurChart = ({ report }) => (
  <BarChart
    title="Nilai Konversi per Unsur"
    max={100}
    rows={report.unsur.filter((u) => u.converted != null).map((u) => ({
      label: u.name,
      value: u.converted,
      display: `${fmt(u.converted)} · ${u.mutu?.grade || '-'}`,
      color: GRADE_BAR[u.mutu?.grade],
    }))}
  />
);

export const indexTitle = (kind) => (kind === 'IPAK' ? 'Indeks Persepsi Anti Korupsi' : 'Indeks Kepuasan Masyarakat');
export const indexCode = (kind) => (kind === 'IPAK' ? 'IPAK' : 'IKM');

// Banner mutu + 4 kartu ringkasan, dipakai juga di landing page.
export function SurveySummary({ report }) {
  return (
    <>
      <div className="rounded-xl bg-brand-700 px-6 py-5 text-center text-white">
        <p className="text-sm">{indexTitle(report.survey.kind)}</p>
        <p className="mt-1 text-2xl font-extrabold">{report.mutu?.label || '-'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Unsur Penilaian" value={report.unsur.length} />
        <StatCard label="Responden" value={report.respondents} />
        <StatCard label={`Nilai ${indexCode(report.survey.kind)}`} value={fmt(report.average)} />
        <StatCard label={`${indexCode(report.survey.kind)} Terkonversi`} value={fmt(report.index)} />
      </div>
    </>
  );
}

// Tabel Nilai Unsur sesuai rekap sistem lama: NRR tertimbang = NRR (setara skala 1–4) × 1/jumlah unsur.
function UnsurTable({ report }) {
  const rows = report.unsur;
  const weight = rows.length ? 1 / rows.length : 0;
  const headers = ['No.', 'Nama Unsur', 'Jumlah Nilai', 'Jumlah Responden', 'Nilai Rata-Rata (NRR)', 'NRR Tertimbang', 'NRR Tertimbang Dikonversi', 'Kinerja', 'Kinerja Terbilang'];
  const totalSum = rows.reduce((s, u) => s + u.sum, 0);
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-[860px] w-full text-left text-sm">
        <thead className="bg-surface-subtle text-xs font-bold text-ink">
          <tr>{headers.map((h) => <th key={h} scope="col" className="px-3 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line bg-white">
          {rows.map((u, i) => (
            <tr key={u.id}>
              <td className="px-3 py-2.5">{i + 1}</td>
              <td className="px-3 py-2.5">
                <span className="font-semibold text-ink">{u.name}</span>
                {u.definition && <span className="mt-0.5 block max-w-md text-xs font-normal leading-relaxed text-ink-muted">{u.definition}</span>}
              </td>
              <td className="px-3 py-2.5">{u.sum}</td>
              <td className="px-3 py-2.5">{u.respondents}</td>
              <td className="px-3 py-2.5">{fmt(u.average)}{u.scale > 4 && <span className="block text-[11px] text-ink-muted">skala 1–{u.scale}</span>}</td>
              <td className="px-3 py-2.5">{u.converted == null ? '-' : fmt((u.converted / 25) * weight)}</td>
              <td className="px-3 py-2.5">{fmt(u.converted)}</td>
              <td className="px-3 py-2.5 font-bold">{u.mutu?.grade || '-'}</td>
              <td className="px-3 py-2.5">{u.mutu?.label || '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-surface-subtle font-bold text-ink">
          <tr>
            <td className="px-3 py-3" colSpan={2}>Total</td>
            <td className="px-3 py-3">{totalSum}</td>
            <td className="px-3 py-3">{report.respondents}</td>
            <td className="px-3 py-3">{fmt(report.average)}</td>
            <td className="px-3 py-3">{fmt(report.average)}</td>
            <td className="px-3 py-3">{fmt(report.index)}</td>
            <td className="px-3 py-3">{report.mutu?.grade || '-'}</td>
            <td className="px-3 py-3">{report.mutu?.label || '-'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Definisi kategori mutu: arti "Sangat baik" (IKM) atau "Bersih dari korupsi" (IPAK); baris hasil saat ini ditandai.
function MutuTable({ kind, labels, current }) {
  const ipak = kind === 'IPAK';
  return (
    <section aria-labelledby="kategori-mutu" className="space-y-3">
      <h2 id="kategori-mutu" className="text-base font-bold text-ink">Definisi Kategori {ipak ? 'IPAK' : 'IKM'}</h2>
      <dl className="grid gap-2 rounded-xl border border-line bg-white p-4 text-xs leading-relaxed text-ink-muted sm:grid-cols-3">
        <div><dt className="font-bold text-ink">NRR (Nilai Rata-Rata)</dt><dd>Rata-rata jawaban responden untuk satu unsur. Jawaban terendah bernilai 1 dan tertinggi bernilai 4, jadi makin dekat ke 4 makin baik.</dd></div>
        <div><dt className="font-bold text-ink">Nilai Konversi</dt><dd>NRR yang diubah ke skala 25–100 agar mudah dibaca (NRR × 25). Contoh: NRR 3,65 menjadi 91,25.</dd></div>
        <div><dt className="font-bold text-ink">Mutu & Kinerja</dt><dd>Huruf A–D dan predikat yang diperoleh dari nilai konversi, sesuai rentang pada tabel di bawah.</dd></div>
      </dl>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-surface-subtle text-xs font-bold text-ink">
            <tr>{['Nilai Persepsi', 'Rentang NRR (skala 1–4)', 'Nilai Konversi (25–100)', 'Mutu', 'Kinerja'].map((h) => <th key={h} scope="col" className="px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {IKM_CATEGORIES.slice().reverse().map((c) => (
              <tr key={c.mutu} className={c.mutu === current ? 'bg-lpmq-soft font-semibold' : ''} aria-current={c.mutu === current ? 'true' : undefined}>
                <td className="px-3 py-2.5">{c.persepsi}</td>
                <td className="px-3 py-2.5">{c.interval}</td>
                <td className="px-3 py-2.5">{c.konversi}</td>
                <td className="px-3 py-2.5 font-bold">{c.mutu}</td>
                <td className="px-3 py-2.5">{labels?.[c.mutu] || (ipak ? IPAK_KINERJA[c.mutu] : c.kinerja)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SurveyReport({ report }) {
  if (!report.respondents) {
    return <p role="status" className="rounded-xl border border-line bg-white p-6 text-center text-sm text-ink-muted">Belum ada responden pada periode ini.</p>;
  }
  const d = report.demographics;
  return (
    <div className="space-y-6">
      <SurveySummary report={report} />
      <section aria-labelledby="nilai-unsur" className="space-y-3">
        <h2 id="nilai-unsur" className="text-base font-bold text-ink">Nilai Unsur</h2>
        <UnsurTable report={report} />
        <UnsurChart report={report} />
      </section>
      <MutuTable kind={report.survey.kind} labels={report.survey.mutu_labels} current={report.mutu?.grade} />
      <section aria-labelledby="data-responden" className="space-y-3">
        <h2 id="data-responden" className="text-base font-bold text-ink">Data Responden</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <DistributionCard title="Jenis Kelamin" rows={d.gender} />
          <DistributionCard title="Pendidikan" rows={d.education} />
          <DistributionCard title="Pekerjaan" rows={d.occupation} />
        </div>
        <BarChart title="Usia" rows={d.age.map((r) => ({ label: r.label, value: r.count, display: `${r.count} · ${r.percent}%` }))} />
      </section>
    </div>
  );
}

// Halaman Informasi publik: rekap hasil survei IKM/IPAK (pengganti /hasil-survey sistem lama).
export function SurveyResultsInfoPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const surveyId = params.get('survey') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const [form, setForm] = useState({ survey: surveyId, from, to });
  const [surveys, setSurveys] = useState(null);
  const [state, setState] = useState({ loading: false, error: '', report: null });

  const handleNavigate = (path, event) => {
    event?.preventDefault();
    if (path?.startsWith('/')) navigate(path);
  };

  useEffect(() => {
    let active = true;
    publicApi.surveys()
      .then((res) => {
        if (!active) return;
        const list = res?.data || [];
        setSurveys(list);
        // Tanpa pilihan di URL, tampilkan survei pertama agar halaman langsung berisi.
        if (!surveyId && list[0]) {
          setForm((f) => ({ ...f, survey: list[0].id }));
          setParams({ survey: list[0].id }, { replace: true });
        }
      })
      .catch(() => active && setSurveys([]));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!surveyId) return undefined;
    let active = true;
    setState({ loading: true, error: '', report: null });
    publicApi.surveyReport(surveyId, { from, to })
      .then((res) => active && setState({ loading: false, error: '', report: res?.data || null }))
      .catch((err) => active && setState({ loading: false, error: err?.message || 'Gagal memuat hasil survei.', report: null }));
    return () => { active = false; };
  }, [surveyId, from, to]);

  const submit = (event) => {
    event.preventDefault();
    if (!form.survey) return;
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <PublicHeader activePage="Informasi" activeHref={BASE_PATH} handleNavigate={handleNavigate} navItems={PUBLIC_INFORMATION_NAV_ITEMS} logoHref="/" />
      <main className="mx-auto min-h-[55vh] max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12">
        <nav aria-label="Breadcrumb" className="mb-5 text-xs text-ink-muted">
          <Link to="/" className="hover:text-brand-700">Beranda</Link>
          <span className="mx-2">/</span>
          <span>Informasi</span>
          <span className="mx-2">/</span>
          <span className="text-ink">{TITLE}</span>
        </nav>
        <section aria-labelledby="survey-results-title" className="space-y-6 rounded-2xl border border-line bg-surface px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <h1 id="survey-results-title" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{TITLE}</h1>
            <p className="mt-2 text-sm text-ink-muted">Rekap hasil survei kepuasan dan persepsi anti korupsi pengguna layanan Surat Tanda Tashih.</p>
          </div>

          <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-white p-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
            <label className="text-xs font-semibold text-ink-muted">
              Pilih Survei
              <select className={`${inputClass} mt-1`} value={form.survey} onChange={(e) => setForm({ ...form, survey: e.target.value })} disabled={!surveys?.length}>
                {!surveys?.length && <option value="">{surveys ? 'Belum ada survei' : 'Memuat…'}</option>}
                {surveys?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div className="text-xs font-semibold text-ink-muted">
              <label htmlFor="survey-date-range">Tanggal</label>
              <DateRangeField id="survey-date-range" from={form.from} to={form.to} onChange={(range) => setForm({ ...form, ...range })} />
            </div>
            <button type="submit" disabled={!form.survey} className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-bold text-white hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:opacity-50">
              Lihat Survei
            </button>
          </form>

          {surveys?.length === 0 && <p role="status" className="text-sm text-ink-muted">Belum ada hasil survei yang dipublikasikan.</p>}
          {state.loading && <p role="status" className="text-sm text-ink-muted">Memuat hasil survei…</p>}
          {state.error && <p role="alert" className="text-sm text-civic-danger">{state.error}</p>}
          {state.report && (
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-ink">Data Rekap {state.report.survey.name}</h2>
              <SurveyReport report={state.report} />
            </div>
          )}
        </section>
      </main>
      <PublicAppPromotion />
      <PublicFooter handleNavigate={handleNavigate} />
    </div>
  );
}

export default SurveyResultsInfoPage;
