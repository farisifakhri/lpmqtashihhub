import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, Lock, Power, PowerOff, Save } from 'lucide-react';
import { surveyApi } from '@/api/survey.api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/toast';
import {
  inputClass, STATUS_BADGE, formatDate, formatDateTime, unsurLabel, unsurForSurvey,
  DISABILITY_LABELS, SERVICE_CATEGORY_LABELS, SATISFACTION_LABELS, ANTI_CORRUPTION_STATEMENTS, IKM_CATEGORIES,
} from './survey-constants';

// Tampilan per survei untuk sub-menu Pemilihan, Jawaban, Responden, dan Laporan Survei.

function useReport(surveyId) {
  const [report, setReport] = useState(null);
  useEffect(() => {
    setReport(null);
    surveyApi.getReport(surveyId).then((r) => setReport(r.data)).catch(() => {});
  }, [surveyId]);
  return report;
}

// Kelompokkan item survei per unsur, urut sesuai kemunculan pertama.
const groupItems = (items) => {
  const groups = [];
  for (const { unsur, question } of items) {
    let g = groups.find((x) => x.unsur.id === unsur.id);
    if (!g) groups.push(g = { unsur, questions: [] });
    g.questions.push(question);
  }
  return groups;
};
const flatten = (groups) => groups.flatMap((g) => g.questions.map((q) => ({ unsur_id: g.unsur.id, question_id: q.id })));

