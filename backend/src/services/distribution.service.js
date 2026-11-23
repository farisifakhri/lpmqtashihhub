import { prisma } from '../config/database.js';
import { calculateDueAt, jakartaDate } from './sla.service.js';
import { fail, requireRole, registration, requireStatus, move, audit, resolveTashihRound } from './workflow-utils.js';
import { MANUAL_TEAM_ASSIGNMENT_ROLES } from '../middlewares/admin-internal.middleware.js';
import { pemarafGateActive, findParaf, addPemarafSignature, parafProgress, resolveDesignatedPemaraf, openParafRequest, overrideParafByAdmin } from './paraf.service.js';
import { buildMyAssignmentsWhere } from './queue-filters.js';

const STAGE_LABELS = { INITIAL: 'Penugasan Awal', REVISION: 'Penugasan Perbaikan', DUMMY: 'Penugasan Dumi' };

// Jenis penugasan ronde baru dikunci sesuai tahap: Awal hanya sidang pertama; Perbaikan/Dumi hanya setelah
// keputusan reviu yang sesuai DAN penerbit sudah mengirim naskahnya (resi kurir atau diterima di loket).
export function assignmentStageOptions({ isTashihRevision, revisionKind, hasAssignmentsForRound, previousStage, registrationType, hasDispatchProof }) {
  const newRevisionRound = isTashihRevision && !hasAssignmentsForRound;
  const stage = newRevisionRound
    ? (revisionKind === 'DUMMY' ? 'DUMMY' : 'REVISION')
    : previousStage || (registrationType === 'EXTENSION' ? 'DUMMY' : 'INITIAL');
  const waitingProof = newRevisionRound && !hasDispatchProof;
  const lockReason = {
    INITIAL: !previousStage && !isTashihRevision && registrationType === 'EXTENSION'
      ? 'Pengajuan perpanjangan langsung masuk tahap dumi.'
      : 'Hanya untuk sidang pertama; naskah ini sudah pernah disidangkan.',
    REVISION: stage === 'DUMMY'
      ? 'Keputusan terakhir mengalihkan naskah ke tahap dumi, bukan perbaikan.'
      : 'Belum ada keputusan perbaikan dari reviu hasil sidang.',
    DUMMY: stage === 'REVISION'
      ? 'Keputusan terakhir meminta perbaikan naskah; tahap dumi dibuka setelah telaah teks lulus.'
      : 'Tahap dumi dibuka setelah telaah teks dinyatakan lulus.',
  };
  const waitingReason = `Menunggu penerbit mengirim naskah ${stage === 'DUMMY' ? 'dumi' : 'perbaikan'}: nomor resi kurir belum diisi atau naskah belum diterima di loket LPMQ.`;
  return ['INITIAL', 'REVISION', 'DUMMY'].map(key => {
    const allowed = key === stage && !waitingProof;
    return { key, allowed, reason: allowed ? null : key === stage ? waitingReason : lockReason[key] };
  });
}

// Bukti pengiriman naskah ronde perbaikan/dumi: diterima Admin Internal di loket, dan bila dikirim lewat
// kurir (bukan antar langsung) wajib ada nomor resi. Penerimaan loket sudah mencatat petugas, waktu, dan BAST.
async function hasDispatchProof(tx, reg) {
  const intake = await tx.physicalMasterIntake?.findUnique({ where: { registration_id: reg.id } });
  const viaCourier = reg.dispatch_courier && reg.dispatch_courier !== 'LOKET_LPMQ';
  return intake?.status === 'RECEIVED' && (!viaCourier || Boolean(reg.dispatch_tracking_no?.trim()));
}

async function loadAssignmentStageOptions(tx, reg, round, previous) {
  const newRevisionRound = round.isTashihRevision && !round.hasAssignmentsForRound;
  return assignmentStageOptions({
    ...round,
    previousStage: previous?.stage || null,
    registrationType: reg.registration_type,
    hasDispatchProof: newRevisionRound ? await hasDispatchProof(tx, reg) : true,
  });
}

// Dibaca pop-up "Mulai Penugasan" agar pilihan yang terkunci tampil beserta alasannya.
export const getAssignmentStages = async (id) => {
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');
  const round = await resolveTashihRound(prisma, reg);
  const previous = await prisma.assignment.findFirst({ where: { registration_id: id }, orderBy: { iteration: 'desc' }, select: { stage: true } });
  return loadAssignmentStageOptions(prisma, reg, round, previous);
};

