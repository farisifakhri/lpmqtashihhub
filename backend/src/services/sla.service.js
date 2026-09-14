import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

export const jakartaDate = date => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);

export async function calculateDueAt(db, start, days) {
  if (!Number.isInteger(days) || days < 1) fail(409, 'Tenggat penugasan belum dapat dihitung karena durasi layanan pada pengajuan tidak lengkap. Minta administrator memeriksa data durasi layanan.');
  const firstDate = new Date(`${jakartaDate(start)}T00:00:00Z`);
  const calendar = await db.workingDay.findMany({ where: { date: { gt: firstDate } }, orderBy: { date: 'asc' }, take: 3660 });
  let cursor = firstDate.getTime();
  let remaining = days;
  for (const day of calendar) {
    cursor += 86400000;
    if (day.date.getTime() !== cursor) fail(409, 'Tenggat penugasan belum dapat dihitung karena ada tanggal yang belum tercatat pada kalender kerja. Minta administrator melengkapi seluruh tanggal, termasuk hari libur.');
    if (day.is_working_day && --remaining === 0) return new Date(`${day.date.toISOString().slice(0, 10)}T23:59:59.999+07:00`);
  }
  fail(409, 'Kalender kerja belum tersedia sampai akhir durasi penugasan. Minta administrator menambahkan kalender periode berikutnya, lalu ulangi penugasan.');
}

export async function markOverdue(now = new Date()) {
  return prisma.$transaction(async tx => {
    const overdue = await tx.assignment.findMany({ where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] }, due_at: { lt: now } } });
    let count = 0;
    for (const assignment of overdue) {
      const result = await tx.assignment.updateMany({ where: { id: assignment.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] }, due_at: { lt: now } }, data: { status: 'OVERDUE' } });
      if (result.count) {
        count++;
        await tx.auditLog.create({ data: { action: 'SLA_OVERDUE', subject_type: 'Assignment', subject_id: assignment.id, after_json: { due_at: assignment.due_at.toISOString() } } });
      }
    }
    return { count };
  });
}
