import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { showToast } from '@/components/ui/toast';
import { publisherSurveyApi } from '@/api/publisher-survey.api';
import {
  inputClass, unsurLabel, SATISFACTION_LABELS, ANTI_CORRUPTION_STATEMENTS, formatDateTime,
} from '@/features/internal/survey/survey-constants';

const GENDERS = [['L', 'Laki-laki'], ['P', 'Perempuan']];
const EDUCATIONS = ['SD', 'SMP', 'SMA', 'D3', 'S1', 'S2', 'S3'];
const OCCUPATIONS = ['PNS', 'TNI/POLRI', 'SWASTA', 'WIRASWASTA', 'PELAJAR/MAHASISWA', 'LAINNYA'];
const DISABILITIES = [['FISIK', 'Fisik (Tuna Daksa)'], ['INTELEKTUAL', 'Intelektual'], ['MENTAL', 'Mental'], ['SENSORIK', 'Sensorik (Tuli/Tuna Netra)']];
const CATEGORIES = [['DARING', 'Daring'], ['LURING', 'Luring'], ['HYBRID', 'Campuran (Hybrid)']];

const emptyForm = () => ({
  answers: {}, essays: {}, respondent_name: '', gender: '', age: '', education: '', occupation: '',
  is_disabled: false, disability_type: '', service_category: 'HYBRID',
  overall_satisfaction: '', nps_score: '', ak_transparency: '', ak_no_extortion: '', ak_no_broker: '', ak_no_gratification: '',
  feedback: '',
});

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