export async function resolvePentashihDueAt(tx, reg, stage, requestedDueAt = null, user = null, dueOverrideReason = null, currentActiveAssignment = null) {
  // Bila penugasan dilakukan saat tahap sudah TASHIH_IN_PROGRESS (tambah/ganti pentashih) dan tidak ada requestedDueAt eksplisit,
  // penugasan baru mewarisi due_at dan due_meta ronde yang sedang berjalan
  if (currentActiveAssignment?.due_at && !requestedDueAt) {
    return {
      due_at: currentActiveAssignment.due_at,
      due_meta: currentActiveAssignment.due_meta || {
        inherited_from_assignment_id: currentActiveAssignment.id,
        stage,
        due_at: currentActiveAssignment.due_at,
      },
    };
  }

  const now = new Date();
  let startDate = now;
  let receivedHandover = null;

  if (stage === 'INITIAL') {
    receivedHandover = await tx.physicalManuscriptHandover?.findFirst({
      where: { registration_id: reg.id, status: 'RECEIVED' },
      orderBy: { received_at: 'desc' },
      select: { received_at: true, tashih_due_at: true },
    });
    if (receivedHandover?.received_at) {
      startDate = receivedHandover.received_at;
    } else if (reg.stage_entered_at) {
      startDate = reg.stage_entered_at;
    }
  } else {
    // REVISION / DUMMY:
    // Tidak boleh merujuk ke verifiedPayment.verified_at!
    // Gunakan tanggal serah-terima fisik naskah revisi/dumi yang diterima loket,
    // atau stage_entered_at dari ronde tersebut, atau waktu penugasan sekarang (now).
    const roundInfo = await resolveTashihRound(tx, reg);
    const handoverWhere = { registration_id: reg.id, status: 'RECEIVED' };
    if (roundInfo.lastRevLetter) {
      handoverWhere.received_at = { gte: roundInfo.lastRevLetter.created_at };
    }
    receivedHandover = await tx.physicalManuscriptHandover?.findFirst({
      where: handoverWhere,
      orderBy: { received_at: 'desc' },
      select: { received_at: true, tashih_due_at: true },
    });

    if (receivedHandover?.received_at) {
      startDate = receivedHandover.received_at;
    } else if (reg.stage_entered_at) {
      startDate = reg.stage_entered_at;
    } else {
      startDate = now;
    }
  }

  // SLA Days wajib bersumber dari fee_sla_snapshot tanpa fallback 15
  const slaKey = `sla_${stage.toLowerCase()}_days`;
  let rawSlaDays = reg.fee_sla_snapshot?.[slaKey];
  if (!rawSlaDays && reg.service_type) {
    rawSlaDays = stage === 'INITIAL'
      ? reg.service_type.duration_initial
      : stage === 'REVISION'
      ? reg.service_type.duration_revision
      : reg.service_type.duration_dummy;
  }
  const slaDays = Number(rawSlaDays);

  if (!rawSlaDays || isNaN(slaDays) || slaDays < 1) {
    fail(409, `SLA tahap ${stage} belum tercatat pada snapshot pendaftaran.`);
  }

  // Hitung batas maksimal SLA (max_due):
  // Bila handover sudah memiliki tashih_due_at yang telah dihitung saat penerimaan fisik, gunakan itu;
  // Jika tidak, hitung melalui calculateDueAt berbasis kalender kerja resmi.
  let maxDueAt = (stage === 'INITIAL' && receivedHandover?.tashih_due_at) ? receivedHandover.tashih_due_at : null;
  if (!maxDueAt) {
    if (tx.workingDay?.findMany) {
      maxDueAt = await calculateDueAt(tx, startDate, slaDays, { applyCutoff: true });
    } else {
      maxDueAt = new Date(startDate.getTime() + slaDays * 86400000);
    }
  }

  if (!requestedDueAt) {
    return {
      due_at: maxDueAt,
      due_meta: {
        start: startDate,
        sla_days: slaDays,
        max_due: maxDueAt,
        chosen_due: maxDueAt,
        stage,
      },
    };
  }

  // Parsing dan validasi tanggal yang diajukan oleh distributor
  let targetDate;
  if (typeof requestedDueAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(requestedDueAt.trim())) {
    targetDate = new Date(`${requestedDueAt.trim()}T23:59:59.999+07:00`);
  } else {
    targetDate = new Date(requestedDueAt);
  }

  if (isNaN(targetDate.getTime())) {
    fail(422, 'Format tanggal tenggat waktu tidak valid.');
  }

  const targetDateStr = jakartaDate(targetDate);
  const startDateStr = jakartaDate(startDate);
  const todayStr = jakartaDate(now);
  const maxDueDateStr = jakartaDate(maxDueAt);

  // 1. Validasi hari kerja: tolak akhir pekan (Sabtu/Minggu) dan hari libur nasional
  const targetDay = new Date(`${targetDateStr}T00:00:00Z`);
  const dayOfWeek = targetDay.getUTCDay(); // 0 = Minggu, 6 = Sabtu
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    fail(422, `Tanggal tenggat waktu yang dipilih (${targetDateStr}) jatuh pada hari libur atau akhir pekan. Pilih hari kerja resmi.`);
  }

  if (tx.workingDay?.findUnique) {
    const calendarDay = await tx.workingDay.findUnique({
      where: { date: targetDay },
    });
    if (calendarDay && !calendarDay.is_working_day) {
      fail(422, `Tanggal tenggat waktu yang dipilih (${targetDateStr}) jatuh pada hari libur atau akhir pekan. Pilih hari kerja resmi.`);
    }
  }

  // 2. Validasi tidak boleh berada di masa lalu
  if (targetDateStr < todayStr) {
    fail(422, 'Tenggat waktu pentashihan tidak boleh berada di masa lalu.');
  }

  // 3. Validasi tidak boleh lebih awal dari startDate
  if (targetDateStr < startDateStr) {
    fail(422, 'Tenggat waktu tidak boleh lebih awal dari tanggal mulai penugasan.');
  }

  // 4. Validasi tidak boleh melebihi batas maksimal SLA kecuali Superadmin dengan alasan valid
  const isSuperAdmin = Boolean(
    user?.roles?.includes('SUPERADMIN') ||
    user?.role === 'SUPERADMIN'
  );

  const exceedsMaxDue = targetDateStr > maxDueDateStr;
  if (exceedsMaxDue) {
    if (!isSuperAdmin) {
      fail(422, `Tenggat waktu yang dipilih (${targetDateStr}) melebihi batas maksimal SLA (${maxDueDateStr}).`);
    }
    if (!dueOverrideReason || dueOverrideReason.trim().length < 10) {
      fail(422, 'Penetapan tenggat waktu melebihi batas maksimal SLA memerlukan alasan perpanjangan (minimal 10 karakter).');
    }
  }

  const finalDueAt = new Date(`${targetDateStr}T23:59:59.999+07:00`);

  return {
    due_at: finalDueAt,
    due_meta: {
      start: startDate,
      sla_days: slaDays,
      max_due: maxDueAt,
      chosen_due: finalDueAt,
      stage,
      ...(exceedsMaxDue ? {
        override_reason: dueOverrideReason.trim(),
        overridden_by: user?.id || null,
      } : {}),
    },
  };
}

export const getAssignmentSla = async (id, query = {}, user = null) => {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: { service_type: true },
  });
  if (!reg) fail(404, 'Pengajuan tidak ditemukan.');

  const roundInfo = await resolveTashihRound(prisma, reg);
  const previous = await prisma.assignment.findFirst({
    where: { registration_id: id },
    orderBy: { iteration: 'desc' },
    select: { stage: true },
  });

  const isDummyRevision = roundInfo.lastRevLetter?.content_snapshot?.revision_kind === 'NASKAH_DUMI';
  const expectedStage = isDummyRevision
    ? 'DUMMY'
    : (previous || roundInfo.isTashihRevision)
    ? (query.stage === 'DUMMY' ? 'DUMMY' : (reg.status === 'TASHIH_IN_PROGRESS' ? (previous?.stage || 'INITIAL') : 'REVISION'))
    : reg.registration_type === 'EXTENSION'
    ? 'DUMMY'
    : 'INITIAL';

  const stage = query.stage || expectedStage;
  if (!['INITIAL', 'REVISION', 'DUMMY'].includes(stage)) {
    fail(400, 'Tahap penugasan tidak valid.');
  }

  const { due_at: max_due_at, due_meta } = await resolvePentashihDueAt(prisma, reg, stage, null, user);

  return {
    stage,
    start_date: due_meta.start,
    sla_days: due_meta.sla_days,
    max_due_at,
    service_name: reg.service_type?.name || "Mushaf Al-Qur'an Standar Kemenag",
    basis_info: `${due_meta.sla_days} Hari Kerja (${STAGE_LABELS[stage] || stage})`,
  };
};

