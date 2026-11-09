import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Clock, Lock, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/toast';
import { publisherSurveyApi } from '@/api/publisher-survey.api';
import {
  inputClass, SATISFACTION_LABELS, ANTI_CORRUPTION_STATEMENTS, formatDateTime,
} from '@/features/internal/survey/survey-constants';

const GENDERS = [['L', 'Laki-laki'], ['P', 'Perempuan']];
const EDUCATIONS = ['SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3'];
const OCCUPATIONS = [['PNS', 'PNS'], ['TNI/POLRI', 'TNI/Polri'], ['SWASTA', 'Pegawai Swasta'], ['WIRASWASTA', 'Wiraswasta'], ['PELAJAR/MAHASISWA', 'Pelajar/Mahasiswa'], ['LAINNYA', 'Lainnya']];

const emptyForm = () => ({
  answers: {}, essays: {}, respondent_name: '', gender: '', age: '', education: '', occupation: '',
  overall_satisfaction: '', nps_score: '', ak_transparency: '', ak_no_extortion: '', ak_no_broker: '', ak_no_gratification: '',
  feedback: '',
});

const QUESTIONS_PER_PAGE = 4;

// Pertanyaan survei dikelompokkan per unsur, urut sesuai susunan Pemilihan Survei.
const groupByUnsur = (items = []) => {
  const groups = [];
  for (const item of items) {
    let g = groups.find((x) => x.unsur.id === item.unsur.id);
    if (!g) groups.push(g = { unsur: item.unsur, questions: [] });
    g.questions.push(item.question);
  }
  return groups;
};

