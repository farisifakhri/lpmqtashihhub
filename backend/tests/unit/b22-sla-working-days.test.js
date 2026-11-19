import test from 'node:test';
import assert from 'node:assert/strict';
import { determineVerificationSlaOutcome, countWorkingDays } from '../../src/services/sla.service.js';

test('B22-T9: SLA 3 Hasil (EARLY, ON_TIME, LATE) klasifikasi waktu Jakarta', () => {
  // Batas: 20 November 2026 23:59:59.999+07:00
  const dueAt = new Date('2026-11-20T16:59:59.999Z'); // 23:59:59.999 WIB

  // 1. EARLY: selesai tanggal 19 November 2026 (sebelum hari jatuh tempo)
  const sentEarly = new Date('2026-11-19T07:00:00Z'); // 14:00 WIB
  assert.equal(determineVerificationSlaOutcome(dueAt, sentEarly), 'EARLY');

  // 2. ON_TIME: selesai tanggal 20 November 2026 pukul 14:00 WIB (sebelum 23:59)
  const sentOnTime = new Date('2026-11-20T07:00:00Z'); // 14:00 WIB
  assert.equal(determineVerificationSlaOutcome(dueAt, sentOnTime), 'ON_TIME');

  // 3. ON_TIME: tepat pada batas 23:59:59.999 WIB
  assert.equal(determineVerificationSlaOutcome(dueAt, dueAt), 'ON_TIME');

  // 4. LATE: selesai tanggal 21 November 2026 (lewat hari batas)
  const sentLate = new Date('2026-11-21T02:00:00Z'); // 09:00 WIB
  assert.equal(determineVerificationSlaOutcome(dueAt, sentLate), 'LATE');

  // 5. Data kosong atau belum ditentukan -> null (bukan default ON_TIME)
  assert.equal(determineVerificationSlaOutcome(null, sentOnTime), null);
  assert.equal(determineVerificationSlaOutcome(dueAt, null), null);
  assert.equal(determineVerificationSlaOutcome(null, null), null);
});

test('B22-T10: countWorkingDays menghitung hari kerja dengan mock db', async () => {
  const mockWorkingDays = [
    { date: new Date('2026-11-16T00:00:00Z'), is_working_day: true }, // Senin
    { date: new Date('2026-11-17T00:00:00Z'), is_working_day: true }, // Selasa
    { date: new Date('2026-11-18T00:00:00Z'), is_working_day: true }, // Rabu
    { date: new Date('2026-11-19T00:00:00Z'), is_working_day: false }, // Libur Nasional
    { date: new Date('2026-11-20T00:00:00Z'), is_working_day: true }, // Jumat
    { date: new Date('2026-11-21T00:00:00Z'), is_working_day: false }, // Sabtu
    { date: new Date('2026-11-22T00:00:00Z'), is_working_day: false }, // Minggu
  ];

  const mockDb = {
    workingDay: {
      count: async ({ where }) => {
        const { gte, lte } = where.date;
        return mockWorkingDays.filter(
          d => d.date >= gte && d.date <= lte && (where.is_working_day === undefined || d.is_working_day === where.is_working_day)
        ).length;
      },
    },
  };

  // Senin (16 Nov) s/d Jumat (20 Nov) dengan 1 hari libur di hari Kamis -> 4 hari kerja
  const from = new Date('2026-11-16T02:00:00Z'); // 09:00 WIB
  const to = new Date('2026-11-20T08:00:00Z'); // 15:00 WIB

  const daysUsed = await countWorkingDays(mockDb, from, to);
  assert.equal(daysUsed, 4);

  // Jika to < from -> 0
  const invalidRange = await countWorkingDays(mockDb, to, from);
  assert.equal(invalidRange, 0);

  // Jika kalender database kosong (0 baris), fallback ke hari kerja standar (Senin-Jumat)
  const emptyDb = {
    workingDay: {
      count: async () => 0,
    },
  };
  // Senin 16 Nov s/d Jumat 20 Nov -> 5 hari kerja standar
  const fallbackDays = await countWorkingDays(emptyDb, from, to);
  assert.equal(fallbackDays, 5);
});