export const createAssignments = (id, data, user) => prisma.$transaction(async tx => {
  const reg = await registration(tx, id);
  if (reg.core_team_number) {
    requireRole(user, ['DISTRIBUTOR']);
    if (reg.core_distributor_id !== user.id) fail(403, 'Hanya distributor tim inti pengajuan ini yang dapat membagikan tugas pentashih.');
  } else {
    requireRole(user, MANUAL_TEAM_ASSIGNMENT_ROLES);
  }
  requireStatus(reg, ['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS']);
  if (!await tx.paymentRecord.findFirst({ where: { registration_id: id, status: 'VERIFIED' } })) fail(409, 'Penugasan belum dapat dibuat karena pembayaran belum dinyatakan lunas. Minta verifikator memeriksa bukti pembayaran terlebih dahulu.');
  const previous = await tx.assignment.findFirst({ where: { registration_id: id }, orderBy: { iteration: 'desc' } });
  const roundInfo = await resolveTashihRound(tx, reg);

  // B-16, B-17 & B-19a: Penugasan naskah revisi memblokir bila berkas rekapitulasi penerbit belum diunggah
  if (roundInfo.isTashihRevision) {
    const recap = await tx.publisherRevisionRecap?.findUnique({
      where: {
        registration_id_round_number: {
          registration_id: id,
          round_number: roundInfo.roundNumber,
        },
      },
    });
    if (!recap) {
      fail(409, 'Naskah revisi belum dapat ditugaskan karena Penerbit belum mengunggah dokumen rekapitulasi perbaikan untuk ronde ini.');
    }

    // B-19a N4: Telaah pembanding distributor pada penugasan awal ronde naskah masuk bersifat opsional; disimpan hanya bila diisi
    const isInitialRoundAssignment = reg.status === 'WAITING_DISTRIBUTION' || !roundInfo.hasAssignmentsForRound;
    if (isInitialRoundAssignment && data.comparison_notes?.trim()) {
      if (tx.distributorComparison?.upsert) {
        await tx.distributorComparison.upsert({
          where: {
            registration_id_round_number: {
              registration_id: id,
              round_number: roundInfo.roundNumber,
            },
          },
          create: {
            registration_id: id,
            round_number: roundInfo.roundNumber,
            distributor_id: user.id,
            notes: data.comparison_notes.trim(),
          },
          update: {
            distributor_id: user.id,
            notes: data.comparison_notes.trim(),
          },
        });
      }
    }
  }

  const isDummyRevision = roundInfo.lastRevLetter?.content_snapshot?.revision_kind === 'NASKAH_DUMI';
  const expectedStage = isDummyRevision
    ? 'DUMMY'
    : (previous || roundInfo.isTashihRevision)
    ? (data.stage === 'DUMMY' ? 'DUMMY' : (reg.status === 'TASHIH_IN_PROGRESS' ? (previous?.stage || 'INITIAL') : 'REVISION'))
    : reg.registration_type === 'EXTENSION'
    ? 'DUMMY'
    : 'INITIAL';
  // Jenis penugasan ronde baru (Awal / Perbaikan / Dumi) dipilih distributor di pop-up "Mulai Penugasan";
  // expectedStage hanya menjadi nilai bawaan bila klien tidak mengirim stage. Pilihan yang terkunci ditolak.
  if (reg.status === 'WAITING_DISTRIBUTION') {
    const chosenStage = data.stage || expectedStage;
    const option = (await loadAssignmentStageOptions(tx, reg, roundInfo, previous)).find(item => item.key === chosenStage);
    if (!option?.allowed) fail(409, `${STAGE_LABELS[chosenStage] || 'Penugasan'} belum dapat dibuka: ${option?.reason || 'jenis penugasan tidak dikenal.'}`);
  }
  const now = new Date();
  const teamCache = new Map();
  if (data.team_id) {
    const defaultTeam = await tx.distributionTeam.findUnique({
      where: { id: data.team_id },
      include: { members: { include: { user: { include: { roles: { include: { role: true } } } } } } },
    });
    if (!defaultTeam || defaultTeam.status !== 'ACTIVE' || defaultTeam.active_from > now || (defaultTeam.active_to && defaultTeam.active_to < now)) {
      fail(409, 'Kelompok kerja yang dipilih tidak tersedia atau masa aktifnya belum dimulai/sudah berakhir. Pilih kelompok kerja aktif atau minta administrator memperbarui data tim.');
    }
    teamCache.set(data.team_id, defaultTeam);
  }

  const getTeam = async (tid) => {
    if (!tid) return null;
    if (teamCache.has(tid)) return teamCache.get(tid);
    const loadedTeam = await tx.distributionTeam.findUnique({
      where: { id: tid },
      include: { members: { include: { user: { include: { roles: { include: { role: true } } } } } } },
    });
    if (!loadedTeam || loadedTeam.status !== 'ACTIVE' || loadedTeam.active_from > now || (loadedTeam.active_to && loadedTeam.active_to < now)) {
      fail(409, 'Kelompok kerja yang dipilih tidak tersedia atau masa aktifnya belum dimulai/sudah berakhir. Pilih kelompok kerja aktif atau minta administrator memperbarui data tim.');
    }
    teamCache.set(tid, loadedTeam);
    return loadedTeam;
  };

  const entries = data.juz_assignments || (data.assignee_ids ? data.assignee_ids.map(assignee_id => ({ assignee_id, juz_numbers: [] })) : []);

  // Clean duplicate juz per assignee to protect @@unique([assignment_id, juz_number])
  for (const entry of entries) {
    if (entry.juz_numbers && entry.juz_numbers.length) {
      entry.juz_numbers = Array.from(new Set(entry.juz_numbers.map(Number)));
    }
  }

  // Validasi anggota pentashih (fleksibel: kelompok, campuran kelompok, maupun individu)
  for (const entry of entries) {
    const entryTeamId = entry.team_id !== undefined ? entry.team_id : (data.is_individual ? null : (data.team_id || null));
    if (entryTeamId) {
      const activeTeam = await getTeam(entryTeamId);
      const member = activeTeam.members.find(m => m.user_id === entry.assignee_id);
      if (!member || member.status !== 'ACTIVE' || member.user?.status !== 'ACTIVE' || !member.user?.roles?.some(item => item.role?.code === 'PENTASHIH')) {
        fail(400, 'Ada pentashih yang bukan anggota aktif kelompok terpilih atau akunnya tidak aktif. Periksa daftar anggota dan pastikan seluruh pentashih memiliki peran PENTASHIH aktif.');
      }
    } else {
      const directUser = await tx.user.findFirst({
        where: {
          id: entry.assignee_id,
          status: 'ACTIVE',
          roles: { some: { role: { code: 'PENTASHIH' } } },
        },
      });
      if (!directUser) {
        fail(400, 'Ada pentashih yang bukan pentashih aktif atau akunnya tidak aktif. Periksa daftar anggota dan pastikan seluruh pentashih memiliki peran PENTASHIH aktif.');
      }
    }
  }

  // Validasi matematis cakupan rentang 30 juz (B-05)
  const hasJuzAssignments = entries.some(e => e.juz_numbers && e.juz_numbers.length > 0);
  const is30JuzMushaf = reg.service_type?.name?.toLowerCase().includes('30') || data.enforce_full_coverage;
  if (hasJuzAssignments && (is30JuzMushaf || data.enforce_full_coverage) && reg.status !== 'TASHIH_IN_PROGRESS') {
    const assignedJuzSet = new Set(entries.flatMap(e => e.juz_numbers || []));
    const missingJuz = [];
    for (let j = 1; j <= 30; j++) {
      if (!assignedJuzSet.has(j)) missingJuz.push(j);
    }
    if (missingJuz.length > 0) {
      fail(400, `Penjatahan juz belum lengkap. Juz berikut belum teralokasi: ${missingJuz.join(', ')}. Pastikan seluruh 30 juz terbagi.`);
    }
  }
  const currentStage = data.stage || expectedStage;
  const activeAssignment = reg.status === 'TASHIH_IN_PROGRESS'
    ? await tx.assignment.findFirst({
        where: {
          registration_id: id,
          stage: currentStage,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
        orderBy: { created_at: 'desc' },
      })
    : null;

  const { due_at, due_meta } = await resolvePentashihDueAt(
    tx,
    reg,
    currentStage,
    data.due_at,
    user,
    data.due_override_reason,
    activeAssignment
  );

  const iteration = reg.status === 'TASHIH_IN_PROGRESS' && previous?.iteration
    ? previous.iteration
    : (previous?.iteration || 0) + 1;

  if (reg.status === 'TASHIH_IN_PROGRESS') {
    const existingActive = await tx.assignment.findMany({
      where: {
        registration_id: id,
        stage: currentStage,
        iteration,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      select: { assignee_id: true },
    });
    const existingIds = new Set(existingActive.map(a => a.assignee_id));
    const duplicates = entries.filter(e => existingIds.has(e.assignee_id));
    if (duplicates.length > 0) {
      fail(409, 'Ada pentashih yang dipilih sudah memiliki penugasan aktif pada tahap ini.');
    }
  }

  const assignments = [];
  for (const entry of entries) {
    const { assignee_id, juz_numbers } = entry;
    let resolvedTeamId = data.is_individual ? null : (entry.team_id !== undefined ? entry.team_id : (data.team_id || null));
    if (!data.is_individual && !resolvedTeamId && entry.team_id === undefined && !data.team_id) {
      const memberMembership = await tx.teamMember.findFirst({
        where: { user_id: assignee_id, status: 'ACTIVE', team: { status: 'ACTIVE' } },
        select: { team_id: true },
      });
      resolvedTeamId = memberMembership?.team_id || null;
    }

    const assignment = await tx.assignment.create({ data: {
      registration_id: id,
      team_id: resolvedTeamId,
      assignee_id,
      stage: currentStage,
      iteration,
      due_at,
      due_meta,
      ...(juz_numbers && juz_numbers.length ? { juz_items: { create: juz_numbers.map(juz_number => ({ juz_number })) } } : {}),
    } });
    assignments.push(assignment);
    await audit(tx, user, 'CREATE_ASSIGNMENT', 'Assignment', assignment.id, assignment);
    if (due_meta?.override_reason) {
      await audit(tx, user, 'OVERRIDE_ASSIGNMENT_SLA', 'Assignment', assignment.id, {
        due_at,
        max_due: due_meta.max_due,
        override_reason: due_meta.override_reason,
      });
    }
    await tx.notification.create({ data: { user_id: assignee_id, registration_id: id, type: 'ASSIGNMENT', title: 'Penugasan pentashihan baru', payload: { assignment_id: assignment.id, link: '/internal/tashih' } } });
  }

  if (due_meta?.override_reason) {
    await audit(tx, user, 'OVERRIDE_ASSIGNMENT_SLA', 'Registration', reg.id, {
      stage: currentStage,
      max_due: due_meta.max_due,
      chosen_due: due_meta.chosen_due,
      override_reason: due_meta.override_reason,
    });
  }
  if (reg.status !== 'TASHIH_IN_PROGRESS') {
    await move(tx, reg, 'TASHIH_IN_PROGRESS', user, 'Kelompok dan pentashih ditetapkan');
  } else {
    await audit(tx, user, 'ADD_PENTASHIH_ASSIGNMENT', 'Registration', reg.id, {
      added_count: assignments.length,
      reassignment_reason: data.reassignment_reason || 'ROTASI_TUGAS',
      reassignment_notes: data.reassignment_notes || 'Penyesuaian penugasan pentashihan',
    });
  }
  return assignments;
}, { isolationLevel: 'ReadCommitted' });

export async function workload(id, user) {
  // Read-only workload remains available to Distributor for their own duties.
  requireRole(user, ['ADMIN_INTERNAL', 'DISTRIBUTOR', 'SUPERADMIN']);
  if (!await prisma.distributionTeam.findUnique({ where: { id } })) fail(404, 'Tim tidak ditemukan.');
  return prisma.assignment.groupBy({ by: ['assignee_id', 'status'], where: { team_id: id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'] } }, _count: { _all: true } });
}

export const revokeAssignment = (id, data, user, req = null) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN']);
  const assignment = await tx.assignment.findUnique({
    where: { id },
    include: {
      registration: true,
      assignee: { select: { id: true, name: true, email: true } },
      juz_items: true,
    },
  });
  if (!assignment) fail(404, 'Penugasan pentashih tidak ditemukan.');

  const reg = assignment.registration;
  if (!reg) fail(404, 'Pengajuan naskah tidak ditemukan.');

  if (reg.core_team_number && user.roles?.includes('DISTRIBUTOR') && !user.roles?.includes('SUPERADMIN')) {
    if (reg.core_distributor_id !== user.id) {
      fail(403, 'Hanya distributor tim inti pengajuan ini yang dapat mencabut penugasan pentashih.');
    }
  }

  if (!['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'].includes(reg.status)) {
    fail(409, 'Penugasan hanya dapat dicabut pada naskah yang berada dalam tahap pentashihan aktif.');
  }

  if (assignment.status === 'COMPLETED') {
    fail(409, 'Penugasan pentashih sudah selesai dan tidak dapat dicabut.');
  }
  if (assignment.status === 'REVOKED') {
    fail(409, 'Penugasan pentashih sudah dicabut sebelumnya.');
  }
  if (!['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'].includes(assignment.status)) {
    fail(409, `Penugasan tidak dapat dicabut pada status "${assignment.status}".`);
  }

  const revokedAt = new Date();
  const reason = data.reason.trim();

  const updated = await tx.assignment.update({
    where: { id: assignment.id },
    data: {
      status: 'REVOKED',
      revocation_reason: reason,
      revoked_at: revokedAt,
      revoked_by_id: user.id,
    },
  });

  await audit(tx, user, 'REVOKE_ASSIGNMENT', 'Assignment', assignment.id, {
    reason,
    assignee_id: assignment.assignee_id,
    registration_id: assignment.registration_id,
    juz_numbers: (assignment.juz_items || []).map(j => j.juz_number),
    previous_status: assignment.status,
  }, req, { status: assignment.status });

  if (tx.notification?.create) {
    await tx.notification.create({
      data: {
        user_id: assignment.assignee_id,
        registration_id: assignment.registration_id,
        type: 'ASSIGNMENT_REVOKED',
        title: 'Pemberitahuan Pelepasan Penugasan Pentashihan',
        payload: {
          assignment_id: assignment.id,
          registration_id: assignment.registration_id,
          registration_no: reg.registration_no,
          title: reg.title,
          reason,
          revoked_at: revokedAt.toISOString(),
        },
      },
    });
  }

  return {
    success: true,
    message: `Penugasan untuk pentashih ${assignment.assignee?.name || ''} berhasil dicabut.`,
    assignment: updated,
  };
}, { isolationLevel: 'ReadCommitted' });

export const recordReview = (id, data, user) => prisma.$transaction(async tx => {
  const isSuperAdmin = user.roles?.includes('SUPERADMIN') || user.role === 'SUPERADMIN';
  if (!isSuperAdmin) {
    requireRole(user, ['PENTASHIH']);
  }
  const initial = await tx.assignment.findUnique({ where: { id } });
  if (!initial) fail(404, 'Penugasan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireStatus(reg, ['TASHIH_IN_PROGRESS', 'REVISION_REQUIRED']);
  const assignment = await tx.assignment.findUnique({ where: { id }, include: { reviews: true, juz_items: true } });
  if (!isSuperAdmin && assignment.assignee_id !== user.id) fail(403, 'Penugasan ini bukan tanggung jawab Anda.');
  if (assignment.status === 'REVOKED') {
    fail(409, 'Penugasan pentashih ini telah dicabut sehingga tidak dapat lagi menerima atau mengubah hasil sidang.');
  }
  const isUpdatingMissingRecap = data.recap_file_id && assignment.reviews.length > 0 && assignment.reviews.some(r => !r.recap_file_id);
  if ((assignment.status === 'COMPLETED' || assignment.reviews.length) && reg.status !== 'REVISION_REQUIRED') {
    if (!isUpdatingMissingRecap) {
      fail(409, 'Hasil sidang untuk penugasan ini sudah disimpan dan tidak dapat ditimpa. Buka riwayat hasil; hubungi distributor jika diperlukan penugasan lanjutan.');
    }
  }

  // Validasi berkas rekapan internal wajib diunggah (B-06 / Item 8)
  if (!data.recap_file_id) {
    fail(400, 'Dokumen rekap hasil telaah internal wajib diunggah sebelum menyelesaikan tugas.');
  }
  const recapFile = await tx.storedFile.findUnique({ where: { id: data.recap_file_id } });
  if (!recapFile) {
    fail(404, 'Berkas rekapan yang diunggah tidak ditemukan pada sistem.');
  }
  if (recapFile.file_size !== undefined && recapFile.file_size <= 0) {
    fail(400, 'Berkas rekapan yang diunggah tidak boleh berupa berkas kosong (0 byte).');
  }
  if (!isSuperAdmin && recapFile.owner_id && recapFile.owner_id !== user.id) {
    fail(403, 'Berkas rekapan bukan milik akun pentashih Anda.');
  }
  if (recapFile.mime_type && !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'].some(m => recapFile.mime_type.includes(m) || recapFile.mime_type === m)) {
    fail(400, 'Format berkas rekapan tidak didukung. Unggah berkas dokumen PDF/Word/ZIP.');
  }

  // B-15: Penentuan lingkup rekap (recap_scope: TEAM vs SELF)
  // Pentashih individu mandiri (tanpa team_id) terkunci mutlak ke SELF
  const recapScope = assignment.team_id ? (data.recap_scope === 'TEAM' ? 'TEAM' : 'SELF') : 'SELF';

  if (assignment.juz_items?.length) {
    if (data.juz_items && Array.isArray(data.juz_items) && data.juz_items.length && tx.assignmentJuz?.updateMany) {
      for (const ji of data.juz_items) {
        await tx.assignmentJuz.updateMany({
          where: { assignment_id: id, juz_number: ji.juz_number },
          data: {
            result: ji.result || data.result,
            notes: ji.notes !== undefined ? (ji.notes?.trim() || null) : null,
            completed_at: new Date(),
          },
        });
      }
    } else if (tx.assignmentJuz?.updateMany) {
      await tx.assignmentJuz.updateMany({
        where: { assignment_id: id },
        data: {
          result: data.result,
          notes: null,
          completed_at: new Date(),
        },
      });
    }
  }

  let finalReview = null;
  if (assignment.reviews.length > 0) {
    // Perbarui review yang sudah ada (dukung upload berkas telaah setelah naskah dikembalikan - Item 10)
    const existingReview = assignment.reviews[0];
    finalReview = await tx.tashihReview.update({
      where: { id: existingReview.id },
      data: {
        result: data.result || existingReview.result,
        notes: data.notes !== undefined ? data.notes : existingReview.notes,
        recap_file_id: data.recap_file_id || existingReview.recap_file_id,
        recap_scope: recapScope,
      },
    });
    await tx.assignment.update({ where: { id }, data: { status: 'COMPLETED' } });
    await audit(tx, user, 'UPDATE_TASHIH_REVIEW', 'TashihReview', finalReview.id, finalReview);
  } else {
    finalReview = await tx.tashihReview.create({
      data: {
        assignment_id: id,
        result: data.result,
        notes: data.notes || null,
        recap_file_id: data.recap_file_id || null,
        recap_scope: recapScope,
      },
    });
    await tx.assignment.update({ where: { id }, data: { status: 'COMPLETED' } });
    await audit(tx, user, 'TASHIH_REVIEW', 'TashihReview', finalReview.id, finalReview);
  }

  // B-15 Solusi A2: Jika rekap berlingkup TEAM, gugurkan kewajiban unggah anggota lain
  // di kelompok yang sama dengan menandai penugasan aktif mereka menjadi COMPLETED
  if (recapScope === 'TEAM' && assignment.team_id && tx.assignment?.updateMany) {
    await tx.assignment.updateMany({
      where: {
        registration_id: assignment.registration_id,
        team_id: assignment.team_id,
        iteration: assignment.iteration,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        id: { not: id },
      },
      data: { status: 'COMPLETED' },
    });
  }

  return finalReview;
}, { isolationLevel: 'ReadCommitted' });

export const recordJuzChecklist = (id, juzNumber, data, user) => prisma.$transaction(async () => {
  fail(410, 'Pengisian checklist per juz telah dialihkan. Silakan gunakan unggah dokumen rekap hasil telaah internal dan lembar telaah sidang.');
});

export async function listMyAssignments(user, query = {}) {
  requireRole(user, ['PENTASHIH', 'SUPERADMIN']);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const where = buildMyAssignmentsWhere(user, query);

  return prisma.assignment.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      registration: {
        include: {
          publisher: { select: { id: true, legal_name: true } },
          service_type: { select: { id: true, name: true } },
          manuscript_files: true,
          official_documents: {
            where: { document_type: 'REVISION_RETURN_LETTER' },
            orderBy: { created_at: 'desc' },
          },
          publisher_revision_recaps: {
            include: { recap_file: true },
            orderBy: { round_number: 'desc' },
          },
        },
      },
      team: { select: { id: true, name: true, decree_no: true } },
      reviews: { orderBy: { completed_at: 'desc' } },
      juz_items: { orderBy: { juz_number: 'asc' } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export const assertDistributionReviewCompleteness = (assignments, { requireAllPassed = false } = {}) => {
  const allJuzInIteration = new Set(
    assignments.flatMap(a => (a.juz_items || []).map(j => j.juz_number))
  );

  const activeAssignments = assignments.filter(a => a.status !== 'REVOKED');
  if (activeAssignments.length === 0) {
    fail(409, 'Seluruh penugasan pada iterasi ini telah dicabut. Tugaskan pentashih pengganti sebelum mengambil keputusan.');
  }

  const activeTeamMap = new Map();
  const activeIndividual = [];

  for (const a of activeAssignments) {
    if (a.team_id) {
      if (!activeTeamMap.has(a.team_id)) activeTeamMap.set(a.team_id, []);
      activeTeamMap.get(a.team_id).push(a);
    } else {
      activeIndividual.push(a);
    }
  }

  // Tahap 1: Verifikasi kelengkapan status dan keberadaan review pada penugasan aktif
  const hasIncomplete = activeIndividual.some(item => item.status !== 'COMPLETED' || !item.reviews?.length) ||
    Array.from(activeTeamMap.values()).some(tAssignments => {
      const allReviews = tAssignments.flatMap(a => a.reviews || []);
      const teamScopeReview = allReviews.find(r => r.recap_scope === 'TEAM' && r.recap_file_id);
      if (teamScopeReview) return false;
      return tAssignments.some(item => item.status !== 'COMPLETED' || !item.reviews?.length);
    });

  if (hasIncomplete) {
    fail(409, 'Keputusan distributor belum dapat disimpan karena masih ada penugasan yang belum selesai atau belum memiliki hasil sidang. Minta seluruh pentashih pada iterasi ini melengkapi hasilnya.');
  }

  // Tahap 2: Verifikasi hasil keputusan telaah (semua review aktif wajib PASSED jika requireAllPassed = true)
  if (requireAllPassed && activeAssignments.some(item => item.reviews?.some(review => review.result !== 'PASSED'))) {
    fail(409, 'Pengajuan belum dapat direkomendasikan untuk STT karena masih ada hasil sidang yang tidak lulus. Periksa catatan pentashih dan tindak lanjuti perbaikan naskah.');
  }

  // Tahap 3: Verifikasi keberadaan berkas rekapan internal per unit pada penugasan aktif
  for (const [, tAssignments] of activeTeamMap.entries()) {
    const allReviews = tAssignments.flatMap(a => a.reviews || []);
    const teamScopeReview = allReviews.find(r => r.recap_scope === 'TEAM' && r.recap_file_id);
    if (!teamScopeReview) {
      const missingRecap = tAssignments.some(a => !a.reviews?.some(r => r.recap_file_id));
      if (missingRecap) {
        fail(409, 'Keputusan distributor belum dapat disimpan karena dokumen rekap hasil telaah internal belum diunggah oleh pentashih. Minta pentashih melengkapi dokumen rekap.');
      }
    }
  }

  for (const indAssignment of activeIndividual) {
    if (!indAssignment.reviews?.some(r => r.recap_file_id)) {
      fail(409, 'Keputusan distributor belum dapat disimpan karena dokumen rekap hasil telaah internal belum diunggah oleh pentashih. Minta pentashih melengkapi dokumen rekap.');
    }
  }

  const hasAnyRecap = activeAssignments.some(item => item.reviews?.some(r => r.recap_file_id));
  if (!hasAnyRecap) {
    fail(409, 'Keputusan distributor belum dapat disimpan karena dokumen rekap hasil telaah internal belum diunggah oleh pentashih. Minta pentashih melengkapi dokumen rekap.');
  }

  // Tahap 4: Validasi Integritas Cakupan Juz (Juz Coverage Gate)
  const coveredJuz = new Set();
  for (const [, tAssignments] of activeTeamMap.entries()) {
    const allReviews = tAssignments.flatMap(a => a.reviews || []);
    const teamScopeReview = allReviews.find(r => r.recap_scope === 'TEAM' && r.recap_file_id);
    if (teamScopeReview) {
      for (const a of tAssignments) {
        for (const j of (a.juz_items || [])) {
          coveredJuz.add(j.juz_number);
        }
      }
    } else {
      for (const a of tAssignments) {
        if (a.status === 'COMPLETED' && a.reviews?.some(r => r.recap_file_id)) {
          for (const j of (a.juz_items || [])) {
            coveredJuz.add(j.juz_number);
          }
        }
      }
    }
  }

  for (const ind of activeIndividual) {
    if (ind.status === 'COMPLETED' && ind.reviews?.some(r => r.recap_file_id)) {
      for (const j of (ind.juz_items || [])) {
        coveredJuz.add(j.juz_number);
      }
    }
  }

  if (allJuzInIteration.size > 0) {
    const missingJuz = Array.from(allJuzInIteration)
      .filter(j => !coveredJuz.has(j))
      .sort((a, b) => a - b);

    if (missingJuz.length > 0) {
      fail(409, `Keputusan sidang belum dapat disimpan karena ada juz (${missingJuz.map(j => 'Juz ' + j).join(', ')}) dari penugasan yang dicabut dan belum diselesaikan oleh pentashih pengganti. Tugaskan pentashih pengganti untuk menuntaskan telaah juz tersebut.`);
    }
  }
};

export const assertReadyForSttEligibility = async (tx, registrationId) => {
  const last = await tx.assignment.findFirst({ where: { registration_id: registrationId }, orderBy: { iteration: 'desc' } });
  if (!last) fail(409, 'Penugasan belum tersedia.');

  // B-16: Penegakan Siklus Wajib Dumi - Naskah wajib melalui dan lulus tahap DUMMY sebelum STT
  if (last.stage !== 'DUMMY') {
    fail(409, 'Pengajuan belum dapat direkomendasikan untuk STT karena belum melalui dan lulus tahap verifikasi naskah dumi fisik.');
  }
  const assignments = await tx.assignment.findMany({
    where: { registration_id: registrationId, iteration: last.iteration },
    include: { reviews: true, juz_items: true },
  });

  if (!assignments.length) fail(409, 'Penugasan belum tersedia.');
  assertDistributionReviewCompleteness(assignments, { requireAllPassed: true });

  return { lastIteration: last.iteration, assignments };
};

// dryRun: hanya menjalankan seluruh validasi tanpa mengubah data (keputusan masih menunggu paraf).
const applyDistributionDecision = async (tx, id, data, user, { dryRun = false, pemarafName = null } = {}) => {
  requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  requireStatus(reg, ['TASHIH_IN_PROGRESS']);
  const isSuperAdmin = user.roles?.includes('SUPERADMIN') || user.role === 'SUPERADMIN';
  if (reg.core_team_number && reg.core_distributor_id !== user.id && !isSuperAdmin) {
    fail(403, 'Hanya distributor tim inti pengajuan ini yang dapat mereviu hasil pentashih.');
  }
  const last = await tx.assignment.findFirst({ where: { registration_id: id }, orderBy: { iteration: 'desc' } });
  if (!last) fail(409, 'Penugasan belum tersedia.');
  const assignments = await tx.assignment.findMany({ where: { registration_id: id, iteration: last.iteration }, include: { reviews: true, juz_items: true } });

  // B-16: Naskah hanya berhak langsung ke READY_FOR_STT jika telah berada pada tahap DUMMY
  const isEligibleForStt = data.result === 'PASSED' && last.stage === 'DUMMY';

  // Agregasi putusan sidang: jika tahap DUMMY dan mau ke STT, seluruh hasil sidang wajib PASSED
  if (isEligibleForStt) {
    const allReviews = assignments.flatMap(a => a.reviews || []);
    const hasRevisionRequired = allReviews.some(r => r.result === 'REVISION_REQUIRED' || r.result === 'REJECTED');
    if (hasRevisionRequired) {
      fail(409, 'Pengajuan belum dapat direkomendasikan untuk STT karena masih ada hasil sidang yang tidak lulus (perlu perbaikan). Periksa catatan pentashih dan tindak lanjuti perbaikan naskah.');
    }
  }

  // B-17: Hukum dasar sidang - wajib nunggu seluruh pentashih/kelompok menyelesaikan rekapnya (baik PASSED maupun REVISION_REQUIRED)
  assertDistributionReviewCompleteness(assignments, { requireAllPassed: isEligibleForStt });

  const previousLetters = tx.officialDocument?.count
    ? await tx.officialDocument.count({ where: { registration_id: id, document_type: 'REVISION_RETURN_LETTER' } })
    : 0;

  if (isEligibleForStt) {
    await assertReadyForSttEligibility(tx, id);
  }
  if (data.result === 'REJECTED') fail(409, 'Penolakan akhir setelah pembayaran menunggu kebijakan resmi; gunakan perbaikan.');
  if (dryRun) return reg;

  // Finalisasi status assignment pada iterasi ini saat distributor menyimpan keputusan (Item 6)
  // B-19b guard: penugasan yang berstatus REVOKED tidak boleh ditimpa menjadi COMPLETED
  if (tx.assignment?.update) {
    for (const item of assignments) {
      if (item.status !== 'COMPLETED' && item.status !== 'REVOKED') {
        await tx.assignment.update({ where: { id: item.id }, data: { status: 'COMPLETED' } });
      }
    }
  }

  const status = isEligibleForStt ? 'READY_FOR_STT' : 'REVISION_REQUIRED';
  const isTransitionToDummy = data.result === 'PASSED' && last.stage !== 'DUMMY';
  const decisionNotes = isTransitionToDummy
    ? (data.notes || 'Telaah teks naskah dinyatakan lulus. Pengajuan dialihkan ke tahap dumi fisik; penerbit wajib mengirimkan master dumi cetak beserta rekapitulasi.')
    : (data.notes || (data.result === 'PASSED' ? 'Disetujui untuk penetapan Surat Tanda Tashih (STT)' : 'Perlu perbaikan naskah oleh penerbit'));

  await move(tx, reg, status, user, decisionNotes);

  let revisionRound = null;
  let revisionKind = null;

  if (status === 'REVISION_REQUIRED') {
    revisionKind = isTransitionToDummy ? 'NASKAH_DUMI' : (data.revision_kind || (last.stage === 'DUMMY' ? 'NASKAH_DUMI' : 'NASKAH_PERBAIKAN'));
    revisionRound = previousLetters + 1;

    // Reset physical dispatch status and mark revision source (RF-DIST-00)
    const outgoingDate = data.outgoing_tracking_no ? (data.outgoing_dispatch_date ? new Date(data.outgoing_dispatch_date) : new Date()) : null;
    await tx.registration.update({
      where: { id },
      data: {
        physical_dispatch_status: 'NOT_DISPATCHED',
        dispatch_courier: null,
        dispatch_tracking_no: null,
        dispatch_date: null,
        revision_source: 'TASHIH_REVISION',
        outgoing_courier: data.outgoing_courier || null,
        outgoing_tracking_no: data.outgoing_tracking_no || null,
        outgoing_dispatch_date: outgoingDate,
        outgoing_notes: data.outgoing_notes || null,
      },
    });

    // Reset physical master intake to PENDING for the revision/dummy round
    await tx.physicalMasterIntake.updateMany({
      where: { registration_id: id },
      data: {
        status: 'PENDING',
        sent_at: null,
        delivery_method: null,
        received_by_id: null,
        received_at: null,
        condition: null,
        receipt_no: null,
        notes: `Menunggu pengiriman naskah fisik ${revisionKind === 'NASKAH_DUMI' ? 'dumi' : 'perbaikan'} (Ronde #${revisionRound})`,
      },
    });

    if (tx.officialDocument?.create) {
      await tx.officialDocument.create({
        data: {
          registration_id: id,
          document_type: 'REVISION_RETURN_LETTER',
          document_no: `SRV-${reg.registration_no || id}-${revisionRound}`,
          version: revisionRound,
          status: 'DRAFT',
          content_snapshot: {
            title: reg.title,
            registration_no: reg.registration_no,
            publisher: reg.publisher?.legal_name,
            revision_round: revisionRound,
            revision_kind: revisionKind,
            notes: data.notes || '',
            distributor_name: user.name,
            pemaraf_name: pemarafName,
            created_at: new Date().toISOString(),
          },
        },
      });
    }
  }

  await audit(tx, user, 'DISTRIBUTOR_REVIEW', 'Registration', id, {
    ...data,
    revision_round: revisionRound,
    revision_kind: revisionKind,
  });

  if (status === 'REVISION_REQUIRED' && reg.publisher_id) {
    const publisher = await tx.publisher.findUnique({
      where: { id: reg.publisher_id },
      select: { user_id: true },
    });
    if (publisher?.user_id) {
      const typeLabel = revisionKind === 'NASKAH_DUMI' ? 'Pemeriksaan Naskah Dumi' : 'Perbaikan Naskah';
      await tx.notification.create({
        data: {
          user_id: publisher.user_id,
          registration_id: id,
          type: 'REVISION_REQUIRED',
          title: `Hasil Sidang Pentashihan: Memerlukan ${typeLabel} (Ronde #${revisionRound})`,
          payload: { link: `/publisher/registrations/${id}`, notes: data.notes, revision_round: revisionRound, revision_kind: revisionKind },
        },
      });
    }
  } else if (status === 'READY_FOR_STT') {
    const signatories = await tx.user.findMany({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { code: 'DOKUMENTATOR' } } },
      },
    });
    for (const officer of signatories) {
      await tx.notification.create({
        data: {
          user_id: officer.id,
          registration_id: id,
          type: 'READY_FOR_STT',
          title: 'Naskah Siap Penetapan Surat Tanda Tashih (STT)',
          payload: { link: `/internal/documents?id=${id}` },
        },
      });
    }
  }

  return tx.registration.findUnique({ where: { id } });
};

// Bila sudah ada akun Pemaraf aktif, keputusan distributor ditahan sampai diparaf SELURUH Pemaraf (saat ini 2,
// urutan bebas). Pemaraf tidak dipilih distributor; hanya akun berperan Pemaraf yang dapat memaraf.
export const approveDistribution = (id, { pemaraf_id: _ignored, pemaraf_ids, ...decision }, user) => prisma.$transaction(async tx => {
  if (!(await pemarafGateActive(tx))) return applyDistributionDecision(tx, id, decision, user);

  const reg = await applyDistributionDecision(tx, id, decision, user, { dryRun: true });
  const designated = await resolveDesignatedPemaraf(tx, pemaraf_ids);
  // Keputusan baru/ulang: paraf & pengesahan sebelumnya tidak berlaku lagi.
  await openParafRequest(tx, 'DISTRIBUTOR_REVIEW', id, designated, {
    requested_by_id: user.id,
    payload: decision,
    notify: {
      registration_id: id,
      title: `Keputusan sidang menunggu paraf Anda: ${reg.registration_no || reg.title}`,
      payload: { link: `/internal/distributions/monitoring?review=${id}` },
    },
  });
  await audit(tx, user, 'DISTRIBUTOR_REVIEW_WAITING_PARAF', 'Registration', id, decision);
  return { ...reg, pending_paraf: { pemaraf: null } };
}, { isolationLevel: 'ReadCommitted' });

export const getDistributionParaf = async (id) => {
  const gate_active = await pemarafGateActive(prisma);
  const paraf = await findParaf(prisma, 'DISTRIBUTOR_REVIEW', id);
  // Baris lama (tanpa penunjukan) yang parafnya lengkap sudah langsung dijalankan dahulu; bukan antrean lagi.
  if (!paraf || paraf.head_approved_at || (paraf.signed_at && !Array.isArray(paraf.assigned_ids))) return { gate_active, pending: null };
  const requested_by = paraf.requested_by_id
    ? await prisma.user.findUnique({ where: { id: paraf.requested_by_id }, select: { id: true, name: true } })
    : null;
  const { signers, required, assigned, complete } = parafProgress(paraf);
  return { gate_active, pending: {
    signers, required, assigned, requested_by, decision: paraf.payload, requested_at: paraf.created_at,
    // Paraf lengkap -> menunggu pengesahan Kepala LPMQ sebelum keputusan dijalankan.
    awaiting_head: complete,
  } };
};

// Setiap Pemaraf memaraf sekali; keputusan distributor baru dijalankan (atas nama distributor yang memutuskan)
// setelah paraf terakhir masuk.
export const parafDistribution = (id, user, req) => prisma.$transaction(async tx => {
  const paraf = await findParaf(tx, 'DISTRIBUTOR_REVIEW', id);
  if (!paraf || paraf.signed_at) fail(409, 'Tidak ada keputusan distributor yang menunggu paraf untuk pengajuan ini.');
  if (!user.isPemaraf) fail(403, 'Hanya akun dengan peran Pemaraf yang dapat membubuhkan paraf atas keputusan ini.');
  const requester = await tx.user.findUnique({ where: { id: paraf.requested_by_id }, include: { roles: { include: { role: true } } } });
  if (!requester) fail(409, 'Distributor pembuat keputusan tidak ditemukan. Minta distributor menyimpan ulang keputusannya.');

  const { complete, signers, required } = await addPemarafSignature(tx, 'DISTRIBUTOR_REVIEW', id, user, req);
  const reg = await tx.registration.findUnique({ where: { id } });
  await audit(tx, user, 'PARAF_DISTRIBUTOR_REVIEW', 'Registration', id, { result: paraf.payload?.result }, req);
  if (complete) {
    const heads = await tx.user.findMany({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'KEPALA_LPMQ' } } } }, select: { id: true } });
    await tx.notification.createMany({ data: heads.map(head => ({
      user_id: head.id, registration_id: id, type: 'APPROVAL_REQUEST',
      title: `Keputusan sidang menunggu pengesahan Anda: ${reg.registration_no || reg.title}`,
      payload: { link: `/internal/distributions/monitoring?review=${id}` },
    })) });
  }
  return { ...reg, pending_paraf: { signers, required, awaiting_head: complete } };
}, { isolationLevel: 'ReadCommitted' });

