import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

export const WORK_HOURS_CONFIG = {
  START_HOUR: 8,
  END_HOUR: 16,
  TIMEZONE: 'Asia/Jakarta',
  CUTOFF_HOUR_JAKARTA: 16,
};

export const jakartaDate = date => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);

export async function calculateDueAt(db, start, days, options = {}) {
  if (!Number.isInteger(days) || days < 1) fail(409, 'Tenggat penugasan belum dapat dihitung karena durasi layanan pada pengajuan tidak lengkap. Minta administrator memeriksa data durasi layanan.');
  
  let baseStart = start;
  const applyCutoff = Boolean(options?.applyCutoff);
  if (applyCutoff) {
    const jakartaHour = new Date(start.getTime() + 7 * 3600000).getUTCHours();
    const cutoff = options.cutoffHour ?? WORK_HOURS_CONFIG.CUTOFF_HOUR_JAKARTA;
    if (jakartaHour >= cutoff) {
      // Lewat jam operasional loket: mulai hitung dari hari kerja berikutnya
      baseStart = new Date(start.getTime() + 24 * 3600000);
    }
  }

  const firstDate = new Date(`${jakartaDate(baseStart)}T00:00:00Z`);
  const whereClause = applyCutoff
    ? { date: { gte: firstDate } }
    : { date: { gt: firstDate } };

  const calendar = await db.workingDay.findMany({
    where: whereClause,
    orderBy: { date: 'asc' },
    take: 3660,
  });

  let cursor = applyCutoff ? firstDate.getTime() - 86400000 : firstDate.getTime();
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

/**
 * Menghitung selisih hari kerja antara dua waktu (from -> to) berbasis kalender kerja resmi (working_days).
 * @param {object} db Prisma client atau transaction
 * @param {Date|string} from Waktu mulai (misal: started_at atau assigned_at)
 * @param {Date|string} to Waktu selesai (misal: result_sent_at)
 * @param {object} options Opsi perhitungan { applyCutoff: boolean, cutoffHour: number }
 * @returns {Promise<number>} Jumlah hari kerja yang digunakan
 */
export async function countWorkingDays(db, from, to, options = {}) {
  if (!from || !to) return 0;
  const fromDate = from instanceof Date ? from : new Date(from);
  const toDate = to instanceof Date ? to : new Date(to);

  let baseStart = fromDate;
  const applyCutoff = Boolean(options?.applyCutoff);
  if (applyCutoff) {
    const jakartaHour = new Date(fromDate.getTime() + 7 * 3600000).getUTCHours();
    const cutoff = options.cutoffHour ?? WORK_HOURS_CONFIG.CUTOFF_HOUR_JAKARTA;
    if (jakartaHour >= cutoff) {
      baseStart = new Date(fromDate.getTime() + 24 * 3600000);
    }
  }

  const startJakarta = jakartaDate(baseStart);
  const endJakarta = jakartaDate(toDate);
  const dStart = new Date(`${startJakarta}T00:00:00Z`);
  const dEnd = new Date(`${endJakarta}T00:00:00Z`);

  if (dEnd < dStart) return 0;

  const count = await db.workingDay.count({
    where: {
      date: {
        gte: dStart,
        lte: dEnd,
      },
      is_working_day: true,
    },
  });

  // Jika tabel kalender kerja belum terisi untuk rentang tanggal ini,
  // gunakan estimasi hari kerja standar (Senin-Jumat) agar metrik SLA tidak 0 secara diam-diam.
  const totalInCalendar = await db.workingDay.count({
    where: {
      date: {
        gte: dStart,
        lte: dEnd,
      },
    },
  });

  if (totalInCalendar === 0) {
    let standardDays = 0;
    const cur = new Date(dStart);
    while (cur <= dEnd) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) standardDays++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return standardDays;
  }

  return count;
}

/**
 * Menentukan klasifikasi hasil SLA verifikasi (EARLY, ON_TIME, LATE).
 * Mengacu pada tanggal dan waktu Indonesia Barat (Asia/Jakarta):
 * - EARLY: tanggal kirim < tanggal due_at
 * - ON_TIME: tanggal kirim = tanggal due_at DAN waktu kirim <= due_at
 * - LATE: selebihnya
 * - null: jika dueAt atau sentAt tidak tersedia
 * @param {Date|string} dueAt Tenggat waktu SLA
 * @param {Date|string} sentAt Waktu pengiriman surat
 * @returns {'EARLY'|'ON_TIME'|'LATE'|null}
 */
export function determineVerificationSlaOutcome(dueAt, sentAt) {
  if (!dueAt || !sentAt) return null;
  const dDue = dueAt instanceof Date ? dueAt : new Date(dueAt);
  const dSent = sentAt instanceof Date ? sentAt : new Date(sentAt);

  const sentJakarta = jakartaDate(dSent);
  const dueJakarta = jakartaDate(dDue);

  if (sentJakarta < dueJakarta) {
    return 'EARLY';
  }
  if (sentJakarta === dueJakarta && dSent.getTime() <= dDue.getTime()) {
    return 'ON_TIME';
  }
  return 'LATE';
}

