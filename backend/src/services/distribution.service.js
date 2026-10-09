import { prisma } from '../config/database.js';
import { calculateDueAt } from './sla.service.js';
import { fail, requireRole, registration, requireStatus, move, audit } from './workflow-utils.js';
import { MANUAL_TEAM_ASSIGNMENT_ROLES } from '../middlewares/admin-internal.middleware.js';

export const createAssignments = (id, data, user) => prisma.$transaction(async tx => {
  const reg = await registration(tx, id);
  if (reg.core_team_number) {
    requireRole(user, ['DISTRIBUTOR']);
    if (reg.core_distributor_id !== user.id) fail(403, 'Hanya distributor tim inti pengajuan ini yang dapat membagikan tugas pentashih.');
  } else {
    requireRole(user, MANUAL_TEAM_ASSIGNMENT_ROLES);
  }
  requireStatus(reg, ['WAITING_DISTRIBUTION']);
  if (!await tx.paymentRecord.findFirst({ where: { registration_id: id, status: 'VERIFIED' } })) fail(409, 'Penugasan belum dapat dibuat karena pembayaran belum dinyatakan lunas. Minta verifikator memeriksa bukti pembayaran terlebih dahulu.');
  const previous = await tx.assignment.findFirst({ where: { registration_id: id }, orderBy: { iteration: 'desc' } });
  const expectedStage = previous ? 'REVISION' : reg.registration_type === 'EXTENSION' ? 'DUMMY' : 'INITIAL';
  if (data.stage !== expectedStage) fail(409, `Tahap penugasan yang diperlukan: ${expectedStage}.`);
  const now = new Date();
  const team = await tx.distributionTeam.findUnique({ where: { id: data.team_id }, include: { members: { include: { user: { include: { roles: { include: { role: true } } } } } } } });
  if (!team || team.status !== 'ACTIVE' || team.active_from > now || (team.active_to && team.active_to < now)) fail(409, 'Tim yang dipilih tidak tersedia atau masa berlaku SK-nya belum dimulai/sudah berakhir. Pilih tim dengan SK aktif atau minta administrator memperbarui data tim.');
  const entries = data.juz_assignments || data.assignee_ids.map(assignee_id => ({ assignee_id, juz_numbers: [] }));
  const allJuz = entries.flatMap(e => e.juz_numbers || []);
  if (allJuz.length > 0 && new Set(allJuz).size !== allJuz.length) {
    fail(400, 'Rentang atau nomor juz tidak boleh tumpang tindih antar pentashih.');
  }
  for (const { assignee_id: id } of entries) {
    const member = team.members.find(member => member.user_id === id);
    if (!member || member.status !== 'ACTIVE' || member.user.status !== 'ACTIVE' || !member.user.roles.some(item => item.role.code === 'PENTASHIH')) fail(400, 'Ada pentashih yang bukan anggota aktif tim terpilih atau akunnya tidak aktif. Periksa daftar anggota dan pilih pentashih yang terdaftar pada SK tim tersebut.');
  }
  const verifiedPayment = await tx.paymentRecord.findFirst({
    where: { registration_id: id, status: 'VERIFIED' },
    orderBy: { verified_at: 'desc' },
  });
  const receivedHandover = data.stage === 'REVISION' ? null : await tx.physicalManuscriptHandover.findFirst({
    where: { registration_id: id, status: 'RECEIVED' }, orderBy: { received_at: 'desc' }, select: { tashih_due_at: true },
  });
  const slaDays = Number(reg.fee_sla_snapshot?.[`sla_${data.stage.toLowerCase()}_days`]) || 15;
  const slaBaseDate = verifiedPayment?.verified_at || now;
  const due_at = receivedHandover?.tashih_due_at || await calculateDueAt(tx, slaBaseDate, slaDays, { applyCutoff: true });
  const assignments = [];
  for (const { assignee_id, juz_numbers } of entries) {
    const assignment = await tx.assignment.create({ data: {
      registration_id: id, team_id: team.id, assignee_id, stage: data.stage,
      iteration: (previous?.iteration || 0) + 1, due_at,
      ...(juz_numbers.length ? { juz_items: { create: juz_numbers.map(juz_number => ({ juz_number })) } } : {}),
    } });
    assignments.push(assignment);
    await audit(tx, user, 'CREATE_ASSIGNMENT', 'Assignment', assignment.id, assignment);
    await tx.notification.create({ data: { user_id: assignee_id, registration_id: id, type: 'ASSIGNMENT', title: 'Penugasan pentashihan baru', payload: { assignment_id: assignment.id, link: '/internal/tashih' } } });
  }
  await move(tx, reg, 'TASHIH_IN_PROGRESS', user, 'Tim dan pentashih ditetapkan');
  return assignments;
}, { isolationLevel: 'ReadCommitted' });