// Kepala LPMQ mengesahkan keputusan distributor setelah kedua Pemaraf memaraf; barulah keputusan dijalankan
// atas nama distributor yang memutuskan.
export const headApproveDistribution = (id, user, req) => prisma.$transaction(async tx => {
  if (user.isPemaraf) fail(403, 'Pengesahan keputusan sidang hanya oleh Kepala LPMQ. Pemaraf membubuhkan paraf sebelum pengesahan.');
  const paraf = await findParaf(tx, 'DISTRIBUTOR_REVIEW', id);
  if (!paraf || paraf.head_approved_at || !Array.isArray(paraf.assigned_ids)) fail(409, 'Tidak ada keputusan distributor yang menunggu pengesahan untuk pengajuan ini.');
  if (!paraf.signed_at) fail(409, 'Keputusan ini belum diparaf kedua Pemaraf yang ditunjuk.');
  const requester = await tx.user.findUnique({ where: { id: paraf.requested_by_id }, include: { roles: { include: { role: true } } } });
  if (!requester) fail(409, 'Distributor pembuat keputusan tidak ditemukan. Minta distributor menyimpan ulang keputusannya.');
  const { signers } = parafProgress(paraf);
  if (signers.some(signer => signer.id === user.id)) {
    fail(403, 'Kepala LPMQ yang mengesahkan keputusan sidang tidak boleh merupakan Pemaraf yang telah membubuhkan paraf.');
  }

  const actor = { id: requester.id, name: requester.name, roles: requester.roles.map(r => r.role.code) };
  const pemarafName = signers.map(signer => signer.name).filter(Boolean).join(' & ') || user.name;
  const result = await applyDistributionDecision(tx, id, paraf.payload, actor, { pemarafName });
  await tx.approvalParaf.update({ where: { id: paraf.id }, data: { head_approved_at: new Date(), head_approved_by_id: user.id } });
  await audit(tx, user, 'HEAD_APPROVE_DISTRIBUTOR_REVIEW', 'Registration', id, { result: paraf.payload?.result }, req);
  return result;
}, { isolationLevel: 'ReadCommitted' });

