import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePentashihDueAt } from '../../src/services/distribution.service.js';

function createMockCalendar(startDay = '2026-11-16', count = 60) {
  const days = [];
  let current = new Date(`${startDay}T00:00:00Z`);
  for (let i = 0; i < count; i++) {
    const dayOfWeek = current.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    days.push({
      date: new Date(current),
      is_working_day: !isWeekend,
    });
    current = new Date(current.getTime() + 86400000);
  }
  return days;
}

function createMockTx(calendarDays = createMockCalendar()) {
  return {
    workingDay: {
      findMany: async ({ where }) => {
        const start = where.date.gte || where.date.gt;
        return calendarDays.filter(d => (where.date.gte ? d.date >= start : d.date > start));
      },
      findUnique: async ({ where }) => {
        const target = where.date.getTime();
        return calendarDays.find(d => d.date.getTime() === target) || null;
      },
    },
    physicalManuscriptHandover: {
      findFirst: async () => null,
    },
    officialDocument: {
      findFirst: async () => null,
    },
  };
}

test('B23-T1: Dasar tanggal ronde REVISION memakai waktu serah-terima/stage_entered_at, bukan tanggal bayar', async () => {
  const mockCalendar = createMockCalendar('2026-11-01', 60);
  const tx = createMockTx(mockCalendar);

  const revisionHandoverDate = new Date('2026-11-02T08:00:00.000Z');
  tx.physicalManuscriptHandover.findFirst = async () => ({
    received_at: revisionHandoverDate,
  });

  const reg = {
    id: 'reg-rev-1',
    status: 'WAITING_DISTRIBUTION',
    stage_entered_at: new Date('2026-11-01T08:00:00.000Z'),
    fee_sla_snapshot: {
      sla_revision_days: 10,
    },
  };

  const user = { id: 'dist-1', roles: ['DISTRIBUTOR'] };
  const result = await resolvePentashihDueAt(tx, reg, 'REVISION', null, user);

  // Tanggal start harus 2 November 2026 (November), bukan tanggal pembayaran lama
  assert.equal(result.due_meta.start.toISOString(), revisionHandoverDate.toISOString());
  assert.equal(result.due_meta.sla_days, 10);
  assert.ok(result.due_at instanceof Date);
  assert.ok(result.due_at.getTime() > revisionHandoverDate.getTime());
});

test('B23-T2: Distributor menetapkan due_at <= max_due', async () => {
  const mockCalendar = createMockCalendar('2026-11-16', 60);
  const tx = createMockTx(mockCalendar);

  const reg = {
    id: 'reg-1',
    status: 'WAITING_DISTRIBUTION',
    stage_entered_at: new Date('2026-11-16T08:00:00.000Z'),
    fee_sla_snapshot: {
      sla_initial_days: 22,
    },
  };

  const user = { id: 'dist-1', roles: ['DISTRIBUTOR'] };
  // 2026-11-20 adalah hari Jumat (hari kerja resmi) dan jauh sebelum max_due
  const result = await resolvePentashihDueAt(tx, reg, 'INITIAL', '2026-11-20', user);

  assert.equal(result.due_meta.sla_days, 22);
  assert.equal(result.due_meta.stage, 'INITIAL');
  assert.ok(result.due_at.toISOString().startsWith('2026-11-20'));
});

test('B23-T3: Distributor menetapkan due_at > max_due tanpa override ditolak 422', async () => {
  const mockCalendar = createMockCalendar('2026-11-16', 60);
  const tx = createMockTx(mockCalendar);

  const reg = {
    id: 'reg-1',
    status: 'WAITING_DISTRIBUTION',
    stage_entered_at: new Date('2026-11-16T08:00:00.000Z'),
    fee_sla_snapshot: {
      sla_initial_days: 5, // 5 hari kerja -> jatuh sekitar 23 Nov
    },
  };

  const user = { id: 'dist-1', roles: ['DISTRIBUTOR'] };

  await assert.rejects(
    async () => {
      // 2026-12-10 jauh melebihi 5 hari kerja
      await resolvePentashihDueAt(tx, reg, 'INITIAL', '2026-12-10', user);
    },
    err => {
      assert.equal(err.statusCode, 422);
      assert.match(err.message, /melebihi batas maksimal SLA/i);
      return true;
    }
  );
});