function ItemsEditor({ survey, onSaved }) {
  const locked = survey._count?.responses > 0;
  const [groups, setGroups] = useState(() => groupItems(survey.items));
  const [unsurList, setUnsurList] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (locked) return;
    surveyApi.listUnsur().then((r) => setUnsurList(r.data || [])).catch(() => {});
    surveyApi.listQuestions().then((r) => setQuestions(r.data || [])).catch(() => {});
  }, [locked]);

  const used = new Set(groups.flatMap((g) => g.questions.map((q) => q.id)));
  // Pertanyaan bank soal milik unsur ini yang belum dipakai di survei.
  const availableFor = (unsurId) => questions.filter((q) => q.unsur_id === unsurId && !used.has(q.id));
  const unusedUnsur = unsurForSurvey(unsurList, survey.id).filter((u) => !groups.some((g) => g.unsur.id === u.id));
  const dirty = JSON.stringify(flatten(groups))
    !== JSON.stringify(survey.items.map((i) => ({ unsur_id: i.unsur_id, question_id: i.question_id })));

  const updateGroup = (gi, change) => setGroups(groups.map((g, i) => (i === gi ? { ...g, questions: change(g.questions) } : g)));
  const addUnsur = (id) => {
    const unsur = unsurList.find((u) => u.id === id);
    if (unsur) setGroups([...groups, { unsur, questions: [] }]);
  };
  const addQuestion = (gi, id) => {
    const q = questions.find((x) => x.id === id);
    if (q) updateGroup(gi, (qs) => [...qs, q]);
  };
  const move = (gi, qi, delta) => updateGroup(gi, (qs) => {
    const next = [...qs];
    [next[qi], next[qi + delta]] = [next[qi + delta], next[qi]];
    return next;
  });
  const save = async () => {
    setSaving(true);
    try {
      const res = await surveyApi.setSurveyItems(survey.id, flatten(groups));
      showToast('Susunan pertanyaan disimpan.', 'success');
      onSaved(res.data);
    } catch { /* sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  let number = 0;
  return (
    <div className="space-y-4">
      {locked && (
        <p className="flex items-center gap-2 rounded-lg border border-civic-warningLine bg-civic-warningSoft p-3 text-xs text-civic-warning">
          <Lock className="w-4 h-4 shrink-0" /> Susunan terkunci karena survei sudah memiliki jawaban. Gunakan Duplikat untuk membuat survei periode baru.
        </p>
      )}

      {!groups.length && (
        <EmptyState title="Belum ada unsur" description="Tambahkan unsur di bawah, lalu pilih pertanyaannya dari bank soal." />
      )}

      {groups.map((g, gi) => {
        const available = availableFor(g.unsur.id);
        return (
          <section key={g.unsur.id} data-testid={`unsur-group-${g.unsur.id}`} className="space-y-3 rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-bold text-ink">{unsurLabel(g.unsur)} <span className="font-normal text-ink-muted">· {g.questions.length} pertanyaan</span></h3>
                {g.unsur.definition && <p className="text-xs leading-relaxed text-ink-muted">{g.unsur.definition}</p>}
              </div>
              {!locked && (
                <Button size="sm" variant="ghost" aria-label={`Keluarkan unsur ${g.unsur.name}`} onClick={() => setGroups(groups.filter((_, i) => i !== gi))}><X className="w-4 h-4" /></Button>
              )}
            </div>

            {!!g.questions.length && (
              <ol className="space-y-2">
                {g.questions.map((q, qi) => {
                  number += 1;
                  return (
                    <li key={q.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
                      <span className="mt-0.5 w-6 shrink-0 text-right text-xs font-bold text-ink-muted">{number}.</span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm text-ink">{q.text}</p>
                        <p className="text-xs text-ink-muted">
                          {q.type === 'ESAI' ? 'Esai' : q.options?.map((o) => `${o.label} (${o.value})`).join(' · ')}
                        </p>
                      </div>
                      {!locked && (
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant="ghost" aria-label={`Naikkan pertanyaan ${number}`} disabled={qi === 0} onClick={() => move(gi, qi, -1)}><ArrowUp className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" aria-label={`Turunkan pertanyaan ${number}`} disabled={qi === g.questions.length - 1} onClick={() => move(gi, qi, 1)}><ArrowDown className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" aria-label={`Keluarkan pertanyaan ${number}`} onClick={() => updateGroup(gi, (qs) => qs.filter((x) => x.id !== q.id))}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {!locked && (
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <select className={inputClass} aria-label={`Tambah pertanyaan ${g.unsur.name}`} disabled={!available.length} value="" onChange={(e) => addQuestion(gi, e.target.value)}>
                  <option value="">{available.length ? `Tambah pertanyaan (${available.length} tersedia)…` : 'Tidak ada pertanyaan tersisa untuk unsur ini'}</option>
                  {available.map((q) => <option key={q.id} value={q.id}>{q.text}</option>)}
                </select>
                <Button type="button" variant="outline" aria-label={`Tambah semua pertanyaan ${g.unsur.name}`} disabled={!available.length} onClick={() => updateGroup(gi, (qs) => [...qs, ...available])}>
                  <Plus className="w-4 h-4" /> Tambah semua
                </Button>
              </div>
            )}
          </section>
        );
      })}

      {!locked && (
        <div className="space-y-3 rounded-xl border border-dashed border-line-strong bg-surface-subtle/40 p-4">
          <label htmlFor="add-unsur" className="block text-xs font-semibold text-ink">Tambah unsur ke survei</label>
          <select id="add-unsur" className={inputClass} disabled={!unusedUnsur.length} value="" onChange={(e) => addUnsur(e.target.value)}>
            <option value="">{unusedUnsur.length ? 'Pilih unsur…' : 'Semua unsur sudah ditambahkan'}</option>
            {unusedUnsur.map((u) => <option key={u.id} value={u.id}>{unsurLabel(u)}</option>)}
          </select>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">Unsur tanpa pertanyaan tidak ikut disimpan.</p>
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

const mapLabels = (rows, labels) => rows.map((r) => ({ ...r, label: labels[r.label] || r.label }));

export function RespondentsView({ surveyId }) {
  const report = useReport(surveyId);
  if (!report) return <p className="text-sm text-ink-muted">Memuat data responden…</p>;
  const d = report.demographics;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-white p-4">
        <p className="text-xs text-ink-muted">Total responden</p>
        <p className="text-2xl font-bold text-ink">{report.respondents}</p>
        <p className="text-xs text-ink-muted">Data demografis sesuai Pedoman Menteri PANRB No. 9/2024. Persentase dihitung per responden.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DistributionTable title="Penyandang disabilitas" rows={d.disability} />
        <DistributionTable title="Jenis disabilitas" rows={mapLabels(d.disability_type, DISABILITY_LABELS)} />
        <DistributionTable title="Jenis kelamin" rows={d.gender} />
        <DistributionTable title="Usia" rows={d.age} />
        <DistributionTable title="Pendidikan" rows={d.education} />
        <DistributionTable title="Pekerjaan" rows={d.occupation} />
        <DistributionTable title="Jenis layanan yang diterima" rows={d.service_type} />
        <DistributionTable title="Kategori layanan" rows={mapLabels(d.service_category, SERVICE_CATEGORY_LABELS)} />
      </div>
    </div>
  );
}

const StatCard = ({ label, value, hint }) => (
  <div className="rounded-xl border border-line bg-white p-4">
    <p className="text-xs text-ink-muted">{label}</p>
    <p className="text-2xl font-bold text-ink">{value ?? '-'}</p>
    {hint && <p className="text-xs text-ink-muted">{hint}</p>}
  </div>
);

export function ReportView({ surveyId }) {
  const report = useReport(surveyId);
  if (!report) return <p className="text-sm text-ink-muted">Memuat laporan…</p>;
  const nps = report.nps;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Responden" value={report.respondents} />
        <StatCard label="Indeks Kepuasan Masyarakat (25–100)" value={report.index} />
        <StatCard label="Mutu / kinerja unit pelayanan" value={report.mutu ? `${report.mutu.grade} · ${report.mutu.label}` : null} />
      </div>

      <section className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Data persepsi per unsur</h4>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3">Unsur</th><th className="p-3">Jawaban</th><th className="p-3">Nilai persepsi (1–4)</th><th className="p-3">Nilai konversi</th><th className="p-3">Mutu</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {!report.unsur.length && <tr><td colSpan={5} className="p-3 text-xs text-ink-muted">Belum ada pertanyaan pilihan pada survei ini.</td></tr>}
              {report.unsur.map((u) => (
                <tr key={u.id}>
                  <td className="p-3"><span className="font-semibold text-ink">{unsurLabel(u)}</span>{u.definition && <p className="text-xs text-ink-muted">{u.definition}</p>}</td>
                  <td className="p-3">{u.answers}</td><td className="p-3">{u.average ?? '-'}</td><td className="p-3">{u.converted ?? '-'}</td>
                  <td className="p-3">{u.mutu ? `${u.mutu.grade} · ${u.mutu.label}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Kategori IKM (Pedoman PANRB 9/2024 hlm. 22)</h4>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3">Nilai persepsi</th><th className="p-3">Nilai interval (NI)</th><th className="p-3">Nilai interval konversi (NIK)</th><th className="p-3">Mutu pelayanan</th><th className="p-3">Kinerja unit</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {IKM_CATEGORIES.map((c) => (
                <tr key={c.mutu} className={report.mutu?.grade === c.mutu ? 'bg-brand-50 font-semibold' : ''}>
                  <td className="p-3">{c.persepsi}</td><td className="p-3">{c.interval}</td><td className="p-3">{c.konversi}</td><td className="p-3">{c.mutu}</td><td className="p-3">{c.kinerja}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-muted">IKM = rata-rata nilai persepsi seluruh unsur terisi × 25 (nilai penimbang sama untuk setiap unsur).</p>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <StatCard label="Kepuasan secara keseluruhan (1–5)" value={report.satisfaction.average}
          hint={report.satisfaction.average != null ? SATISFACTION_LABELS[Math.round(report.satisfaction.average)] : 'Belum ada data.'} />
        <StatCard label="Loyalitas — Net Promoter Score (−100 s.d. 100)" value={nps.score}
          hint={nps.respondents ? `${nps.promoters} promotor (9–10) · ${nps.passives} pasif (7–8) · ${nps.detractors} detraktor (1–6)` : 'Belum ada data.'} />
      </div>

      <section className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Pengukuran perilaku anti-korupsi (1–5: Sangat tidak setuju – Sangat setuju)</h4>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="p-3">Aspek</th><th className="p-3">Pernyataan</th><th className="p-3">Jawaban</th><th className="p-3">Rata-rata</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.anti_corruption.map((a) => (
                <tr key={a.key}>
                  <td className="p-3">{ANTI_CORRUPTION_STATEMENTS[a.key]?.aspect}</td><td className="p-3">{ANTI_CORRUPTION_STATEMENTS[a.key]?.text}</td>
                  <td className="p-3">{a.answers}</td><td className="p-3">{a.average ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-line bg-white p-4 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Kritik, saran & jawaban esai ({report.essays.length})</h4>
        {!report.essays.length ? <p className="text-xs text-ink-muted">Belum ada kritik atau saran.</p> : report.essays.map((e, i) => (
          <blockquote key={i} className="border-l-2 border-brand-300 pl-3 text-sm text-ink">
            {e.text}
            <footer className="text-xs text-ink-muted">{e.question} · {e.respondent || 'Responden'} · {formatDate(e.submitted_at)}</footer>
          </blockquote>
        ))}
      </div>
    </div>
  );
}

const yesNo = (v) => (v === true ? 'Ya' : v === false ? 'Tidak' : '-');

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
            <tr>
              <th className="p-3">Waktu survei</th><th className="p-3">Responden</th><th className="p-3">No. Pendaftaran</th>
              <th className="p-3">JK</th><th className="p-3">Usia</th><th className="p-3">Pendidikan</th><th className="p-3">Pekerjaan</th>
              <th className="p-3">Kategori layanan</th><th className="p-3">Kepuasan</th><th className="p-3">NPS</th><th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((r) => (
              <React.Fragment key={r.id}>
                <tr>
                  <td className="p-3 text-xs">{formatDateTime(r.submitted_at)}</td>
                  <td className="p-3">{r.registration?.publisher?.legal_name || r.respondent_name || '-'}</td>
                  <td className="p-3 font-mono text-xs">{r.registration?.registration_no || '-'}</td>
                  <td className="p-3">{r.gender || '-'}</td><td className="p-3">{r.age ?? '-'}</td><td className="p-3">{r.education || '-'}</td><td className="p-3">{r.occupation || '-'}</td>
                  <td className="p-3">{SERVICE_CATEGORY_LABELS[r.service_category] || '-'}</td>
                  <td className="p-3">{r.overall_satisfaction ?? '-'}</td><td className="p-3">{r.nps_score ?? '-'}</td>
                  <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Tutup' : 'Lihat jawaban'}</Button></td>
                </tr>
                {open === r.id && (
                  <tr><td colSpan={11} className="bg-surface-subtle/50 p-3">
                    <div className="grid gap-4 md:grid-cols-2 text-xs">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                        <dt className="text-ink-muted">Penyandang disabilitas</dt><dd>{yesNo(r.is_disabled)}{r.is_disabled && r.disability_type ? ` — ${DISABILITY_LABELS[r.disability_type] || r.disability_type}` : ''}</dd>
                        <dt className="text-ink-muted">Jenis layanan</dt><dd>{r.service_type || '-'}</dd>
                        <dt className="text-ink-muted">Menerima layanan</dt><dd>{formatDateTime(r.service_received_at)}</dd>
                        <dt className="text-ink-muted">Kepuasan keseluruhan</dt><dd>{r.overall_satisfaction ? `${r.overall_satisfaction} — ${SATISFACTION_LABELS[r.overall_satisfaction]}` : '-'}</dd>
                        <dt className="text-ink-muted">Loyalitas (1–10)</dt><dd>{r.nps_score ?? '-'}</dd>
                        {Object.entries(ANTI_CORRUPTION_STATEMENTS).map(([key, s]) => (
                          <React.Fragment key={key}><dt className="text-ink-muted">{s.text}</dt><dd>{r[key] ?? '-'}</dd></React.Fragment>
                        ))}
                        <dt className="text-ink-muted">Kritik dan saran</dt><dd>{r.feedback || '-'}</dd>
                      </dl>
                      <ul className="space-y-1.5">
                        <li className="font-semibold text-ink">Data persepsi</li>
                        {!r.answers.length && <li className="text-ink-muted">Tidak ada jawaban.</li>}
                        {r.answers.map((a) => (
                          <li key={a.id}><span className="text-ink-muted">{a.question.text}</span> → <strong className="text-ink">{a.option?.label || a.essay_text || '-'}</strong>{a.value != null && ` (${a.value})`}</li>
                        ))}
                      </ul>
                    </div>
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