// scale: pilihan tampil sebagai skala selebar baris (lebar seragam, dari negatif di kiri ke positif di kanan).
function ScaleRow({ name, value, onChange, options, hint, scale = false }) {
  return (
    <div className="space-y-1.5">
      <div className={scale ? 'grid grid-cols-2 gap-1.5 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none' : 'flex flex-wrap gap-1.5'}>
        {options.map(([val, label]) => {
          const on = String(value) === String(val);
          return (
            <label key={val}
              className={`relative flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 text-center text-xs font-semibold transition-colors focus-within:ring-2 focus-within:ring-brand-700 ${
                scale ? 'min-h-[44px] py-2' : 'py-1.5'} ${
                on ? 'border-brand-700 bg-brand-700 text-white shadow-xs' : 'border-line-strong bg-white text-ink hover:border-brand-700 hover:bg-brand-50'}`}>
              <input type="radio" className="sr-only" name={name} value={val} checked={on} onChange={() => onChange(val)} />
              {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              {label}
            </label>
          );
        })}
      </div>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

// Perkiraan waktu jujur (±15 detik per pertanyaan): angka besar membuat orang enggan memulai.
const estimateMinutes = (questionCount) => Math.max(1, Math.ceil((questionCount * 15) / 60));

// Data responden yang lengkap dari survei sebelumnya; null bila belum ada.
const RESPONDENT_FIELDS = ['respondent_name', 'gender', 'age', 'education', 'occupation'];
const completeRespondent = (r) => (r && RESPONDENT_FIELDS.every((k) => String(r[k] ?? '').trim() !== '') ? r : null);

function SurveyForm({ survey, onSubmit, saving, respondent, withClosing = true }) {
  // Responden sudah diisi di survei sebelumnya: pakai ulang dan lewati bagian Data Responden.
  const [form, setForm] = useState(() => ({
    ...emptyForm(),
    ...(respondent ? Object.fromEntries(RESPONDENT_FIELDS.map((k) => [k, String(respondent[k])])) : {}),
  }));
  const groups = useMemo(() => groupByUnsur(survey.items), [survey.items]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  // Unsur digabung per halaman (±4 pertanyaan): satu unsur satu layar terlalu banyak klik,
  // semua sekaligus terlalu panjang digulung.
  const pages = useMemo(() => {
    const result = [];
    let current = [];
    let count = 0;
    for (const g of groups) {
      current.push(g);
      count += g.questions.length;
      if (count >= QUESTIONS_PER_PAGE) { result.push(current); current = []; count = 0; }
    }
    if (current.length) result.push(current);
    return result;
  }, [groups]);
  const questionNo = useMemo(() => new Map(groups.flatMap((g) => g.questions).map((q, i) => [q.id, i + 1])), [groups]);
  const [skipResponden] = useState(() => Boolean(respondent)); // diputuskan saat form dibuka
  // Kepuasan, loyalitas, dan anti-korupsi cukup ditanyakan sekali, di survei terakhir.
  const [closing] = useState(withClosing);
  const steps = useMemo(() => [...(skipResponden ? [] : ['responden']), ...pages, ...(closing ? ['penilaian'] : [])], [pages, skipResponden, closing]);
  const [step, setStep] = useState(0);
  const formRef = useRef(null);
  // Pindah bagian: mulai dari atas lagi, bukan dari posisi gulungan bagian sebelumnya.
  useEffect(() => {
    let el = formRef.current?.parentElement;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    el?.scrollTo?.({ top: 0 });
  }, [step]);
  const atResponden = steps[step] === 'responden';
  const atPage = Array.isArray(steps[step]) ? steps[step] : null;
  const isLast = step === steps.length - 1;
  const atPenilaian = steps[step] === 'penilaian';

  // Seluruh isian pada bagian ini wajib terisi sebelum lanjut/kirim.
  const filled = (v) => String(v ?? '').trim() !== '';
  const unansweredCount = atPage
    ? atPage.flatMap((g) => g.questions).filter((q) => !filled(q.type === 'ESAI' ? form.essays[q.id] : form.answers[q.id])).length : 0;
  const missing = atResponden
    ? [['Nama responden', form.respondent_name], ['Usia', form.age], ['Jenis kelamin', form.gender],
      ['Pendidikan terakhir', form.education], ['Pekerjaan', form.occupation]]
      .filter(([, v]) => !filled(v)).map(([label]) => label)
    : atPage
      ? (unansweredCount ? [`${unansweredCount} pertanyaan`] : [])
      : [['Kepuasan keseluruhan', form.overall_satisfaction], ['Rekomendasi', form.nps_score],
        ...Object.keys(ANTI_CORRUPTION_STATEMENTS).map((key) => ['pernyataan anti-korupsi', form[key]]),
        ['Kritik dan saran', form.feedback]]
        .filter(([, v]) => !filled(v)).map(([label]) => label)
        .reduce((acc, label) => { // gabungkan pernyataan anti-korupsi: "2 pernyataan anti-korupsi"
          const prev = acc.find((x) => x.label === label);
          if (prev) prev.n += 1; else acc.push({ label, n: 1 });
          return acc;
        }, []).map(({ label, n }) => (n > 1 ? `${n} ${label}` : label));
  const ageInvalid = atResponden && filled(form.age) && (Number(form.age) < 10 || Number(form.age) > 100);
  const blocked = missing.length > 0 || ageInvalid;

  const next = () => {
    if (blocked) { showToast('Lengkapi seluruh isian pada bagian ini dulu.', 'danger'); return; }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!isLast || blocked) { next(); return; }
    const answers = [];
    for (const g of groups) {
      for (const q of g.questions) {
        if (q.type === 'ESAI') {
          if (form.essays[q.id]?.trim()) answers.push({ question_id: q.id, essay_text: form.essays[q.id].trim() });
        } else {
          answers.push({ question_id: q.id, option_id: form.answers[q.id] });
        }
      }
    }
    const kosong = answers.find((a) => a.option_id === undefined && a.essay_text === undefined);
    if (kosong) { showToast('Masih ada pertanyaan pilihan yang belum dijawab.', 'danger'); return; }
    const num = (v) => (v === '' || v === null ? null : Number(v));
    onSubmit(survey.id, {
      answers,
      respondent_name: form.respondent_name || null,
      gender: form.gender || null,
      age: num(form.age),
      education: form.education || null,
      occupation: form.occupation || null,
      overall_satisfaction: num(form.overall_satisfaction),
      nps_score: num(form.nps_score),
      ak_transparency: num(form.ak_transparency),
      ak_no_extortion: num(form.ak_no_extortion),
      ak_no_broker: num(form.ak_no_broker),
      ak_no_gratification: num(form.ak_no_gratification),
      feedback: form.feedback || null,
    });
  };

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle">
          <div className="h-1.5 rounded-full bg-brand-700 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-xs font-semibold text-ink-muted">Bagian {step + 1} dari {steps.length}</span>
      </div>

      {atResponden && (
      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-800">Data responden</h3>
          <p className="text-xs text-ink-muted">Cukup diisi sekali untuk semua survei. Data Anda dijaga kerahasiaannya.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink">Nama responden</span>
            <input className={inputClass} maxLength={255} value={form.respondent_name} onChange={(e) => set({ respondent_name: e.target.value })} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink">Usia</span>
            <input className={inputClass} type="number" min={10} max={100} value={form.age} onChange={(e) => set({ age: e.target.value })} />
          </label>
          <div className="space-y-1 text-sm">
            <span className="font-semibold text-ink">Jenis kelamin</span>
            <ScaleRow name={`gender-${survey.id}`} value={form.gender} onChange={(v) => set({ gender: v })} options={GENDERS} />
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink">Pendidikan terakhir</span>
            <select className={inputClass} value={form.education} onChange={(e) => set({ education: e.target.value })}>
              <option value="">Pilih…</option>
              {EDUCATIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink">Pekerjaan</span>
            <select className={inputClass} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })}>
              <option value="">Pilih…</option>
              {OCCUPATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>
      </section>
      )}

      {atPage && atPage.map((g) => (
        <section key={g.unsur.id} className="space-y-4 rounded-xl border border-line bg-white p-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-800">{g.unsur.name}</h3>
            {g.unsur.definition && <p className="text-xs leading-relaxed text-ink-muted">{g.unsur.definition}</p>}
          </div>
          {g.questions.map((q) => {
            const done = filled(q.type === 'ESAI' ? form.essays[q.id] : form.answers[q.id]);
            return (
            <div key={q.id} className="space-y-2.5 border-t border-line pt-3">
              <p className="flex items-start gap-2.5 text-sm text-ink">
                {/* Nomor berubah jadi centang setelah dijawab: penerbit melihat kemajuannya per pertanyaan. */}
                <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done ? 'bg-civic-success text-white' : 'bg-surface-subtle text-ink-muted'}`}>
                  {done ? <Check className="h-3 w-3" /> : questionNo.get(q.id)}
                </span>
                <span className="sr-only">{questionNo.get(q.id)}.</span>
                <span>{q.text}</span>
              </p>
              {q.type === 'ESAI' ? (
                <textarea className={inputClass} rows={3} maxLength={2000} value={form.essays[q.id] || ''}
                  aria-label={q.text}
                  onChange={(e) => set({ essays: { ...form.essays, [q.id]: e.target.value } })} />
              ) : (
                <ScaleRow name={`q-${q.id}`} value={form.answers[q.id]}
                  onChange={(v) => set({ answers: { ...form.answers, [q.id]: v } })}
                  options={[...q.options].sort((a, b) => a.value - b.value).map((o) => [o.id, o.label])} scale />
              )}
            </div>
            );
          })}
        </section>
      ))}

      {atPenilaian && (
      <section className="space-y-4 rounded-xl border border-line bg-white p-4">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-800">Kepuasan, loyalitas, dan anti-korupsi</h3>
          <p className="text-xs text-ink-muted">Pertanyaan penutup, cukup sekali. Seberapa setuju Anda dengan pernyataan berikut?</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-ink">Secara keseluruhan, seberapa puas Anda terhadap layanan pentashihan?</p>
          <ScaleRow name={`puas-${survey.id}`} value={form.overall_satisfaction} onChange={(v) => set({ overall_satisfaction: v })}
            options={Object.entries(SATISFACTION_LABELS).map(([v, l]) => [v, l])} scale />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-ink">Seberapa besar kemungkinan Anda merekomendasikan layanan ini?</p>
          <ScaleRow name={`nps-${survey.id}`} value={form.nps_score} onChange={(v) => set({ nps_score: v })}
            options={Array.from({ length: 10 }, (_, i) => [i + 1, String(i + 1)])} scale
            hint="1 = tidak merekomendasikan, 10 = sangat merekomendasikan" />
        </div>
        {Object.entries(ANTI_CORRUPTION_STATEMENTS).map(([key, s]) => (
          <div key={key} className="space-y-2">
            <p className="text-sm text-ink"><span className="font-semibold">{s.aspect}:</span> {s.text}</p>
            <ScaleRow name={`${key}-${survey.id}`} value={form[key]} onChange={(v) => set({ [key]: v })}
              options={[[1, 'Sangat Tidak Setuju'], [2, 'Tidak Setuju'], [3, 'Netral'], [4, 'Setuju'], [5, 'Sangat Setuju']]} scale />
          </div>
        ))}
        <label className="space-y-1 text-sm block">
          <span className="font-semibold text-ink">Kritik dan saran</span>
          <textarea className={inputClass} rows={3} maxLength={2000} value={form.feedback} onChange={(e) => set({ feedback: e.target.value })} />
        </label>
      </section>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" disabled={step === 0 || saving} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Kembali
        </Button>
        <div className="flex items-center gap-3">
          {blocked && (
            <p className="text-right text-xs text-civic-warning" role="status">
              {ageInvalid ? 'Usia harus 10–100 tahun.' : `Belum diisi: ${missing.join(', ')}.`}
            </p>
          )}
          <Button type="submit" disabled={saving || blocked}>
            {saving ? 'Menyimpan…' : !isLast ? 'Lanjut' : closing ? 'Kirim Survei' : 'Simpan & Lanjut ke Survei Berikutnya'}
          </Button>
        </div>
      </div>
    </form>
  );
}

// Pop-up survei: muncul saat penerbit menekan Unduh STT dan masih ada survei yang belum diisi.
// Setelah seluruh survei terisi, unduhan STT diteruskan lewat onCompleted().
export function PublisherSurveyDialog({ registrationId, isOpen, onClose, onCompleted }) {
  const [surveys, setSurveys] = useState(null);
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastRespondent, setLastRespondent] = useState(null); // dari survei yang baru saja dikirim

  const load = useCallback(() => {
    if (!isOpen || !registrationId) return;
    publisherSurveyApi.listForRegistration(registrationId)
      .then((res) => {
        const list = res.data || [];
        setSurveys(list);
        setActive((cur) => cur || list.find((s) => !s.answered)?.id || list[0]?.id || null);
      })
      .catch(() => setSurveys([]));
  }, [isOpen, registrationId]);
  useEffect(load, [load]);

  const submit = async (surveyId, body) => {
    setSaving(true);
    try {
      await publisherSurveyApi.submit(registrationId, surveyId, body);
      setLastRespondent(body);
      const res = await publisherSurveyApi.listForRegistration(registrationId);
      const list = res.data || [];
      setSurveys(list);
      const sisa = list.filter((s) => !s.answered);
      if (!sisa.length) {
        showToast('Terima kasih. Survei selesai, Surat Tanda Tashih sedang diunduh.', 'success');
        onCompleted?.();
        return;
      }
      showToast(`Tersimpan. Tersisa ${sisa.length} survei lagi.`, 'success');
      setActive(sisa[0].id);
    } catch { /* pesan galat sudah ditampilkan apiClient */ } finally {
      setSaving(false);
    }
  };

  const belum = (surveys || []).filter((s) => !s.answered).length;
  const sisaPertanyaan = (surveys || []).filter((s) => !s.answered).reduce((n, s) => n + s.items.length, 0);
  const dipilih = (surveys || []).find((s) => s.id === active);
  const respondent = completeRespondent(lastRespondent)
    || (surveys || []).map((s) => completeRespondent(s.respondent)).find(Boolean) || null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl"
      title="Isi Survei Kepuasan Layanan"
      description="Surat Tanda Tashih dapat diunduh setelah survei ini Anda isi. Jawaban dipakai untuk perbaikan mutu layanan.">
      {!surveys ? <p className="text-sm text-ink-muted">Memuat survei…</p> : !surveys.length ? (
        <p className="text-sm text-ink-muted">Tidak ada survei yang perlu diisi.</p>
      ) : (
        <div className="space-y-4">
          {/* Sapaan: ajakan, bukan peringatan. */}
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${belum
            ? 'border-brand-100 bg-brand-50'
            : 'border-civic-successLine bg-civic-successSoft'}`}>
            {belum
              ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-civic-success" />}
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-ink">
                {belum ? 'Satu langkah lagi untuk membuka Surat Tanda Tashih Anda' : 'Terima kasih, seluruh survei sudah terisi.'}
              </p>
              {belum > 0 && (
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-muted">
                  <span>{belum} survei singkat</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />sekitar {estimateMinutes(sisaPertanyaan)} menit</span>
                  <span aria-hidden="true">·</span>
                  <span>jawaban Anda membantu kami meningkatkan layanan.</span>
                </p>
              )}
            </div>
          </div>

          {/* Langkah survei: diisi berurutan, survei berikutnya terkunci sampai yang sebelumnya terkirim. */}
          {surveys.length > 1 && (
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" role="tablist" aria-label="Daftar survei">
              {surveys.map((s, i) => {
                const locked = surveys.slice(0, i).some((prev) => !prev.answered);
                const current = s.id === active;
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className={`h-px w-4 ${s.answered || current ? 'bg-brand-700' : 'bg-line-strong'}`} />}
                    <button type="button" role="tab" aria-selected={current} disabled={locked}
                      title={locked ? 'Isi survei sebelumnya terlebih dahulu' : undefined} onClick={() => setActive(s.id)}
                      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                        current ? 'border-brand-700 bg-brand-700 text-white'
                          : s.answered ? 'border-civic-successLine bg-civic-successSoft text-civic-success'
                            : 'border-line bg-white text-ink-muted'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                        current ? 'bg-white text-brand-800' : s.answered ? 'bg-civic-success text-white' : 'bg-surface-subtle'}`}>
                        {s.answered ? <Check className="h-3 w-3" /> : locked ? <Lock className="h-3 w-3" /> : i + 1}
                      </span>
                      {s.name}
                      <span className="sr-only">{s.answered ? '(terisi)' : locked ? '(terkunci)' : '(belum diisi)'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {dipilih && (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-ink">{dipilih.name}</h3>
                {dipilih.description && <p className="text-xs text-ink-muted">{dipilih.description}</p>}
                <p className="text-xs text-ink-muted">{dipilih.items.length} pertanyaan · sekitar {estimateMinutes(dipilih.items.length)} menit</p>
              </div>
              {dipilih.answered ? (
                <p className="flex items-center gap-2 rounded-xl border border-civic-successLine bg-civic-successSoft p-3 text-sm text-civic-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Sudah Anda isi pada {formatDateTime(dipilih.answered_at)}.
                </p>
              ) : (
                <SurveyForm key={dipilih.id} survey={dipilih} onSubmit={submit} saving={saving} respondent={respondent}
                  withClosing={belum <= 1} />
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default PublisherSurveyDialog;
