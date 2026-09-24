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
  for (const id of data.assignee_ids) {
    const member = team.members.find(member => member.user_id === id);
    if (!member || member.status !== 'ACTIVE' || member.user.status !== 'ACTIVE' || !member.user.roles.some(item => item.role.code === 'PENTASHIH')) fail(400, 'Ada pentashih yang bukan anggota aktif tim terpilih atau akunnya tidak aktif. Periksa daftar anggota dan pilih pentashih yang terdaftar pada SK tim tersebut.');
  }
  const due_at = await calculateDueAt(tx, now, reg.fee_sla_snapshot?.[`sla_${data.stage.toLowerCase()}_days`]);
  const assignments = [];
  for (const assignee_id of data.assignee_ids) {
    const assignment = await tx.assignment.create({ data: { registration_id: id, team_id: team.id, assignee_id, stage: data.stage, iteration: (previous?.iteration || 0) + 1, due_at } });
    assignments.push(assignment);
    await audit(tx, user, 'CREATE_ASSIGNMENT', 'Assignment', assignment.id, assignment);
    await tx.notification.create({ data: { user_id: assignee_id, registration_id: id, type: 'ASSIGNMENT', title: 'Penugasan pentashihan baru', payload: { assignment_id: assignment.id, link: '/internal/tashih' } } });
  }
  await move(tx, reg, 'TASHIH_IN_PROGRESS', user, 'Tim dan pentashih ditetapkan');
  return assignments;
}, { isolationLevel: 'ReadCommitted' });

export async function workload(id, user) {
  // Read-only workload remains available to Distributor for their own duties.
  requireRole(user, ['ADMIN', 'DISTRIBUTOR', 'SUPERADMIN']);
  if (!await prisma.distributionTeam.findUnique({ where: { id } })) fail(404, 'Tim tidak ditemukan.');
  return prisma.assignment.groupBy({ by: ['assignee_id', 'status'], where: { team_id: id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'] } }, _count: { _all: true } });
}

export const recordReview = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['PENTASHIH']);
  const initial = await tx.assignment.findUnique({ where: { id } });
  if (!initial) fail(404, 'Penugasan tidak ditemukan.');
  const reg = await registration(tx, initial.registration_id);
  requireStatus(reg, ['TASHIH_IN_PROGRESS']);
  const assignment = await tx.assignment.findUnique({ where: { id }, include: { reviews: true } });
  if (assignment.assignee_id !== user.id) fail(403, 'Penugasan ini bukan tanggung jawab Anda.');
  if (assignment.status === 'COMPLETED' || assignment.reviews.length) fail(409, 'Hasil sidang untuk penugasan ini sudah disimpan dan tidak dapat ditimpa. Buka riwayat hasil; hubungi distributor jika diperlukan penugasan lanjutan.');
  const review = await tx.tashihReview.create({ data: { assignment_id: id, ...data } });
  await tx.assignment.update({ where: { id }, data: { status: 'COMPLETED' } });
  await audit(tx, user, 'TASHIH_REVIEW', 'TashihReview', review.id, review);
  return review;
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
          publisher: { select: { id: true, legal_name: true, brand_name: true } },
          service_type: { select: { id: true, name: true, code: true } },
          manuscript_files: true,
        },
      },
      team: { select: { id: true, name: true, decree_no: true } },
      reviews: { orderBy: { completed_at: 'desc' } },
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
  await audit(tx, user, 'DISTRIBUTOR_REVIEW', 'Registration', id, data);

  if (status === 'REVISION_REQUIRED' && reg.publisher_id) {
    const publisher = await tx.publisher.findUnique({
      where: { id: reg.publisher_id },
      select: { user_id: true },
    });
    if (publisher?.user_id) {
      await tx.notification.create({
        data: {
          user_id: publisher.user_id,
          registration_id: id,
          type: 'REVISION_REQUIRED',
          title: 'Hasil Sidang Pentashihan Memerlukan Perbaikan Naskah',
          payload: { link: `/publisher/registrations/${id}`, notes: data.notes },
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
