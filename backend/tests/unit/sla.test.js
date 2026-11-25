import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDueAt, jakartaDate, computeRegistrationSla } from '../../src/services/sla.service.js';

test('SLA calculateDueAt: Monday 17:00 WIB with 2 business days lands on Wednesday (cutoff applied)', async () => {
  // Calendar covering Monday 2026-09-14 to Thursday 2026-09-17
  const calendarDays = [
    { date: new Date('2026-09-14T00:00:00Z'), is_working_day: true }, // Senin
    { date: new Date('2026-09-15T00:00:00Z'), is_working_day: true }, // Selasa
    { date: new Date('2026-09-16T00:00:00Z'), is_working_day: true }, // Rabu
    { date: new Date('2026-09-17T00:00:00Z'), is_working_day: true }, // Kamis
  ];

  const db = {
    workingDay: {
      findMany: async ({ where }) => {
        const gteDate = where.date?.gte;
        return calendarDays.filter(d => d.date >= gteDate);
      },
    },
  };

  // 17:00 WIB = 10:00 UTC
  const mondayPastCutoff = new Date('2026-09-14T10:00:00Z');
  const due = await calculateDueAt(db, mondayPastCutoff, 2, { applyCutoff: true });

  // Harus jatuh pada Rabu 2026-09-16 pukul 23:59:59.999 WIB (+07:00) = 16:59:59.999 UTC
  assert.equal(due.toISOString(), '2026-09-16T16:59:59.999Z');
  assert.equal(jakartaDate(due), '2026-09-16');
});

test('SLA calculateDueAt: Monday 10:00 WIB with 2 business days lands on Tuesday (cutoff applied)', async () => {
  const calendarDays = [
    { date: new Date('2026-09-14T00:00:00Z'), is_working_day: true }, // Senin
    { date: new Date('2026-09-15T00:00:00Z'), is_working_day: true }, // Selasa
    { date: new Date('2026-09-16T00:00:00Z'), is_working_day: true }, // Rabu
  ];

  const db = {
    workingDay: {
      findMany: async ({ where }) => {
        const gteDate = where.date?.gte;
        return calendarDays.filter(d => d.date >= gteDate);
      },
    },
  };

  // 10:00 WIB = 03:00 UTC
  const mondayMorning = new Date('2026-09-14T03:00:00Z');
  const due = await calculateDueAt(db, mondayMorning, 2, { applyCutoff: true });

  // Harus jatuh pada Selasa 2026-09-15 pukul 23:59:59.999 WIB (+07:00) = 16:59:59.999 UTC
  assert.equal(due.toISOString(), '2026-09-15T16:59:59.999Z');
  assert.equal(jakartaDate(due), '2026-09-15');
});

test('SLA calculateDueAt: Friday 17:00 WIB with 2 business days skips weekend and lands on Tuesday', async () => {
  const calendarDays = [
    { date: new Date('2026-09-18T00:00:00Z'), is_working_day: true },  // Jumat
    { date: new Date('2026-09-19T00:00:00Z'), is_working_day: false }, // Sabtu
    { date: new Date('2026-09-20T00:00:00Z'), is_working_day: false }, // Minggu
    { date: new Date('2026-09-21T00:00:00Z'), is_working_day: true },  // Senin (Hari ke-1)
    { date: new Date('2026-09-22T00:00:00Z'), is_working_day: true },  // Selasa (Hari ke-2)
  ];

  const db = {
    workingDay: {
      findMany: async ({ where }) => {
        const gteDate = where.date?.gte;
        return calendarDays.filter(d => d.date >= gteDate);
      },
    },
  };

  // Jumat 17:00 WIB
  const fridayEvening = new Date('2026-09-18T10:00:00Z');
  const due = await calculateDueAt(db, fridayEvening, 2, { applyCutoff: true });

  assert.equal(due.toISOString(), '2026-09-22T16:59:59.999Z');
  assert.equal(jakartaDate(due), '2026-09-22');
});

