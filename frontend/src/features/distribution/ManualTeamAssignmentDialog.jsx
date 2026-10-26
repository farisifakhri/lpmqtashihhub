import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Users, AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { registrationApi } from '@/api/registration.api';
import { masterApi } from '@/api/master.api';

export function ManualTeamAssignmentDialog({ id, onClose, onAssigned }) {
  const dialog = useRef(null);
  const [registration, setRegistration] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [allCandidates, setAllCandidates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [juzByAssignee, setJuzByAssignee] = useState({});
  const [reassignmentReason, setReassignmentReason] = useState('ROTASI_TUGAS');
  const [reassignmentNotes, setReassignmentNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [rangeInputs, setRangeInputs] = useState({});

  useEffect(() => {
    let active = true;
    const previousFocus = document.activeElement;
    const element = dialog.current;
    if (element.showModal) element.showModal(); else element.setAttribute('open', '');

    Promise.all([
      registrationApi.getDetail(id),
      masterApi.getDistributionTeams(),
      masterApi.getPentashihCandidates().catch(() => ({ data: [] })),
    ])
      .then(([detail, list, candidates]) => {
        if (!active) return;
        setRegistration(detail.data);
        const now = new Date();
        setTeams((list.data || []).filter(team =>
          team.status === 'ACTIVE' &&
          new Date(team.active_from) <= now &&
          (!team.active_to || new Date(team.active_to) >= now)
        ));
        setAllCandidates(candidates.data || []);
      })
      .catch(err => {
        if (active) setError(err.message || 'Data penugasan tidak dapat dimuat.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (element.close) element.close();
      previousFocus?.focus();
    };
  }, [id]);

  const previous = registration?.assignments?.length > 0;
  const lastRevLetter = registration?.official_documents?.find(d => d.document_type === 'REVISION_RETURN_LETTER');
  const isDummyRevision = lastRevLetter?.content_snapshot?.revision_kind === 'NASKAH_DUMI' || registration?.revision_kind === 'NASKAH_DUMI';
  const stage = isDummyRevision ? 'DUMMY' : previous ? 'REVISION' : registration?.registration_type === 'EXTENSION' ? 'DUMMY' : 'INITIAL';

  const team = teams.find(item => item.id === teamId);

  // Pool pentashih yang tersedia: jika kelompok dipilih, ambil dari kelompok itu; jika tidak, ambil seluruh pentashih aktif
  const availablePentashih = useMemo(() => {
    let pool = [];
    if (team) {
      pool = (team.members || [])
        .filter(member => member.status === 'ACTIVE' && member.user?.status === 'ACTIVE' && member.user.roles?.some(item => (item.role?.code || item) === 'PENTASHIH'))
        .map(member => ({
          id: member.user_id,
          name: member.user.name,
          nip: member.user.nip,
          email: member.user.email,
        }));
    } else {
      pool = allCandidates.map(c => ({
        id: c.id,
        name: c.name,
        nip: c.nip,
        email: c.email,
        active_assignments_count: c.active_assignments_count,
      }));
    }

    if (!searchQuery.trim()) return pool;
    const q = searchQuery.toLowerCase().trim();
    return pool.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.nip?.includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  }, [team, allCandidates, searchQuery]);

  const ready = ['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(registration?.status) &&
    registration.payment_records?.some(item => item.status === 'VERIFIED');

  const allSelectedHaveJuz = selected.length > 0 && selected.every(userId => (juzByAssignee[userId] || []).length > 0);

  const hasOverlap = useMemo(() => {
    const all = selected.flatMap(uid => juzByAssignee[uid] || []);
    return all.length > 0 && new Set(all).size !== all.length;
  }, [selected, juzByAssignee]);

  // Validasi matematis cakupan 30 Juz
  const uniqueAssignedJuz = useMemo(() => {
    const all = selected.flatMap(uid => juzByAssignee[uid] || []);
    return Array.from(new Set(all)).sort((a, b) => a - b);
  }, [selected, juzByAssignee]);

  const missingJuz = useMemo(() => {
    const missing = [];
    for (let j = 1; j <= 30; j++) {
      if (!uniqueAssignedJuz.includes(j)) missing.push(j);
    }
    return missing;
  }, [uniqueAssignedJuz]);

  const isFull30Juz = uniqueAssignedJuz.length === 30;

  const setJuzRange = (userId, from, to) => {
    const f = Math.min(Math.max(Number(from) || 1, 1), 30);
    const t = Math.max(Math.min(Number(to) || 30, 30), f);
    const range = Array.from({ length: t - f + 1 }, (_, i) => f + i);

    setError('');
    setJuzByAssignee(prev => ({ ...prev, [userId]: range }));
    return true;
  };

  const getRangeDescription = (juzNumbers) => {
    if (!juzNumbers || !juzNumbers.length) return 'Belum dipilih';
    const sorted = [...juzNumbers].sort((a, b) => a - b);
    return `Juz ${sorted[0]} s.d. ${sorted[sorted.length - 1]} (${sorted.length} Juz)`;
  };

  const toggleJuz = (userId, juzNumber) => setJuzByAssignee(previousState => {
    const current = previousState[userId] || [];
    return {
      ...previousState,
      [userId]: current.includes(juzNumber)
        ? current.filter(value => value !== juzNumber)
        : [...current, juzNumber].sort((a, b) => a - b),
    };
  });

  const toggleMember = (userId, checked) => {
    setSelected(previousState => checked ? [...previousState, userId] : previousState.filter(item => item !== userId));
    if (!checked) setJuzByAssignee(previousState => ({ ...previousState, [userId]: [] }));
  };

  const submit = async event => {
    event.preventDefault();
    if (!ready || !allSelectedHaveJuz || saving) return;
    setSaving(true);
    setError('');

    try {
      const payload = {
        juz_assignments: selected.map(assignee_id => ({ assignee_id, juz_numbers: juzByAssignee[assignee_id] })),
        stage,
        ...(teamId ? { team_id: teamId } : {}),
        ...(hasOverlap ? { allow_overlap: true } : {}),
        ...(registration?.status === 'TASHIH_IN_PROGRESS' || previous ? {
          reassignment_reason: reassignmentReason,
          reassignment_notes: reassignmentNotes || undefined,
        } : {}),
      };

      await registrationApi.createAssignments(id, payload);
      onAssigned();
    } catch (err) {
      setError(err.message || 'Penugasan gagal. Muat ulang untuk memeriksa status terbaru.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="manual-team-title"
      onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}
      className="w-[calc(100%_-_2rem)] max-w-2xl max-h-[90vh] overflow-auto rounded-2xl p-0 shadow-2xl backdrop:bg-ink/50"
    >
      <div className="sticky top-0 z-10 bg-surface flex items-center justify-between gap-4 border-b border-line p-5">
        <h2 id="manual-team-title" className="flex items-center gap-2 font-bold text-ink">
          <Users className="h-5 w-5 text-brand-700" />
          Penetapan Penugasan Pentashihan (Kelompok & Individu)
        </h2>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          aria-label="Tutup penugasan tim"
          className="rounded-lg p-2 hover:bg-surface-subtle disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-civic-dangerSoft p-3 text-sm text-civic-danger">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </p>
        )}

        {loading ? (
          <p role="status" className="text-sm text-ink-muted">Memuat data kelompok dan kelayakan pengajuan…</p>
        ) : registration && (
          <>
            {/* Header Informasi Naskah & SLA */}
            <div className="bg-canvas p-4 rounded-xl border border-line space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand-fg">{registration.registration_no}</span>
                <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200">
                  SLA Sidang: {registration.fee_sla_snapshot?.[`sla_${stage.toLowerCase()}_days`] || (stage === 'INITIAL' ? (registration.service_type?.duration_initial || 15) : stage === 'REVISION' ? (registration.service_type?.duration_revision || 7) : (registration.service_type?.duration_dummy || 3))} Hari Kerja
                </span>
              </div>
              <p className="font-bold text-ink text-sm">{registration.title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted text-xs pt-1.5 border-t border-line/60">
                <span>Layanan: <strong className="text-ink font-semibold">{registration.fee_sla_snapshot?.service_name || registration.service_type?.name || 'Mushaf Standar 30 Juz'}</strong></span>
                <span>Tahap: <strong className="text-brand-900 font-semibold">{stage}</strong></span>
                <span>· Tenggat dihitung server dari kalender hari kerja resmi Kemenag RI</span>
              </div>
            </div>

            {!ready && (
              <p className="rounded-lg bg-civic-warningSoft p-3 text-sm text-civic-warning">
                Pengajuan harus berstatus Menunggu Distribusi atau Sedang Ditashih dan pembayaran sudah terverifikasi.
              </p>
            )}

            {/* Pemilihan Kelompok Kerja */}
            <div>
              <label htmlFor="manual-team-select" className="block text-sm font-semibold text-ink mb-1.5">
                Kelompok Kerja Pentashihan
              </label>
              <select
                id="manual-team-select"
                aria-label="Kelompok Kerja Pentashihan"
                disabled={!ready || saving}
                value={teamId}
                onChange={event => {
                  setTeamId(event.target.value);
                  setSelected([]);
                  setJuzByAssignee({});
                }}
                className="w-full rounded-lg border border-line-strong px-3 py-2.5 text-sm bg-surface"
              >
                <option value="">Semua Kelompok / Penugasan Fleksibel Lintas Tim</option>
                {teams.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.decree_no}
                  </option>
                ))}
              </select>
              {!teams.length && (
                <p className="text-xs text-civic-warning mt-1.5">Belum ada kelompok kerja aktif. Hubungi Super Admin.</p>
              )}
            </div>

            {/* Reassignment Reason (Bila Tahap Sedang Berjalan / Revisi) */}
            {(registration.status === 'TASHIH_IN_PROGRESS' || previous) && (
              <div className="rounded-xl border border-line p-3.5 bg-canvas space-y-3">
                <span className="block text-xs font-bold text-ink">Alasan Penambahan / Pergantian Pentashih (Administratif):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={reassignmentReason}
                    onChange={e => setReassignmentReason(e.target.value)}
                    className="rounded-lg border border-line-strong px-3 py-2 text-xs bg-surface"
                    aria-label="Alasan pergantian pentashih"
                  >
                    <option value="ROTASI_TUGAS">Rotasi Penugasan Berkala</option>
                    <option value="BEBAN_KERJA">Penyesuaian Beban Kerja</option>
                    <option value="PENDELEGASIAN">Pendelegasian Tugas Tambahan</option>
                    <option value="PERMINTAAN_DISTRIBUTOR">Kebutuhan Penyesuaian oleh Distributor</option>
                    <option value="LAINNYA">Penyesuaian Administratif Lainnya</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Catatan administratif (opsional)..."
                    value={reassignmentNotes}
                    onChange={e => setReassignmentNotes(e.target.value)}
                    maxLength={500}
                    className="rounded-lg border border-line-strong px-3 py-2 text-xs bg-surface"
                  />
                </div>
              </div>
            )}

            {/* Pencarian Pentashih */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="search-pentashih" className="text-sm font-semibold text-ink">
                  Cari Pentashih
                </label>
                <span className="text-xs text-ink-muted">
                  {availablePentashih.length} pentashih tersedia · {selected.length} dipilih
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
                <input
                  id="search-pentashih"
                  type="text"
                  placeholder="Cari berdasarkan nama, NIP, atau email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={!ready || saving}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-line-strong bg-surface placeholder:text-ink-muted"
                />
              </div>
            </div>

            {/* Indikator Langsung Cakupan 30 Juz */}
            {selected.length > 0 && (
              <div className="space-y-1.5">
                {isFull30Juz ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      Cakupan Penuh: Seluruh 30 Juz Lengkap Teralokasikan
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 font-bold">
                      30/30 Juz
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Cakupan Juz Belum Lengkap ({uniqueAssignedJuz.length}/30 Juz Terbagi)</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold">
                        {missingJuz.length} Juz Belum Teralokasi
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Juz yang belum dipilih: <strong>{missingJuz.join(', ')}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mode Pentashihan Silang / Overlap */}
            {hasOverlap && (
              <div className="p-2.5 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-900 flex items-center gap-2">
                <span className="font-bold">Mode Pentashihan Ganda/Silang:</span>
                <span>Nomor juz yang sama ditelaah secara bersama oleh beberapa pentashih terpilih.</span>
              </div>
            )}

            {/* Daftar Pentashih & Penjatahan Juz */}
            <fieldset disabled={saving || !ready} className="space-y-3">
              <legend className="text-sm font-semibold text-ink mb-1">
                Daftar Pentashih Aktif
              </legend>

              {availablePentashih.length ? (
                availablePentashih.map(member => {
                  const userJuz = juzByAssignee[member.id] || [];
                  const currentFrom = rangeInputs[member.id]?.from ?? (userJuz[0] || 1);
                  const currentTo = rangeInputs[member.id]?.to ?? (userJuz[userJuz.length - 1] || 10);
                  const isChecked = selected.includes(member.id);

                  return (
                    <div
                      key={member.id}
                      className={`rounded-xl border p-3.5 space-y-3 transition-colors ${
                        isChecked ? 'border-brand-300 bg-brand-50/20' : 'border-line bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex gap-3 items-center text-sm font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={event => toggleMember(member.id, event.target.checked)}
                            className="h-4 w-4 accent-brand-700"
                          />
                          <div>
                            <span className="text-ink font-semibold">{member.name}</span>
                            {member.nip && (
                              <span className="block text-[11px] text-ink-muted">NIP: {member.nip}</span>
                            )}
                          </div>
                        </label>
                        {isChecked && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200">
                            {getRangeDescription(userJuz)}
                          </span>
                        )}
                      </div>

                      {isChecked && (
                        <div className="space-y-3 pl-7 border-t border-line/60 pt-3">
                          {/* Preset Rentang Cepat */}
                          <div>
                            <span className="block text-xs font-semibold text-ink-muted mb-1.5">
                              Preset Pembagian Cepat:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { label: 'Juz 1–20 (20 Juz)', from: 1, to: 20 },
                                { label: 'Juz 21–30 (10 Juz)', from: 21, to: 30 },
                                { label: 'Juz 1–15 (15 Juz)', from: 1, to: 15 },
                                { label: 'Juz 16–30 (15 Juz)', from: 16, to: 30 },
                                { label: 'Juz 1–10 (10 Juz)', from: 1, to: 10 },
                                { label: 'Juz 11–20 (10 Juz)', from: 11, to: 20 },
                                { label: 'Juz 1–5', from: 1, to: 5 },
                                { label: 'Juz 6–10', from: 6, to: 10 },
                                { label: 'Juz 11–15', from: 11, to: 15 },
                                { label: 'Juz 16–20', from: 16, to: 20 },
                                { label: 'Juz 21–25', from: 21, to: 25 },
                                { label: 'Juz 26–30', from: 26, to: 30 },
                                { label: 'Juz 1–30 (Penuh)', from: 1, to: 30 },
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    setRangeInputs(prev => ({
                                      ...prev,
                                      [member.id]: { from: preset.from, to: preset.to },
                                    }));
                                    setJuzRange(member.id, preset.from, preset.to);
                                  }}
                                  className="px-2 py-1 text-xs rounded border border-line bg-surface-subtle hover:bg-brand-50 hover:text-brand-800 hover:border-brand-300 font-medium transition-colors"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Rentang Kustom */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-ink-muted">Rentang Kustom:</span>
                            <label className="flex items-center gap-1">
                              <span>Dari</span>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={currentFrom}
                                onChange={e => setRangeInputs(prev => ({
                                  ...prev,
                                  [member.id]: { ...prev[member.id], from: Number(e.target.value) },
                                }))}
                                className="w-14 px-2 py-1 border border-line-strong rounded text-center text-xs font-mono"
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              <span>s.d.</span>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={currentTo}
                                onChange={e => setRangeInputs(prev => ({
                                  ...prev,
                                  [member.id]: { ...prev[member.id], to: Number(e.target.value) },
                                }))}
                                className="w-14 px-2 py-1 border border-line-strong rounded text-center text-xs font-mono"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setJuzRange(member.id, currentFrom, currentTo)}
                              className="px-2.5 py-1 rounded bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs"
                            >
                              Terapkan
                            </button>
                          </div>

                          {/* Grid 30 Juz Checklist */}
                          <div className="mt-2 grid grid-cols-6 sm:grid-cols-10 gap-1.5" aria-label={`Juz untuk ${member.name}`}>
                            {Array.from({ length: 30 }, (_, index) => index + 1).map(juzNumber => {
                              const owner = selected.find(uid => uid !== member.id && (juzByAssignee[uid] || []).includes(juzNumber));
                              const checked = userJuz.includes(juzNumber);
                              return (
                                <label
                                  key={juzNumber}
                                  className={`rounded-md border p-1 text-center text-xs ${
                                    checked ? 'bg-brand-700 text-white border-brand-700 font-bold' : 'border-line text-ink'
                                  } ${owner ? 'opacity-40 bg-surface-subtle cursor-not-allowed' : 'cursor-pointer'}`}
                                  title={owner ? 'Sudah dialokasikan ke pentashih lain' : `Juz ${juzNumber}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    aria-label={`Juz ${juzNumber} untuk ${member.name}`}
                                    checked={checked}
                                    disabled={Boolean(owner)}
                                    onChange={() => toggleJuz(member.id, juzNumber)}
                                  />
                                  {juzNumber}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-civic-warning">
                  Tidak ditemukan pentashih yang sesuai dengan kata kunci pencarian atau kelompok terpilih.
                </p>
              )}
            </fieldset>
          </>
        )}

        <p className="text-xs text-ink-muted">
          Tindakan ini menetapkan penugasan pentashih pada tahap berjalan. Bukan persetujuan SOP, hasil sidang, atau pengesahan STT.
        </p>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-line-strong px-4 py-2 text-sm disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || saving || !ready || !allSelectedHaveJuz}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-40"
          >
            {saving ? 'Menyimpan…' : 'Tetapkan penugasan'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
