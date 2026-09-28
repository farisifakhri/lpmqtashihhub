import { prisma } from '../config/database.js';
import { audit, requireRole } from './workflow-utils.js';

export const OFFICIAL_2026_HOLIDAYS = [
  { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', is_cuti_bersama: false },
  { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad S.A.W.', is_cuti_bersama: false },
  { date: '2026-02-16', name: 'Tahun Baru Imlek 2577 Kongzili', is_cuti_bersama: true },
  { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', is_cuti_bersama: false },
  { date: '2026-03-18', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', is_cuti_bersama: true },
  { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', is_cuti_bersama: false },
  { date: '2026-03-20', name: 'Idul Fitri 1447 Hijriah', is_cuti_bersama: true },
  { date: '2026-03-21', name: 'Idul Fitri 1447 Hijriah', is_cuti_bersama: false },
  { date: '2026-03-22', name: 'Idul Fitri 1447 Hijriah', is_cuti_bersama: false },
  { date: '2026-03-23', name: 'Idul Fitri 1447 Hijriah', is_cuti_bersama: true },
  { date: '2026-03-24', name: 'Idul Fitri 1447 Hijriah', is_cuti_bersama: true },
  { date: '2026-04-03', name: 'Wafat Yesus Kristus', is_cuti_bersama: false },
  { date: '2026-04-05', name: 'Kebangkitan Yesus Kristus (Paskah)', is_cuti_bersama: false },
  { date: '2026-05-01', name: 'Hari Buruh Internasional', is_cuti_bersama: false },
  { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', is_cuti_bersama: false },
  { date: '2026-05-15', name: 'Kenaikan Yesus Kristus', is_cuti_bersama: true },
  { date: '2026-05-27', name: 'Idul Adha 1447 Hijriah', is_cuti_bersama: false },
  { date: '2026-05-28', name: 'Idul Adha 1447 Hijriah', is_cuti_bersama: true },
  { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', is_cuti_bersama: false },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', is_cuti_bersama: false },
  { date: '2026-06-16', name: '1 Muharam Tahun Baru Islam 1448 Hijriah', is_cuti_bersama: false },
  { date: '2026-08-17', name: 'Proklamasi Kemerdekaan', is_cuti_bersama: false },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad S.A.W.', is_cuti_bersama: false },
  { date: '2026-12-24', name: 'Kelahiran Yesus Kristus', is_cuti_bersama: true },
  { date: '2026-12-25', name: 'Kelahiran Yesus Kristus', is_cuti_bersama: false },
];

export const updateCalendar = (days, user) => prisma.$transaction(async tx => {
  requireRole(user, ['SUPERADMIN']);
  for (const day of days) {
    const data = { ...day, date: new Date(`${day.date}T00:00:00Z`), updated_by: user.id };
    await tx.workingDay.upsert({ where: { date: data.date }, create: data, update: data });
  }
  await audit(tx, user, 'UPDATE_WORKING_CALENDAR', 'WorkingDay', null, { days });
  return { count: days.length };
});

export const syncNationalHolidays = async (user, year = 2026) => {
  requireRole(user, ['SUPERADMIN', 'HELPER_ADMIN']);
  let holidays = [];
  let sourceOrigin = 'SKB_3_MENTERI_FALLBACK';

  try {
    const url = `https://api.kemendesa.link/libur-nasional/api/holidays/${year}.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        holidays = json.data;
        sourceOrigin = json.metadata?.source?.name || 'SKB_3_MENTERI_API';
      }
    }
  } catch {
    // Gunakan fallback resmi jika offline atau API tidak terjangkau
  }

  if (holidays.length === 0 && year === 2026) {
    holidays = OFFICIAL_2026_HOLIDAYS;
    sourceOrigin = 'SKB_3_MENTERI_2026';
  }

  return prisma.$transaction(async tx => {
    let syncedCount = 0;
    for (const h of holidays) {
      if (!h.date) continue;
      const date = new Date(`${h.date}T00:00:00Z`);
      const description = h.is_cuti_bersama
        ? `Cuti Bersama: ${h.name}`
        : `Libur Nasional: ${h.name}`;

      await tx.workingDay.upsert({
        where: { date },
        create: {
          date,
          is_working_day: false,
          description,
          source: 'SKB_3_MENTERI',
          updated_by: user.id,
        },
        update: {
          is_working_day: false,
          description,
          source: 'SKB_3_MENTERI',
          updated_by: user.id,
        },
      });
      syncedCount++;
    }

    await audit(tx, user, 'SYNC_NATIONAL_HOLIDAYS', 'WorkingDay', null, {
      year,
      count: syncedCount,
      sourceOrigin,
    });

    return {
      success: true,
      count: syncedCount,
      source: sourceOrigin,
      year,
      message: `Berhasil menyinkronkan ${syncedCount} hari libur nasional dan cuti bersama (${sourceOrigin}).`,
    };
  });
};
