import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, Lock, Power, PowerOff, Save } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import { inputClass, STATUS_BADGE, formatDate } from './survey-constants';

// Tampilan per survei untuk sub-menu Pemilihan, Jawaban, Responden, dan Laporan Survei.

function useReport(surveyId) {
  const [report, setReport] = useState(null);
  useEffect(() => {
    setReport(null);
    surveyApi.getReport(surveyId).then((r) => setReport(r.data)).catch(() => {});
  }, [surveyId]);
  return report;
}

function ItemsEditor({ survey, onSaved }) {
  const locked = survey._count?.responses > 0;
  const [draft, setDraft] = useState(survey.items.map((i) => ({ unsur: i.unsur, question: i.question })));
  const [unsurList, setUnsurList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [pick, setPick] = useState({ unsur_id: '', question_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (locked) return;
    surveyApi.listUnsur().then((r) => setUnsurList(r.data || [])).catch(() => {});
    surveyApi.listQuestions().then((r) => setQuestions(r.data || [])).catch(() => {});
  }, [locked]);

  const pickedUnsur = unsurList.find((u) => u.id === pick.unsur_id);
  const used = new Set(draft.map((d) => d.question.id));
  const available = questions.filter((q) => !used.has(q.id));
  const dirty = JSON.stringify(draft.map((d) => [d.unsur.id, d.question.id]))
    !== JSON.stringify(survey.items.map((i) => [i.unsur_id, i.question_id]));

  const add = () => {
    const unsur = unsurList.find((u) => u.id === pick.unsur_id);
    const question = questions.find((q) => q.id === pick.question_id);
    if (!unsur || !question) return;
    setDraft([...draft, { unsur, question }]);
    setPick({ ...pick, question_id: '' });
  };
  const move = (index, delta) => {
    const next = [...draft];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setDraft(next);
  };
  const save = async () => {
    setSaving(true);
    try {
      const res = await surveyApi.setSurveyItems(survey.id, draft.map((d) => ({ unsur_id: d.unsur.id, question_id: d.question.id })));
      showToast('Susunan pertanyaan disimpan.', 'success');
      onSaved(res.data);
    } catch { /* sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {locked && (
        <p className="flex items-center gap-2 rounded-lg border border-civic-warningLine bg-civic-warningSoft p-3 text-xs text-civic-warning">
          <Lock className="w-4 h-4 shrink-0" /> Susunan terkunci karena survei sudah memiliki jawaban. Gunakan Duplikat untuk membuat survei periode baru.
        </p>
      )}

      {!draft.length ? (
        <EmptyState title="Belum ada pertanyaan" description="Pilih unsur dan pertanyaan di bawah untuk menyusun survei." />
      ) : (
        <ol className="space-y-2">
          {draft.map((d, i) => (
            <li key={d.question.id} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
              <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold text-ink-muted">{i + 1}.</span>
              <div className="flex-1 min-w-0 space-y-1">
                <Badge variant="info">{d.unsur.code} · {d.unsur.name}</Badge>
                <p className="text-sm text-ink">{d.question.text}</p>
                <p className="text-xs text-ink-muted">
                  {d.question.type === 'ESAI' ? 'Esai' : d.question.options?.map((o) => `${o.label} (${o.value})`).join(' · ')}
                </p>
              </div>
              {!locked && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" aria-label={`Naikkan pertanyaan ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Turunkan pertanyaan ${i + 1}`} disabled={i === draft.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Keluarkan pertanyaan ${i + 1}`} onClick={() => setDraft(draft.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {!locked && (
        <div className="space-y-3 rounded-xl border border-dashed border-line-strong bg-surface-subtle/40 p-4">
          <p className="text-xs font-semibold text-ink">Tambah pertanyaan ke survei</p>
          <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
            <select className={inputClass} aria-label="Pilih unsur" value={pick.unsur_id} onChange={(e) => setPick({ ...pick, unsur_id: e.target.value })}>
              <option value="">Pilih unsur…</option>
              {unsurList.map((u) => <option key={u.id} value={u.id}>{u.code} · {u.name}</option>)}
            </select>
            <select className={inputClass} aria-label="Pilih pertanyaan" value={pick.question_id} onChange={(e) => setPick({ ...pick, question_id: e.target.value })}>
              <option value="">Pilih pertanyaan dari bank…</option>
              {available.map((q) => <option key={q.id} value={q.id}>{q.text}</option>)}
            </select>
            <Button type="button" variant="outline" disabled={!pick.unsur_id || !pick.question_id} onClick={add}><Plus className="w-4 h-4" /> Tambah</Button>
          </div>
          {pickedUnsur?.definition && (
            <p data-testid="picked-unsur-definition" className="rounded-lg border border-line bg-white p-3 text-xs text-ink-muted leading-relaxed">
              <strong className="text-ink">{pickedUnsur.name}:</strong> {pickedUnsur.definition}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="button" disabled={!dirty || saving} onClick={save}><Save className="w-4 h-4" /> {saving ? 'Menyimpan…' : 'Simpan Susunan'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DistributionTable({ title, rows }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</h4>
      {!rows.length ? <p className="text-xs text-ink-muted">Belum ada data.</p> : rows.map((r) => (
        <div key={r.label} className="space-y-1">
          <div className="flex justify-between text-xs text-ink"><span>{r.label}</span><span>{r.count} · {r.percent}%</span></div>
          <div className="h-1.5 rounded-full bg-surface-subtle"><div className="h-1.5 rounded-full bg-brand-700" style={{ width: `${r.percent}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function RespondentsView({ surveyId }) {
  const report = useReport(surveyId);
  if (!report) return <p className="text-sm text-ink-muted">Memuat data responden…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-white p-4">
        <p className="text-xs text-ink-muted">Total responden</p>
        <p className="text-2xl font-bold text-ink">{report.respondents}</p>
        <p className="text-xs text-ink-muted">Persentase dihitung per responden, bukan per baris jawaban.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DistributionTable title="Jenis kelamin" rows={report.demographics.gender} />
        <DistributionTable title="Usia" rows={report.demographics.age} />
        <DistributionTable title="Pendidikan" rows={report.demographics.education} />
        <DistributionTable title="Pekerjaan" rows={report.demographics.occupation} />
      </div>
    </div>
  );
}

export function ReportView({ surveyId }) {
  const report = useReport(surveyId);
  if (!report) return <p className="text-sm text-ink-muted">Memuat laporan…</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-xs text-ink-muted">Responden</p><p className="text-2xl font-bold text-ink">{report.respondents}</p></div>
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-xs text-ink-muted">Nilai indeks (25–100)</p><p className="text-2xl font-bold text-ink">{report.index ?? '-'}</p></div>
        <div className="rounded-xl border border-line bg-white p-4"><p className="text-xs text-ink-muted">Mutu pelayanan</p><p className="text-2xl font-bold text-brand-800">{report.mutu ? `${report.mutu.grade} · ${report.mutu.label}` : '-'}</p></div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="p-3">Unsur</th><th className="p-3">Jawaban</th><th className="p-3">Rata-rata (1–4)</th><th className="p-3">Nilai × 25</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.unsur.map((u) => (
              <tr key={u.id}><td className="p-3"><span className="font-semibold text-ink">{u.code} · {u.name}</span>{u.definition && <p className="text-xs text-ink-muted">{u.definition}</p>}</td><td className="p-3">{u.answers}</td><td className="p-3">{u.average ?? '-'}</td><td className="p-3">{u.converted ?? '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">Indeks = rata-rata nilai seluruh unsur × 25. Mutu: A ≥ 88,31 · B ≥ 76,61 · C ≥ 65,00 · D di bawahnya (PermenPANRB 14/2017).</p>

      <div className="rounded-xl border border-line bg-white p-4 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Saran & jawaban esai ({report.essays.length})</h4>
        {!report.essays.length ? <p className="text-xs text-ink-muted">Belum ada jawaban esai.</p> : report.essays.map((e, i) => (
          <blockquote key={i} className="border-l-2 border-brand-300 pl-3 text-sm text-ink">
            {e.text}
            <footer className="text-xs text-ink-muted">{e.respondent || 'Responden'} · {formatDate(e.submitted_at)}</footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}

export function ResponsesView({ surveyId }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { surveyApi.listResponses(surveyId, { page, limit: 20 }).then((r) => setData(r.data)).catch(() => {}); }, [surveyId, page]);
  if (!data) return <p className="text-sm text-ink-muted">Memuat jawaban…</p>;
  if (!data.items.length) return <EmptyState title="Belum ada responden" description="Jawaban akan muncul setelah penerbit mengisi survei ini." />;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="p-3">Waktu</th><th className="p-3">Responden</th><th className="p-3">No. Pendaftaran</th><th className="p-3">JK</th><th className="p-3">Usia</th><th className="p-3">Pendidikan</th><th className="p-3">Pekerjaan</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((r) => (
              <React.Fragment key={r.id}>
                <tr>
                  <td className="p-3 text-xs">{formatDate(r.submitted_at)}</td>
                  <td className="p-3">{r.registration?.publisher?.legal_name || r.respondent_name || '-'}</td>
                  <td className="p-3 font-mono text-xs">{r.registration?.registration_no || '-'}</td>
                  <td className="p-3">{r.gender || '-'}</td><td className="p-3">{r.age ?? '-'}</td><td className="p-3">{r.education || '-'}</td><td className="p-3">{r.occupation || '-'}</td>
                  <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Tutup' : 'Lihat jawaban'}</Button></td>
                </tr>
                {open === r.id && (
                  <tr><td colSpan={8} className="bg-surface-subtle/50 p-3">
                    <ul className="space-y-1.5 text-xs">
                      {r.answers.map((a) => (
                        <li key={a.id}><span className="text-ink-muted">{a.question.text}</span> → <strong className="text-ink">{a.option?.label || a.essay_text || '-'}</strong>{a.value != null && ` (${a.value})`}</li>
                      ))}
                    </ul>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="flex items-center gap-3 text-sm" aria-label="Halaman responden">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
        <span>Halaman {page} dari {data.pagination.totalPages}</span>
        <Button size="sm" variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
      </nav>
    </div>
  );
}

export function SurveySetupView({ surveyId }) {
  const [survey, setSurvey] = useState(null);

  const load = useCallback(() => {
    setSurvey(null);
    surveyApi.getSurvey(surveyId).then((r) => setSurvey(r.data)).catch(() => {});
  }, [surveyId]);
  useEffect(load, [load]);

  const status = useMemo(() => survey && (STATUS_BADGE[survey.display_status] || STATUS_BADGE.DRAFT), [survey]);
  if (!survey) return <p className="text-sm text-ink-muted">Memuat survei…</p>;

  const toggle = async () => {
    try {
      const res = survey.status === 'AKTIF' ? await surveyApi.deactivateSurvey(survey.id) : await surveyApi.activateSurvey(survey.id);
      showToast(survey.status === 'AKTIF' ? 'Survei dinonaktifkan.' : 'Survei diaktifkan.', 'success');
      setSurvey({ ...survey, ...res.data });
    } catch { /* sudah ditampilkan */ }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-white p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2"><h2 className="text-lg font-bold text-ink">{survey.name}</h2><Badge variant={status.variant}>{status.label}</Badge></div>
          <p className="text-xs text-ink-muted">{survey._count.items} pertanyaan · {survey._count.responses} responden</p>
          {survey.description && <p className="text-sm text-ink">{survey.description}</p>}
        </div>
        <Button variant={survey.status === 'AKTIF' ? 'outline' : 'primary'} onClick={toggle}>
          {survey.status === 'AKTIF' ? <><PowerOff className="w-4 h-4" /> Nonaktifkan</> : <><Power className="w-4 h-4" /> Aktifkan</>}
        </Button>
      </div>

      <ItemsEditor key={`${survey.id}-${survey.updated_at}`} survey={survey} onSaved={setSurvey} />
    </section>
  );
}