test('SLA calculateDueAt: Monday 17:00 WIB with Tuesday Holiday lands on Thursday', async () => {
  const calendarDays = [
    { date: new Date('2026-09-14T00:00:00Z'), is_working_day: true },  // Senin
    { date: new Date('2026-09-15T00:00:00Z'), is_working_day: false }, // Selasa (Libur Nasional)
    { date: new Date('2026-09-16T00:00:00Z'), is_working_day: true },  // Rabu (Hari ke-1)
    { date: new Date('2026-09-17T00:00:00Z'), is_working_day: true },  // Kamis (Hari ke-2)
  ];

  const db = {
    workingDay: {
      findMany: async ({ where }) => {
        const gteDate = where.date?.gte;
        return calendarDays.filter(d => d.date >= gteDate);
      },
    },
  };

  const mondayPastCutoff = new Date('2026-09-14T10:00:00Z');
  const due = await calculateDueAt(db, mondayPastCutoff, 2, { applyCutoff: true });

  assert.equal(due.toISOString(), '2026-09-17T16:59:59.999Z');
  assert.equal(jakartaDate(due), '2026-09-17');
});

test('computeRegistrationSla: calculates target, elapsed, due_at, and ON_TIME status', async () => {
  const calendarDays = [
    { date: new Date('2026-09-14T00:00:00Z'), is_working_day: true }, // Senin
    { date: new Date('2026-09-15T00:00:00Z'), is_working_day: true }, // Selasa
    { date: new Date('2026-09-16T00:00:00Z'), is_working_day: true }, // Rabu
    { date: new Date('2026-09-17T00:00:00Z'), is_working_day: true }, // Kamis
    { date: new Date('2026-09-18T00:00:00Z'), is_working_day: true }, // Jumat
  ];

  const db = {
    workingDay: {
      findMany: async ({ where }) => {
        const gteDate = where.date?.gte;
        return calendarDays.filter(d => d.date >= gteDate);
      },
      count: async () => calendarDays.length,
    },
  };

  const reg = {
    id: 'reg-sla-1',
    status: 'TASHIH_IN_PROGRESS',
    stage_entered_at: new Date('2026-09-14T02:00:00Z'), // Senin 09:00 WIB
    fee_sla_snapshot: {
      sla_initial_days: 5,
    },
    physical_handovers: [
      { status: 'RECEIVED', received_at: new Date('2026-09-14T02:00:00Z') },
    ],
    assignments: [
      { stage: 'INITIAL', status: 'IN_PROGRESS', due_at: new Date('2026-09-18T16:59:59.999Z') },
    ],
  };

  const now = new Date('2026-09-15T05:00:00Z'); // Selasa 12:00 WIB (hari ke-2)
  const result = await computeRegistrationSla(db, reg, now);

  assert.equal(result.target_working_days, 5);
  assert.equal(result.sla_status, 'ON_TIME');
  assert.equal(result.status_label, 'Tepat Waktu');
  assert.equal(result.due_at, '2026-09-18T16:59:59.999Z');
});

test('computeRegistrationSla: status OVERDUE when now is past due_at', async () => {
  const db = {
    workingDay: {
      findMany: async () => [],
      count: async () => 0,
    },
  };

  const reg = {
    id: 'reg-sla-overdue',
    status: 'TASHIH_IN_PROGRESS',
    assignments: [
      { stage: 'INITIAL', status: 'OVERDUE', due_at: new Date('2026-09-10T16:59:59.999Z') },
    ],
  };

  const now = new Date('2026-09-15T05:00:00Z');
  const result = await computeRegistrationSla(db, reg, now);

  assert.equal(result.sla_status, 'OVERDUE');
  assert.equal(result.status_label, 'Terlambat');
});

test('computeRegistrationSla: status PAUSED when registration is REVISION_REQUIRED (B-08)', async () => {
  const db = {
    workingDay: {
      findMany: async () => [],
      count: async () => 0,
    },
  };

  const reg = {
    id: 'reg-sla-paused',
    status: 'REVISION_REQUIRED',
    assignments: [
      { stage: 'INITIAL', status: 'COMPLETED', due_at: new Date('2026-09-20T16:59:59.999Z') },
    ],
  };

  const now = new Date('2026-09-15T05:00:00Z');
  const result = await computeRegistrationSla(db, reg, now);

  assert.equal(result.sla_status, 'PAUSED');
  assert.equal(result.status_label, 'Jeda SLA');
});
