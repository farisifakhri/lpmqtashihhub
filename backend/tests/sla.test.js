import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDueAt, jakartaDate } from '../src/services/sla.service.js';

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