export async function workload(id, user) {
  // Read-only workload remains available to Distributor for their own duties.
  requireRole(user, ['HELPER_ADMIN', 'DISTRIBUTOR', 'SUPERADMIN']);
  if (!await prisma.distributionTeam.findUnique({ where: { id } })) fail(404, 'Tim tidak ditemukan.');
  return prisma.assignment.groupBy({ by: ['assignee_id', 'status'], where: { team_id: id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'] } }, _count: { _all: true } });
}

export const recordReview = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['PENTASHIH']);
  const initial = await tx.assignment.findUnique({ where: { id } });
  if (!initial) fail(404, 'Penugasan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireStatus(reg, ['TASHIH_IN_PROGRESS']);
  const assignment = await tx.assignment.findUnique({ where: { id }, include: { reviews: true, juz_items: true } });
  if (assignment.assignee_id !== user.id) fail(403, 'Penugasan ini bukan tanggung jawab Anda.');
  if (assignment.status === 'COMPLETED' || assignment.reviews.length) fail(409, 'Hasil sidang untuk penugasan ini sudah disimpan dan tidak dapat ditimpa. Buka riwayat hasil; hubungi distributor jika diperlukan penugasan lanjutan.');

  if (assignment.juz_items?.length && tx.assignmentJuz?.updateMany) {
    await tx.assignmentJuz.updateMany({
      where: { assignment_id: id },
      data: {
        result: data.result,
        notes: data.notes || (data.result === 'PASSED' ? 'Lolos telaah rentang juz' : 'Perlu perbaikan naskah'),
        completed_at: new Date(),
      },
    });
  }

  const finalNotes = data.recap_file_id
    ? `${data.notes || ''}\n[RECAP_FILE:${data.recap_file_id}]`.trim()
    : data.notes;

  const review = await tx.tashihReview.create({ data: { assignment_id: id, result: data.result, notes: finalNotes } });
  await tx.assignment.update({ where: { id }, data: { status: 'COMPLETED' } });
  await audit(tx, user, 'TASHIH_REVIEW', 'TashihReview', review.id, { ...review, recap_file_id: data.recap_file_id });
  return { ...review, recap_file_id: data.recap_file_id || null };
}, { isolationLevel: 'ReadCommitted' });

export const recordJuzChecklist = (id, juzNumber, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['PENTASHIH']);
  const initial = await tx.assignment.findUnique({ where: { id }, select: { registration_id: true } });
  if (!initial) fail(404, 'Penugasan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireStatus(reg, ['TASHIH_IN_PROGRESS']);
  const assignment = await tx.assignment.findUnique({ where: { id }, include: { juz_items: true, reviews: true } });
  if (assignment.assignee_id !== user.id) fail(403, 'Penugasan ini bukan tanggung jawab Anda.');
  if (assignment.status === 'COMPLETED' || assignment.reviews.length) fail(409, 'Checklist penugasan ini sudah selesai.');
  const item = assignment.juz_items.find(row => row.juz_number === Number(juzNumber));
  if (!item) fail(404, 'Juz ini tidak ditugaskan kepada Anda.');
  if (item.result) fail(409, 'Checklist juz ini sudah disimpan dan tidak dapat ditimpa.');
  const updated = await tx.assignmentJuz.update({ where: { id: item.id }, data: {
    result: data.result, notes: data.notes || null, completed_at: new Date(),
  } });
  await audit(tx, user, 'TASHIH_JUZ_CHECKLIST', 'AssignmentJuz', item.id, updated);
  const all = assignment.juz_items.map(row => row.id === item.id ? updated : row);
  if (all.every(row => row.result)) {
    const result = all.some(row => row.result === 'REVISION_REQUIRED') ? 'REVISION_REQUIRED' : 'PASSED';
    const flagged = all.filter(row => row.result === 'REVISION_REQUIRED').map(row => row.juz_number);
    const notes = flagged.length ? `Perlu perbaikan pada juz ${flagged.join(', ')}. Lihat checklist per juz.` : `Seluruh ${all.length} juz yang ditugaskan selesai ditashih.`;
    const review = await tx.tashihReview.create({ data: { assignment_id: id, result, notes } });
    await tx.assignment.update({ where: { id }, data: { status: 'COMPLETED' } });
    await audit(tx, user, 'TASHIH_REVIEW', 'TashihReview', review.id, review);
  } else if (assignment.status === 'ASSIGNED') {
    await tx.assignment.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
  }
  return updated;
}, { isolationLevel: 'ReadCommitted' });