function ScaleRow({ name, value, onChange, options, hint }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {options.map(([val, label]) => (
          <label key={val}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              String(value) === String(val) ? 'border-brand-700 bg-brand-700 text-white' : 'border-line-strong bg-white text-ink hover:border-brand-700'}`}>
            <input type="radio" className="sr-only" name={name} value={val} checked={String(value) === String(val)} onChange={() => onChange(val)} />
            {label}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function SurveyForm({ survey, onSubmit, saving }) {
  const [form, setForm] = useState(emptyForm);
  const groups = useMemo(() => groupByUnsur(survey.items), [survey.items]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (event) => {
    event.preventDefault();
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
      is_disabled: form.is_disabled,
      disability_type: form.is_disabled ? (form.disability_type || null) : null,
      service_category: form.service_category || null,
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
    <form onSubmit={submit} className="space-y-5">
      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Data responden</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-ink">Nama pengisi</span>
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
              {OCCUPATIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <div className="space-y-1 text-sm">
            <span className="font-semibold text-ink">Kategori layanan</span>
            <ScaleRow name={`kategori-${survey.id}`} value={form.service_category} onChange={(v) => set({ service_category: v })} options={CATEGORIES} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={form.is_disabled} onChange={(e) => set({ is_disabled: e.target.checked })} />
          Saya penyandang disabilitas
        </label>
        {form.is_disabled && (
          <ScaleRow name={`disabilitas-${survey.id}`} value={form.disability_type} onChange={(v) => set({ disability_type: v })} options={DISABILITIES} />
        )}
      </section>

      {groups.map((g, gi) => (
        <section key={g.unsur.id} className="space-y-4 rounded-xl border border-line bg-white p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-ink">{gi + 1}. {unsurLabel(g.unsur)}</h3>
            {g.unsur.definition && <p className="text-xs leading-relaxed text-ink-muted">{g.unsur.definition}</p>}
          </div>
          {g.questions.map((q) => (
            <div key={q.id} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
              <p className="text-sm text-ink">{q.text}</p>
              {q.type === 'ESAI' ? (
                <textarea className={inputClass} rows={3} maxLength={2000} value={form.essays[q.id] || ''}
                  aria-label={q.text}
                  onChange={(e) => set({ essays: { ...form.essays, [q.id]: e.target.value } })} />
              ) : (
                <ScaleRow name={`q-${q.id}`} value={form.answers[q.id]}
                  onChange={(v) => set({ answers: { ...form.answers, [q.id]: v } })}
                  options={q.options.map((o) => [o.id, o.label])} />
              )}
            </div>
          ))}
        </section>
      ))}

      <section className="space-y-4 rounded-xl border border-line bg-white p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Kepuasan, loyalitas, dan anti-korupsi</h3>
        <div className="space-y-2">
          <p className="text-sm text-ink">Secara keseluruhan, seberapa puas Anda terhadap layanan pentashihan?</p>
          <ScaleRow name={`puas-${survey.id}`} value={form.overall_satisfaction} onChange={(v) => set({ overall_satisfaction: v })}
            options={Object.entries(SATISFACTION_LABELS).map(([v, l]) => [v, l])} />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-ink">Seberapa besar kemungkinan Anda merekomendasikan layanan ini?</p>
          <ScaleRow name={`nps-${survey.id}`} value={form.nps_score} onChange={(v) => set({ nps_score: v })}
            options={Array.from({ length: 10 }, (_, i) => [i + 1, String(i + 1)])}
            hint="1 = tidak merekomendasikan, 10 = sangat merekomendasikan" />
        </div>
        {Object.entries(ANTI_CORRUPTION_STATEMENTS).map(([key, s]) => (
          <div key={key} className="space-y-2">
            <p className="text-sm text-ink"><span className="font-semibold">{s.aspect}:</span> {s.text}</p>
            <ScaleRow name={`${key}-${survey.id}`} value={form[key]} onChange={(v) => set({ [key]: v })}
              options={[[1, 'Sangat Tidak Setuju'], [2, 'Tidak Setuju'], [3, 'Netral'], [4, 'Setuju'], [5, 'Sangat Setuju']]} />
          </div>
        ))}
        <label className="space-y-1 text-sm block">
          <span className="font-semibold text-ink">Kritik dan saran</span>
          <textarea className={inputClass} rows={3} maxLength={2000} value={form.feedback} onChange={(e) => set({ feedback: e.target.value })} />
        </label>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>{saving ? 'Mengirim…' : `Kirim ${survey.name}`}</Button>
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
      const res = await publisherSurveyApi.listForRegistration(registrationId);
      const list = res.data || [];
      setSurveys(list);
      const sisa = list.filter((s) => !s.answered);
      if (!sisa.length) {
        showToast('Terima kasih. Survei selesai, STT sedang diunduh.', 'success');
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
  const dipilih = (surveys || []).find((s) => s.id === active);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl"
      title="Isi Survei Kepuasan Layanan"
      description="Surat Tanda Tashih dapat diunduh setelah survei ini Anda isi. Jawaban dipakai untuk perbaikan mutu layanan.">
      {!surveys ? <p className="text-sm text-ink-muted">Memuat survei…</p> : !surveys.length ? (
        <p className="text-sm text-ink-muted">Tidak ada survei yang perlu diisi.</p>
      ) : (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${belum
            ? 'border-civic-warningLine bg-civic-warningSoft text-civic-warning'
            : 'border-civic-successLine bg-civic-successSoft text-civic-success'}`}>
            {belum ? <Lock className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {belum ? `${belum} survei belum diisi.` : 'Seluruh survei sudah terisi.'}
          </div>

          {/* Pembagian per nama survei */}
          {surveys.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Daftar survei">
              {surveys.map((s) => (
                <button key={s.id} type="button" role="tab" aria-selected={s.id === active} onClick={() => setActive(s.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    s.id === active ? 'border-brand-800 bg-brand-800 text-white' : 'border-line-strong bg-white text-ink hover:border-brand-700'}`}>
                  {s.answered ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                  {s.name}
                  <Badge variant={s.answered ? 'success' : 'warning'}>{s.answered ? 'Terisi' : 'Belum'}</Badge>
                </button>
              ))}
            </div>
          )}

          {dipilih && (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-surface-subtle/40 p-3">
                <h3 className="text-sm font-bold text-ink">{dipilih.name}</h3>
                {dipilih.description && <p className="mt-0.5 text-xs text-ink-muted">{dipilih.description}</p>}
                <p className="mt-0.5 text-xs text-ink-muted">{dipilih.items.length} pertanyaan · perkiraan 10 menit</p>
              </div>
              {dipilih.answered ? (
                <p className="flex items-center gap-2 rounded-xl border border-civic-successLine bg-civic-successSoft p-3 text-sm text-civic-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Sudah Anda isi pada {formatDateTime(dipilih.answered_at)}.
                </p>
              ) : (
                <SurveyForm survey={dipilih} onSubmit={submit} saving={saving} />
              )}
            </div>
          )}

          <div className="flex justify-end border-t border-line pt-3">
            <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default PublisherSurveyDialog;