// Penimpaan (override) darurat paraf keputusan sidang oleh Super Admin
export const overrideDistributionParaf = async (id, data, user, req) => {
  return prisma.$transaction(async tx => {
    return overrideParafByAdmin(tx, 'DISTRIBUTOR_REVIEW', id, user, data?.reason, req);
  }, { isolationLevel: 'ReadCommitted' });
};


export const recordOutgoingDispatch = async (registrationId, data, user, req) => {
  return prisma.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id: registrationId },
      include: { publisher: true },
    });
    if (!reg) fail(404, 'Pengajuan tidak ditemukan.');

    const isDistributor = user.roles.includes('DISTRIBUTOR') || reg.core_distributor_id === user.id;
    const isAdmin = user.roles.some((r) => ['ADMIN_INTERNAL', 'SUPERADMIN'].includes(r));
    if (!isDistributor && !isAdmin) {
      fail(403, 'Hanya petugas Distributor atau Admin Internal yang berwenang mencatat resi pengiriman keluar.');
    }

    const dispatchDate = data.outgoing_dispatch_date ? new Date(data.outgoing_dispatch_date) : new Date();

    const updated = await tx.registration.update({
      where: { id: registrationId },
      data: {
        outgoing_courier: data.outgoing_courier,
        outgoing_tracking_no: data.outgoing_tracking_no,
        outgoing_dispatch_date: dispatchDate,
        outgoing_notes: data.outgoing_notes || null,
      },
    });

    await audit(tx, user, 'DISTRIBUTOR_OUTGOING_DISPATCH', 'Registration', registrationId, {
      outgoing_courier: data.outgoing_courier,
      outgoing_tracking_no: data.outgoing_tracking_no,
      outgoing_dispatch_date: dispatchDate,
      outgoing_notes: data.outgoing_notes,
    }, req);

    if (reg.publisher_id) {
      const publisher = await tx.publisher.findUnique({
        where: { id: reg.publisher_id },
        select: { user_id: true },
      });
      if (publisher?.user_id) {
        await tx.notification.create({
          data: {
            user_id: publisher.user_id,
            registration_id: registrationId,
            type: 'OUTGOING_DISPATCH_RECORDED',
            title: 'Naskah Fisik Dikirim Kembali oleh Distributor',
            payload: {
              courier: data.outgoing_courier,
              tracking_no: data.outgoing_tracking_no,
              message: `Naskah fisik hasil sidang pentashihan telah dikirim kembali via ${data.outgoing_courier} dengan nomor resi ${data.outgoing_tracking_no}.`,
              link: `/publisher/registrations/${registrationId}?tab=fisik`,
            },
          },
        });
      }
    }

    return updated;
  }, { isolationLevel: 'ReadCommitted' });
};

