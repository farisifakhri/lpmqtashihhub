import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Users, User, AlertCircle, Search, CheckCircle2, Sliders, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { registrationApi } from '@/api/registration.api';
import { masterApi } from '@/api/master.api';

export function ManualTeamAssignmentDialog({ id, onClose, onAssigned }) {
  const dialog = useRef(null);
  const [registration, setRegistration] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('TEAM'); // 'TEAM' | 'INDIVIDUAL'
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
  const [groupRange, setGroupRange] = useState({ from: 1, to: 30 });
  const [groupFrom, setGroupFrom] = useState(1);
  const [groupTo, setGroupTo] = useState(30);
  const [comparisonNotes, setComparisonNotes] = useState('');

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
  const isDummyRevision = lastRevLetter?.content_snapshot?.revision_kind === 'NASHKAH_DUMI' || registration?.revision_kind === 'NASKAH_DUMI';
  const stage = isDummyRevision ? 'DUMMY' : previous ? 'REVISION' : registration?.registration_type === 'EXTENSION' ? 'DUMMY' : 'INITIAL';

  const team = teams.find(item => item.id === teamId);

  // Pool pentashih yang tersedia: jika kelompok dipilih, ambil dari kelompok itu; jika mode individu, ambil seluruh kandidat
  const availablePentashih = useMemo(() => {
    let pool = [];
    if (assignmentMode === 'TEAM' && team) {
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
  }, [assignmentMode, team, allCandidates, searchQuery]);

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

  // Terapkan rentang ke seluruh anggota kelompok yang sedang tercentang (Item 4 & Item 5)
  const applyRangeToAllMembers = (from, to) => {
    const f = Math.min(Math.max(Number(from) || 1, 1), 30);
    const t = Math.max(Math.min(Number(to) || 30, 30), f);
    const range = Array.from({ length: t - f + 1 }, (_, i) => f + i);

    setGroupRange({ from: f, to: t });
    setGroupFrom(f);
    setGroupTo(t);
    setError('');

    setJuzByAssignee(prev => {
      const next = { ...prev };
      selected.forEach(uid => {
        next[uid] = range;
      });
      return next;
    });
  };

  // Pilih Tim -> Otomatis centang seluruh anggota tim aktif (Item 3)
  const handleTeamChange = (newTeamId) => {
    setTeamId(newTeamId);
    if (!newTeamId) {
      setSelected([]);
      setJuzByAssignee({});
      return;
    }

    const selectedTeam = teams.find(item => item.id === newTeamId);
    if (selectedTeam) {
      const activeMemberIds = (selectedTeam.members || [])
        .filter(member => member.status === 'ACTIVE' && member.user?.status === 'ACTIVE' && member.user.roles?.some(item => (item.role?.code || item) === 'PENTASHIH'))
        .map(member => member.user_id);

      setSelected(activeMemberIds);
      // Default: seluruh anggota tim ditugaskan untuk rentang kelompok aktif (1..30)
      const f = groupRange.from || 1;
      const t = groupRange.to || 30;
      const range = Array.from({ length: t - f + 1 }, (_, i) => f + i);
      const nextJuz = {};
      activeMemberIds.forEach(uid => {
        nextJuz[uid] = range;
      });
      setJuzByAssignee(nextJuz);
    } else {
      setSelected([]);
      setJuzByAssignee({});
    }
  };

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
    if (checked) {
      const f = groupRange.from || 1;
      const t = groupRange.to || 30;
      const range = Array.from({ length: t - f + 1 }, (_, i) => f + i);
      setJuzByAssignee(previousState => ({ ...previousState, [userId]: range }));
    } else {
      setJuzByAssignee(previousState => ({ ...previousState, [userId]: [] }));
    }
  };

  const isRevisionRound = useMemo(() => {
    return Boolean(
      stage === 'REVISION' ||
      stage === 'DUMMY' ||
      registration?.official_documents?.some(d => d.document_type === 'REVISION_RETURN_LETTER') ||
      registration?.revision_source === 'TASHIH_REVISION'
    );
  }, [stage, registration]);

  const isInitialRoundAssignment = Boolean(
    isRevisionRound && (
      registration?.status === 'WAITING_DISTRIBUTION' ||
      !registration?.assignments?.some(a => a.stage === stage)
    )
  );

  const submit = async event => {
    event.preventDefault();
    if (!ready || !allSelectedHaveJuz || saving) return;
    if (isInitialRoundAssignment) {
      if (!comparisonNotes.trim() || comparisonNotes.trim().length < 20) {
        setError('Catatan telaah pembanding distributor wajib diisi (minimal 20 karakter) untuk naskah revisi/dumi masuk.');
        return;
      }
    }
    setSaving(true);
    setError('');

    try {
      const payload = {
        juz_assignments: selected.map(assignee_id => ({ assignee_id, juz_numbers: juzByAssignee[assignee_id] })),
        stage,
        ...(assignmentMode === 'TEAM' && teamId ? { team_id: teamId } : { is_individual: true }),
        ...(hasOverlap ? { allow_overlap: true } : {}),
        ...(registration?.status === 'TASHIH_IN_PROGRESS' || previous ? {
          reassignment_reason: reassignmentReason,
          reassignment_notes: reassignmentNotes || undefined,
        } : {}),
        ...(isInitialRoundAssignment && comparisonNotes.trim() ? { comparison_notes: comparisonNotes.trim() } : {}),
      };

      await registrationApi.createAssignments(id, payload);
      onAssigned();
    } catch (err) {
      setError(err.message || 'Penugasan gagal. Muat ulang untuk memeriksa status terbaru.');
    } finally {
      setSaving(false);
    }
  };

  const quickPresets = [
    { label: 'Juz 1–30 (Penuh)', from: 1, to: 30 },
    { label: 'Juz 1–20 (20 Juz)', from: 1, to: 20 },
    { label: 'Juz 21–30 (10 Juz)', from: 21, to: 30 },
    { label: 'Juz 1–15 (15 Juz)', from: 1, to: 15 },
    { label: 'Juz 16–30 (15 Juz)', from: 1, to: 30 },
    { label: 'Juz 1–10 (10 Juz)', from: 1, to: 10 },
    { label: 'Juz 11–20 (10 Juz)', from: 1, to: 20 },
    { label: 'Juz 1–5', from: 1, to: 5 },
    { label: 'Juz 6–10', from: 6, to: 10 },
    { label: 'Juz 11–15', from: 11, to: 15 },
    { label: 'Juz 16–20', from: 16, to: 20 },
    { label: 'Juz 21–25', from: 21, to: 25 },
    { label: 'Juz 26–30', from: 26, to: 30 },
  ];

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

            {/* Pilihan Mode Penugasan: Tim Kelompok vs Pentashih Pribadi (Item 2) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink">
                Skema Penugasan Pentashih
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-surface-subtle rounded-xl border border-line text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAssignmentMode('TEAM');
                  }}
                  className={clsx(
                    "py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    assignmentMode === 'TEAM'
                      ? "bg-white text-brand-900 shadow-2xs font-bold border border-line/60"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  <Users className="w-4 h-4 text-brand-700" />
                  <span>Tim Pentashih (Kelompok Sidang)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssignmentMode('INDIVIDUAL');
                    setTeamId('');
                  }}
                  className={clsx(
                    "py-2.5 px-3 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    assignmentMode === 'INDIVIDUAL'
                      ? "bg-white text-brand-900 shadow-2xs font-bold border border-line/60"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  <User className="w-4 h-4 text-brand-700" />
                  <span>Pentashih Pribadi (Mandiri / Non-Tim)</span>
                </button>
              </div>
            </div>

            {/* Pemilihan Kelompok Kerja jika mode TEAM */}
            {assignmentMode === 'TEAM' && (
              <div>
                <label htmlFor="manual-team-select" className="block text-sm font-semibold text-ink mb-1.5">
                  Kelompok Kerja Pentashihan
                </label>
                <select
                  id="manual-team-select"
                  aria-label="Kelompok Kerja Pentashihan"
                  disabled={!ready || saving}
                  value={teamId}
                  onChange={event => handleTeamChange(event.target.value)}
                  className="w-full rounded-lg border border-line-strong px-3 py-2.5 text-sm bg-surface"
                >
                  <option value="">-- Pilih Kelompok Kerja Pentashihan --</option>
                  {teams.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.decree_no}
                    </option>
                  ))}
                </select>
                {!teams.length && (
                  <p className="text-xs text-civic-warning mt-1.5">Belum ada kelompok kerja aktif. Hubungi Super Admin.</p>
                )}
                {teamId && (
                  <p className="text-xs text-brand-800 mt-1.5 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />
                    <span>Seluruh anggota kelompok otomatis tercentang. Hapus centang bila ada anggota yang berhalangan hadir.</span>
                  </p>
                )}
              </div>
            )}

            {/* Pilihan Rentang Kelompok (Fitur Pilih Rentang untuk Satu Kelompok - Item 4 & 5) */}
            {assignmentMode === 'TEAM' && selected.length > 0 && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-800" />
                    <span className="text-xs font-bold text-ink uppercase tracking-wider">
                      Pilihan Rentang Juz Kelompok (Berlaku untuk Seluruh Anggota)
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-700 text-white shadow-2xs">
                    {getRangeDescription(Array.from({ length: groupRange.to - groupRange.from + 1 }, (_, i) => groupRange.from + i))}
                  </span>
                </div>

                {/* Preset Rentang Cepat Kelompok */}
                <div>
                  <span className="block text-[11px] font-semibold text-ink-muted mb-1.5">
                    Preset Rentang Kelompok:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPresets.map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyRangeToAllMembers(preset.from, preset.to)}
                        className={clsx(
                          "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer shadow-2xs",
                          groupRange.from === preset.from && groupRange.to === preset.to
                            ? "bg-brand-700 text-white border-brand-700 font-bold"
                            : "border-line bg-white hover:bg-brand-50 hover:text-brand-800 hover:border-brand-300"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rentang Kustom Kelompok */}
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-brand-100">
                  <span className="text-ink-muted font-medium">Rentang Kustom Kelompok:</span>
                  <label className="flex items-center gap-1">
                    <span>Dari Juz</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={groupFrom}
                      onChange={e => setGroupFrom(Number(e.target.value))}
                      className="w-14 px-2 py-1 border border-line-strong rounded text-center text-xs font-mono bg-white"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    <span>s.d.</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={groupTo}
                      onChange={e => setGroupTo(Number(e.target.value))}
                      className="w-14 px-2 py-1 border border-line-strong rounded text-center text-xs font-mono bg-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => applyRangeToAllMembers(groupFrom, groupTo)}
                    className="px-3 py-1 rounded bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs shadow-2xs cursor-pointer"
                  >
                    Terapkan ke Seluruh Anggota
                  </button>
                </div>
              </div>
            )}

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
                  {assignmentMode === 'TEAM' ? 'Anggota Kelompok Sidang' : 'Cari Pentashih Pribadi'}
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
                  <div className="rounded-xl bg-civic-successSoft border border-civic-successLine p-3 text-xs text-civic-success flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-civic-success" />
                      Cakupan Penuh: Seluruh 30 Juz Lengkap Teralokasikan
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-civic-successSoft text-civic-success font-bold border border-civic-successLine">
                      30/30 Juz
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl bg-civic-warningSoft border border-civic-warningLine p-3 text-xs text-civic-warning space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Cakupan Juz Belum Lengkap ({uniqueAssignedJuz.length}/30 Juz Terbagi)</span>
                      <span className="px-2 py-0.5 rounded-full bg-civic-warningSoft text-civic-warning font-bold border border-civic-warningLine">
                        {missingJuz.length} Juz Belum Teralokasi
                      </span>
                    </div>
                    <p className="text-[11px] text-civic-warning">
                      Juz yang belum dipilih: <strong>{missingJuz.join(', ')}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mode Pentashihan Silang / Overlap */}
            {hasOverlap && (
              <div className="p-2.5 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-900 flex items-center gap-2">
                <span className="font-bold">Mode Pentashihan Ganda / Bersama:</span>
                <span>Nomor juz ditelaah bersama oleh anggota kelompok sidang.</span>
              </div>
            )}

            {/* Daftar Pentashih & Penjatahan Juz */}
            <fieldset disabled={saving || !ready} className="space-y-3">
              <legend className="text-sm font-semibold text-ink mb-1">
                {assignmentMode === 'TEAM' ? 'Daftar Anggota Kelompok Terpilih' : 'Daftar Pentashih Aktif'}
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
                            aria-label={member.name}
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
                              {assignmentMode === 'TEAM' ? 'Sesuaikan Khusus Anggota Ini (Opsional):' : 'Preset Pembagian Cepat:'}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {quickPresets.map(preset => (
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
                                  className="px-2 py-1 text-xs rounded border border-line bg-surface-subtle hover:bg-brand-50 hover:text-brand-800 hover:border-brand-300 font-medium transition-colors cursor-pointer"
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
                              className="px-2.5 py-1 rounded bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs cursor-pointer"
                            >
                              Terapkan
                            </button>
                          </div>

                          {/* Grid 30 Juz Checklist */}
                          <div className="mt-2 grid grid-cols-6 sm:grid-cols-10 gap-1.5" aria-label={`Juz untuk ${member.name}`}>
                            {Array.from({ length: 30 }, (_, index) => index + 1).map(juzNumber => {
                              const checked = userJuz.includes(juzNumber);
                              return (
                                <label
                                  key={juzNumber}
                                  className={`rounded-md border p-1 text-center text-xs ${
                                    checked ? 'bg-brand-700 text-white border-brand-700 font-bold' : 'border-line text-ink'
                                  } cursor-pointer`}
                                  title={`Juz ${juzNumber}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    aria-label={`Juz ${juzNumber} untuk ${member.name}`}
                                    checked={checked}
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

        {isInitialRoundAssignment && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-brand-200/60 pb-2">
              <label className="block text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-700" />
                Catatan Telaah Pembanding Naskah Masuk (Wajib Distributor)
              </label>
              <span className="text-[11px] font-bold text-brand-800 bg-brand-100 px-2 py-0.5 rounded border border-brand-200">
                Wajib Diisi (Min. 20 Karakter)
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-brand-200 text-xs flex items-center justify-between gap-2">
              <span className="text-ink-muted font-semibold">Rekapitulasi Perbaikan dari Penerbit:</span>
              {registration?.publisher_revision_recaps?.[0] ? (
                <span className="text-brand-900 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                  <span>Tersedia (Ronde #{registration.publisher_revision_recaps[0].round_number})</span>
                </span>
              ) : (
                <span className="text-civic-warning font-medium italic">
                  Belum ada berkas rekap dari penerbit
                </span>
              )}
            </div>

            <div>
              <textarea
                rows={3}
                value={comparisonNotes}
                maxLength={5000}
                onChange={(e) => setComparisonNotes(e.target.value)}
                placeholder="Tuliskan analisis perbandingan antara catatan koreksi ronde sebelumnya dengan perbaikan naskah yang baru diserahkan oleh penerbit... (minimal 20 karakter)"
                className="w-full p-3 text-xs bg-white border border-line-strong rounded-xl outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-ink-muted mt-1">
                <span>Catatan ini disimpan ke arsip internal distributor dan tidak dipublikasikan ke penerbit.</span>
                <span className={comparisonNotes.trim().length >= 20 ? 'text-brand-700 font-bold' : 'text-civic-warning font-semibold'}>
                  {comparisonNotes.length}/5000 karakter (min. 20)
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-ink-muted">
          Tindakan ini menetapkan penugasan pentashih pada tahap berjalan. Bukan persetujuan SOP, hasil sidang, atau pengesahan STT.
        </p>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-line-strong px-4 py-2 text-sm disabled:opacity-40 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || saving || !ready || !allSelectedHaveJuz}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-40 cursor-pointer"
          >
            {saving ? 'Menyimpan…' : 'Tetapkan penugasan'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
