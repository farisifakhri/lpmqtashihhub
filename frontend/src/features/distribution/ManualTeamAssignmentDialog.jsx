import React, { useEffect, useRef, useState } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { masterApi } from '@/api/master.api';

export function ManualTeamAssignmentDialog({ id, onClose, onAssigned }) {
  const dialog = useRef(null);
  const [registration, setRegistration] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [selected, setSelected] = useState([]);
  const [juzByAssignee, setJuzByAssignee] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const previousFocus = document.activeElement;
    const element = dialog.current;
    if (element.showModal) element.showModal(); else element.setAttribute('open', '');
    Promise.all([registrationApi.getDetail(id), masterApi.getDistributionTeams()])
      .then(([detail, list]) => {
        if (!active) return;
        setRegistration(detail.data);
        const now = new Date();
        setTeams((list.data || []).filter(team => team.status === 'ACTIVE' && new Date(team.active_from) <= now && (!team.active_to || new Date(team.active_to) >= now)));
      }).catch(err => { if (active) setError(err.message || 'Data penugasan tidak dapat dimuat.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (element.close) element.close(); previousFocus?.focus(); };
  }, [id]);
  const previous = registration?.assignments?.length > 0;
  const stage = previous ? 'REVISION' : registration?.registration_type === 'EXTENSION' ? 'DUMMY' : 'INITIAL';
  const team = teams.find(item => item.id === teamId);
  const members = (team?.members || []).filter(member => member.status === 'ACTIVE' && member.user?.status === 'ACTIVE' && member.user.roles?.some(item => (item.role?.code || item) === 'PENTASHIH'));
  const ready = registration?.status === 'WAITING_DISTRIBUTION' && registration.payment_records?.some(item => item.status === 'VERIFIED');
  const allSelectedHaveJuz = selected.length > 0 && selected.every(userId => (juzByAssignee[userId] || []).length > 0);
  const toggleJuz = (userId, juzNumber) => setJuzByAssignee(previous => {
    const current = previous[userId] || [];
    return { ...previous, [userId]: current.includes(juzNumber) ? current.filter(value => value !== juzNumber) : [...current, juzNumber].sort((a, b) => a - b) };
  });
  const toggleMember = (userId, checked) => {
    setSelected(previous => checked ? [...previous, userId] : previous.filter(id => id !== userId));
    if (!checked) setJuzByAssignee(previous => ({ ...previous, [userId]: [] }));
  };
  const submit = async event => {
    event.preventDefault();
    if (!ready || !teamId || !allSelectedHaveJuz || saving) return;
    setSaving(true); setError('');
    try {
      await registrationApi.createAssignments(id, { team_id: teamId, juz_assignments: selected.map(assignee_id => ({ assignee_id, juz_numbers: juzByAssignee[assignee_id] })), stage });
      onAssigned();
    } catch (err) { setError(err.message || 'Penugasan gagal. Muat ulang untuk memeriksa status terbaru.'); }
    finally { setSaving(false); }
  };
  return <dialog ref={dialog} aria-labelledby="manual-team-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }} className="w-[calc(100%_-_2rem)] max-w-xl max-h-[85vh] overflow-auto rounded-2xl p-0 shadow-xl backdrop:bg-ink/50">
    <div className="flex items-center justify-between gap-4 border-b border-line p-5"><h2 id="manual-team-title" className="flex items-center gap-2 font-bold text-ink"><Users className="h-5 w-5 text-brand-700" />Tetapkan tim pentashih</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Tutup penugasan tim" className="rounded-lg p-2 hover:bg-surface-subtle disabled:opacity-40"><X className="h-5 w-5" /></button></div>
    <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-civic-dangerSoft p-3 text-sm text-civic-danger"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p>}
      {loading ? <p role="status" className="text-sm text-ink-muted">Memuat tim dan kelayakan pengajuan…</p> : registration && <>
        <div><p className="font-mono text-xs text-brand-700">{registration.registration_no}</p><p className="font-bold text-ink mt-1">{registration.title}</p><p className="text-xs text-ink-muted mt-1">Tahap {stage} · Tenggat dihitung server dari kalender hari kerja.</p></div>
        {!ready && <p className="rounded-lg bg-civic-warningSoft p-3 text-sm text-civic-warning">Pengajuan harus berstatus Menunggu Distribusi dan pembayaran sudah terverifikasi. Admin tidak dapat melewati tahapan verifikasi atau penerimaan fisik.</p>}
        <div><label htmlFor="manual-team-select" className="block text-sm font-semibold text-ink mb-2">Tim dengan SK aktif</label><select id="manual-team-select" disabled={!ready || saving} value={teamId} onChange={event => { setTeamId(event.target.value); setSelected([]); setJuzByAssignee({}); }} className="w-full rounded-lg border border-line-strong px-3 py-2.5 text-sm"><option value="">Pilih tim pentashih</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name} · {item.decree_no}</option>)}</select>{!teams.length && <p className="text-xs text-civic-warning mt-2">Belum ada tim dengan SK aktif. Hubungi Super Admin.</p>}</div>
        {teamId && <fieldset disabled={saving || !ready} className="space-y-3"><legend className="text-sm font-semibold text-ink mb-2">Pentashih aktif ({selected.length} dipilih)</legend><p className="text-xs text-ink-muted">Pilih juz naskah untuk tiap pentashih. Target kerja: 2 juz per orang per hari sebagai panduan.</p>{members.length ? members.map(member => <div key={member.user_id} className="rounded-lg border border-line p-3"><label className="flex gap-3 items-center text-sm cursor-pointer"><input type="checkbox" checked={selected.includes(member.user_id)} onChange={event => toggleMember(member.user_id, event.target.checked)} className="h-4 w-4 accent-brand-700" /><span>{member.user.name}</span></label>{selected.includes(member.user_id) && <div className="mt-3 grid grid-cols-6 sm:grid-cols-10 gap-1.5" aria-label={`Juz untuk ${member.user.name}`}>{Array.from({ length: 30 }, (_, index) => index + 1).map(juzNumber => { const owner = selected.find(userId => userId !== member.user_id && (juzByAssignee[userId] || []).includes(juzNumber)); const checked = (juzByAssignee[member.user_id] || []).includes(juzNumber); return <label key={juzNumber} className={`rounded-md border p-1 text-center text-xs ${checked ? 'bg-brand-700 text-white border-brand-700' : 'border-line text-ink'} ${owner ? 'opacity-40' : 'cursor-pointer'}`}><input type="checkbox" className="sr-only" aria-label={`Juz ${juzNumber} untuk ${member.user.name}`} checked={checked} disabled={Boolean(owner)} onChange={() => toggleJuz(member.user_id, juzNumber)} />{juzNumber}</label>; })}</div>}</div>) : <p className="text-xs text-civic-warning">Tim ini belum memiliki pentashih aktif yang memenuhi syarat.</p>}</fieldset>}
      </>}
      <p className="text-xs text-ink-muted">Tindakan ini hanya menetapkan tim pentashihan. Bukan persetujuan SOP, hasil sidang, atau pengesahan STT.</p>
      <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-line-strong px-4 py-2 text-sm disabled:opacity-40">Batal</button><button type="submit" disabled={loading || saving || !ready || !teamId || !allSelectedHaveJuz} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-40">{saving ? 'Menyimpan…' : 'Tetapkan penugasan'}</button></div>
    </form>
  </dialog>;
}