test('B23-T4: Superadmin menetapkan due_at > max_due dengan due_override_reason >= 10 karakter', async () => {
  const mockCalendar = createMockCalendar('2026-11-16', 60);
  const tx = createMockTx(mockCalendar);

  const reg = {
    id: 'reg-1',
    status: 'WAITING_DISTRIBUTION',
    stage_entered_at: new Date('2026-11-16T08:00:00.000Z'),
    fee_sla_snapshot: {
      sla_initial_days: 5,
    },
  };

  const superAdmin = { id: 'sa-1', roles: ['SUPERADMIN'] };

  // 1. Alasan kurang dari 10 karakter ditolak 422
  await assert.rejects(
    async () => {
      await resolvePentashihDueAt(tx, reg, 'INITIAL', '2026-12-10', superAdmin, 'Pendek');
    },
    err => {
      assert.equal(err.statusCode, 422);
      assert.match(err.message, /alasan perpanjangan/i);
      return true;
    }
  );

  // 2. Alasan valid (>= 10 karakter) diterima
  const validReason = 'Naskah mushaf kuno memerlukan telaah rasm utsmani ekstra hati-hati';
  const result = await resolvePentashihDueAt(tx, reg, 'INITIAL', '2026-12-10', superAdmin, validReason);

  assert.equal(result.due_meta.override_reason, validReason);
  assert.equal(result.due_meta.overridden_by, 'sa-1');
  assert.ok(result.due_at.toISOString().startsWith('2026-12-10'));
});

test('B23-T5: Pilihan due_at jatuh pada hari libur / akhir pekan ditolak 422', async () => {
  const mockCalendar = createMockCalendar('2026-11-16', 60);
  const tx = createMockTx(mockCalendar);

  const reg = {
    id: 'reg-1',
    status: 'WAITING_DISTRIBUTION',
    stage_entered_at: new Date('2026-11-16T08:00:00.000Z'),
    fee_sla_snapshot: {
      sla_initial_days: 22,
    },
  };

  const user = { id: 'dist-1', roles: ['DISTRIBUTOR'] };
  // 2026-11-21 adalah hari Sabtu
  await assert.rejects(
    async () => {
      await resolvePentashihDueAt(tx, reg, 'INITIAL', '2026-11-21', user);
    },
    err => {
      assert.equal(err.statusCode, 422);
      assert.match(err.message, /hari libur atau akhir pekan/i);
      return true;
    }
  );
});

test('B23-T6: Snapshot pengajuan tanpa kunci durasi tahap ditolak 409 (tanpa fallback 15)', async () => {
  const mockCalendar = createMockCalendar('2026-11-16', 60);
  const tx = createMockTx(mockCalendar);

  const reg = {
    id: 'reg-no-sla',
    status: 'WAITING_DISTRIBUTION',
    fee_sla_snapshot: null, // snapshot kosong
  };

  const user = { id: 'dist-1', roles: ['DISTRIBUTOR'] };

  await assert.rejects(
    async () => {
      await resolvePentashihDueAt(tx, reg, 'INITIAL', null, user);
    },
    err => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /SLA tahap INITIAL belum tercatat pada snapshot/i);
      return true;
    }
  );
});

test('B23-T7: Penugasan pentashih saat TASHIH_IN_PROGRESS mewarisi due_at dan due_meta ronde berjalan', async () => {
  const tx = createMockTx();
  const reg = {
    id: 'reg-in-progress',
    status: 'TASHIH_IN_PROGRESS',
  };

  const existingDueAt = new Date('2026-12-15T16:59:59.999Z');
  const existingMeta = {
    start: '2026-11-16T08:00:00.000Z',
    sla_days: 22,
    max_due: existingDueAt,
    chosen_due: existingDueAt,
    stage: 'INITIAL',
  };

  const currentActiveAssignment = {
    id: 'assign-existing',
    due_at: existingDueAt,
    due_meta: existingMeta,
  };

  const user = { id: 'dist-1', roles: ['DISTRIBUTOR'] };
  const result = await resolvePentashihDueAt(tx, reg, 'INITIAL', null, user, null, currentActiveAssignment);

  assert.equal(result.due_at, existingDueAt);
  assert.equal(result.due_meta, existingMeta);
});

test('B23-T8: Distributor tidak memilih tanggal (due_at kosong) menggunakan default max_due', async () => {
  const mockCalendar = createMockCalendar('2026-11-16', 60);
  const tx = createMockTx(mockCalendar);

  const reg = {
    id: 'reg-default',
    status: 'WAITING_DISTRIBUTION',
    stage_entered_at: new Date('2026-11-16T08:00:00.000Z'),
    fee_sla_snapshot: {
      sla_initial_days: 10,
    },
  };

  const user = { id: 'dist-1', roles: ['DISTRIBUTOR'] };
  const result = await resolvePentashihDueAt(tx, reg, 'INITIAL', null, user);

  assert.ok(result.due_at instanceof Date);
  assert.equal(result.due_meta.sla_days, 10);
  assert.equal(result.due_at.getTime(), result.due_meta.max_due.getTime());
});