export const sendPublisherReminder = async (registrationId, user, req) => {
  return prisma.$transaction(async (tx) => {
    const reg = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        publisher: { include: { user: true } },
      },
    });

    if (!reg) fail(404, 'Pengajuan tidak ditemukan.');

    const isDistributor = user.roles.includes('DISTRIBUTOR') || reg.core_distributor_id === user.id;
    const isAdmin = user.roles.some((r) => ['ADMIN_INTERNAL', 'SUPERADMIN'].includes(r));
    if (!isDistributor && !isAdmin) {
      fail(403, 'Hanya petugas Distributor atau Admin Internal yang berwenang mengirimkan pengingat perbaikan ke penerbit.');
    }

    if (reg.status !== 'REVISION_REQUIRED') {
      fail(409, `Pengingat perbaikan hanya dapat dikirimkan saat pengajuan berstatus "REVISION_REQUIRED". Status saat ini adalah "${reg.status}".`);
    }

    const enteredAt = reg.stage_entered_at || reg.updated_at || reg.created_at;
    const waitingMs = Date.now() - new Date(enteredAt).getTime();
    const waitingDays = Math.max(1, Math.floor(waitingMs / (1000 * 60 * 60 * 24)));

    const existingMeta =
      typeof reg.foreign_metadata === 'object' && reg.foreign_metadata !== null
        ? reg.foreign_metadata
        : typeof reg.foreign_metadata === 'string'
        ? JSON.parse(reg.foreign_metadata || '{}')
        : {};

    const lastLetter = await tx.officialDocument.findFirst({
      where: { registration_id: registrationId, document_type: 'REVISION_RETURN_LETTER' },
      orderBy: { created_at: 'desc' },
    });
    const revisionRound = lastLetter?.content_snapshot?.revision_round || reg.revision_round || 1;
    const revisionKind = lastLetter?.content_snapshot?.revision_kind || reg.revision_kind || 'NASKAH_PERBAIKAN';
    const kindLabel = revisionKind === 'NASKAH_DUMI' ? 'Naskah Dumi Final' : 'Naskah Perbaikan';

    if (reg.publisher?.user_id) {
      await tx.notification.create({
        data: {
          user_id: reg.publisher.user_id,
          registration_id: registrationId,
          type: 'REVISION_REMINDER',
          title: `Pengingat: Segera Kirimkan ${kindLabel} (Ronde #${revisionRound})`,
          payload: {
            waiting_days: waitingDays,
            revision_round: revisionRound,
            revision_kind: revisionKind,
            message: `Permohonan ${reg.registration_no} telah menunggu ${kindLabel} dari Anda selama ${waitingDays} hari. Mohon segera mengunggah berkas perbaikan dan mengirimkan naskah fisik ke LPMQ TMII.`,
            link: `/publisher/registrations/${registrationId}?tab=fisik`,
          },
        },
      });
    }

    const reminderCount = (existingMeta.reminder_count || 0) + 1;
    const updatedMeta = {
      ...existingMeta,
      last_reminder_at: new Date().toISOString(),
      reminder_count: reminderCount,
    };

    const updated = await tx.registration.update({
      where: { id: registrationId },
      data: {
        foreign_metadata: updatedMeta,
      },
    });

    await audit(tx, user, 'SEND_PUBLISHER_REMINDER', 'Registration', registrationId, {
      waiting_days: waitingDays,
      reminder_count: reminderCount,
      revision_round: revisionRound,
    }, req);

    return {
      success: true,
      message: `Pengingat berhasil dikirimkan kepada ${reg.publisher?.legal_name || 'penerbit'}. Waktu tunggu: ${waitingDays} hari.`,
      waiting_days: waitingDays,
      reminder_count: reminderCount,
      last_reminder_at: updatedMeta.last_reminder_at,
    };
  }, { isolationLevel: 'ReadCommitted' });
};

export const sendPeriodicReminders = async (user, options = {}) => {
  const minWaitingDays = options.minWaitingDays || 7;
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - minWaitingDays * 24 * 60 * 60 * 1000);

  const pendingRegistrations = await prisma.registration.findMany({
    where: {
      status: 'REVISION_REQUIRED',
      stage_entered_at: { lte: thresholdDate },
    },
    include: {
      publisher: true,
    },
  });

  const sent = [];
  for (const reg of pendingRegistrations) {
    const meta = typeof reg.foreign_metadata === 'object' && reg.foreign_metadata !== null
      ? reg.foreign_metadata
      : {};
    if (meta.last_reminder_at) {
      const lastSent = new Date(meta.last_reminder_at).getTime();
      if (now.getTime() - lastSent < 7 * 24 * 60 * 60 * 1000) {
        continue;
      }
    }

    try {
      const res = await sendPublisherReminder(reg.id, user);
      sent.push({ id: reg.id, registration_no: reg.registration_no, ...res });
    } catch {
      // Continue scan
    }
  }

  return {
    total_scanned: pendingRegistrations.length,
    reminders_sent: sent.length,
    details: sent,
  };
};