export async function listMyAssignments(user, query = {}) {
  requireRole(user, ['PENTASHIH', 'SUPERADMIN']);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const where = { assignee_id: user.id };
  if (query.status === 'COMPLETED') {
    where.status = 'COMPLETED';
  } else if (query.status === 'ACTIVE') {
    where.status = { in: ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'] };
  } else if (query.status) {
    where.status = query.status;
  }

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
        },
      },
      team: { select: { id: true, name: true, decree_no: true } },
      reviews: { orderBy: { completed_at: 'desc' } },
      juz_items: { orderBy: { juz_number: 'asc' } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export const approveDistribution = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  requireStatus(reg, ['TASHIH_IN_PROGRESS']);
  if (reg.core_team_number && reg.core_distributor_id !== user.id) fail(403, 'Hanya distributor tim inti pengajuan ini yang dapat mereviu hasil pentashih.');
  const last = await tx.assignment.findFirst({ where: { registration_id: id }, orderBy: { iteration: 'desc' } });
  if (!last) fail(409, 'Penugasan belum tersedia.');
  const assignments = await tx.assignment.findMany({ where: { registration_id: id, iteration: last.iteration }, include: { reviews: true } });
  if (assignments.some(item => item.status !== 'COMPLETED' || !item.reviews.length)) fail(409, 'Keputusan distributor belum dapat disimpan karena masih ada penugasan yang belum selesai atau belum memiliki hasil sidang. Minta seluruh pentashih pada iterasi ini melengkapi hasilnya.');
  if (data.result === 'PASSED' && assignments.some(item => item.reviews.some(review => review.result !== 'PASSED'))) fail(409, 'Pengajuan belum dapat direkomendasikan untuk STT karena masih ada hasil sidang yang tidak lulus. Periksa catatan pentashih dan tindak lanjuti perbaikan naskah.');
  if (data.result === 'REJECTED') fail(409, 'Penolakan akhir setelah pembayaran menunggu kebijakan resmi; gunakan perbaikan.');
  const status = data.result === 'PASSED' ? 'READY_FOR_STT' : 'REVISION_REQUIRED';
  await move(tx, reg, status, user, data.notes);

  let revisionRound = null;
  let revisionKind = null;

  if (status === 'REVISION_REQUIRED') {
    revisionKind = data.revision_kind || 'NASKAH_PERBAIKAN';
    const previousLetters = tx.officialDocument?.count
      ? await tx.officialDocument.count({ where: { registration_id: id, document_type: 'REVISION_RETURN_LETTER' } })
      : 0;
    revisionRound = previousLetters + 1;

    if (tx.officialDocument?.create) {
      await tx.officialDocument.create({
        data: {
          registration_id: id,
          document_type: 'REVISION_RETURN_LETTER',
          document_no: `SRV-${reg.registration_no || id}-${revisionRound}`,
          version: revisionRound,
          status: 'ISSUED',
          issued_at: new Date(),
          content_snapshot: {
            title: reg.title,
            registration_no: reg.registration_no,
            publisher: reg.publisher?.legal_name,
            revision_round: revisionRound,
            revision_kind: revisionKind,
            notes: data.notes,
            distributor_name: user.name,
            created_at: new Date().toISOString(),
          },
        },
      });
    }
  }

  await audit(tx, user, 'DISTRIBUTOR_REVIEW', 'Registration', id, { ...data, revision_round: revisionRound, revision_kind: revisionKind });

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
        roles: { some: { role: { code: { in: ['KEPALA_LPMQ', 'DOKUMENTATOR'] } } } },
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
}, { isolationLevel: 'ReadCommitted' });
