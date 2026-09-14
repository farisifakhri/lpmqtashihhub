import { prisma } from '../config/database.js';
import { calculateDueAt } from './sla.service.js';
import { fail, requireRole, registration, requireStatus, move, audit } from './workflow-utils.js';

export const createAssignments = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
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
    await tx.notification.create({ data: { user_id: assignee_id, registration_id: id, type: 'ASSIGNMENT', title: 'Penugasan pentashihan baru', payload: { assignment_id: assignment.id } } });
  }
  await move(tx, reg, 'TASHIH_IN_PROGRESS', user, 'Tim dan pentashih ditetapkan');
  return assignments;
}, { isolationLevel: 'ReadCommitted' });

export async function workload(id, user) {
  requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN']);
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

export const approveDistribution = (id, data, user) => prisma.$transaction(async tx => {
  requireRole(user, ['DISTRIBUTOR', 'SUPERADMIN']);
  const reg = await registration(tx, id);
  requireStatus(reg, ['TASHIH_IN_PROGRESS']);
  const last = await tx.assignment.findFirst({ where: { registration_id: id }, orderBy: { iteration: 'desc' } });
  if (!last) fail(409, 'Penugasan belum tersedia.');
  const assignments = await tx.assignment.findMany({ where: { registration_id: id, iteration: last.iteration }, include: { reviews: true } });
  if (assignments.some(item => item.status !== 'COMPLETED' || !item.reviews.length)) fail(409, 'Keputusan distributor belum dapat disimpan karena masih ada penugasan yang belum selesai atau belum memiliki hasil sidang. Minta seluruh pentashih pada iterasi ini melengkapi hasilnya.');
  if (data.result === 'PASSED' && assignments.some(item => item.reviews.some(review => review.result !== 'PASSED'))) fail(409, 'Pengajuan belum dapat direkomendasikan untuk STT karena masih ada hasil sidang yang tidak lulus. Periksa catatan pentashih dan tindak lanjuti perbaikan naskah.');
  if (data.result === 'REJECTED') fail(409, 'Penolakan akhir setelah pembayaran menunggu kebijakan resmi; gunakan perbaikan.');
  const status = data.result === 'PASSED' ? 'READY_FOR_STT' : 'REVISION_REQUIRED';
  await move(tx, reg, status, user, data.notes);
  await audit(tx, user, 'DISTRIBUTOR_REVIEW', 'Registration', id, data);
  return tx.registration.findUnique({ where: { id } });
}, { isolationLevel: 'ReadCommitted' });