/**
 * Menghitung metrik SLA penugasan sidang untuk sebuah registrasi.
 * Mengembalikan { elapsed_working_days, target_working_days, due_at, sla_status, status_label }
 * @param {object} db Prisma client atau transaction
 * @param {object} item Registrasi bersangkutan (termasuk assignments, physical_handovers, service_type)
 * @param {Date} now Waktu acuan sekarang (default: new Date())
 * @returns {Promise<object>}
 */
export async function computeRegistrationSla(db, item, now = new Date()) {
  if (!item) {
    return {
      elapsed_working_days: 0,
      target_working_days: 15,
      due_at: null,
      sla_status: 'ON_TIME',
      status_label: 'Tepat Waktu',
    };
  }

  const assignments = item.assignments || [];
  const latestAssignment = assignments[0];
  const stage = latestAssignment?.stage || (item.registration_type === 'EXTENSION' ? 'DUMMY' : 'INITIAL');

  // 1. Target working days (HK)
  const slaKey = `sla_${stage.toLowerCase()}_days`;
  let targetWorkingDays = item.fee_sla_snapshot?.[slaKey];
  if (!targetWorkingDays && item.service_type) {
    targetWorkingDays = stage === 'INITIAL'
      ? item.service_type.duration_initial
      : stage === 'REVISION'
      ? item.service_type.duration_revision
      : item.service_type.duration_dummy;
  }
  targetWorkingDays = Number(targetWorkingDays) || (stage === 'INITIAL' ? 15 : stage === 'REVISION' ? 7 : 3);

  // 2. Start Date (dari BAST fisik received_at, atau stage_entered_at, atau created_at)
  const receivedHandover = Array.isArray(item.physical_handovers)
    ? item.physical_handovers.find(h => h.status === 'RECEIVED') || item.physical_handovers[0]
    : null;

  let startDate = receivedHandover?.received_at
    ? new Date(receivedHandover.received_at)
    : (item.stage_entered_at ? new Date(item.stage_entered_at) : new Date(item.created_at || now));

  // 3. Due At (tanggal jatuh tempo resmi)
  const activeAssignment = assignments.find(a => ['ASSIGNED', 'IN_PROGRESS', 'OVERDUE'].includes(a.status)) || latestAssignment;
  let dueAt = activeAssignment?.due_at
    ? new Date(activeAssignment.due_at)
    : (receivedHandover?.tashih_due_at ? new Date(receivedHandover.tashih_due_at) : null);

  if (!dueAt) {
    try {
      dueAt = await calculateDueAt(db, startDate, targetWorkingDays, { applyCutoff: true });
    } catch {
      // Fallback: estimasi hari kerja Senin-Jumat
      let count = targetWorkingDays;
      let cur = new Date(startDate);
      const cutoff = WORK_HOURS_CONFIG.CUTOFF_HOUR_JAKARTA || 16;
      const startHour = new Date(startDate.getTime() + 7 * 3600000).getUTCHours();
      if (startHour >= cutoff) {
        cur = new Date(cur.getTime() + 24 * 3600000);
      }
      while (count > 0) {
        cur = new Date(cur.getTime() + 24 * 3600000);
        const day = cur.getUTCDay();
        if (day !== 0 && day !== 6) count--;
      }
      const dateStr = jakartaDate(cur);
      dueAt = new Date(`${dateStr}T23:59:59.999+07:00`);
    }
  }

  // 4. Elapsed working days (hari kerja berjalan)
  const allAssignmentsCompleted = assignments.length > 0 && assignments.every(a => a.status === 'COMPLETED');
  let endDate = now;
  if (allAssignmentsCompleted) {
    const reviews = assignments.flatMap(a => a.reviews || []);
    const sortedReviews = reviews
      .filter(r => r.completed_at)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    if (sortedReviews[0]?.completed_at) {
      endDate = new Date(sortedReviews[0].completed_at);
    }
  }

  let elapsedWorkingDays = 0;
  try {
    elapsedWorkingDays = await countWorkingDays(db, startDate, endDate, { applyCutoff: true });
  } catch {
    let cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) elapsedWorkingDays++;
      cur = new Date(cur.getTime() + 24 * 3600000);
    }
  }
  elapsedWorkingDays = Math.max(0, elapsedWorkingDays);

  // 5. SLA Status & Label
  let slaStatus = 'ON_TIME';
  let statusLabel = 'Tepat Waktu';

  if (item.status === 'REVISION_REQUIRED') {
    slaStatus = 'PAUSED';
    statusLabel = 'Jeda SLA';
  } else if (dueAt && now.getTime() > dueAt.getTime()) {
    slaStatus = 'OVERDUE';
    statusLabel = 'Terlambat';
  } else if (dueAt) {
    const remainingMs = dueAt.getTime() - now.getTime();
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    if (remainingHours <= 24) {
      slaStatus = 'WARNING';
      statusLabel = 'Mendekati Tenggat';
    } else {
      slaStatus = 'ON_TIME';
      statusLabel = 'Tepat Waktu';
    }
  }

  return {
    elapsed_working_days: elapsedWorkingDays,
    target_working_days: targetWorkingDays,
    due_at: dueAt ? dueAt.toISOString() : null,
    sla_status: slaStatus,
    status_label: statusLabel,
  };
}
