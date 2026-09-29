import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import { recordJuzChecklist } from '../src/services/distribution.service.js';
import { assignmentSchema, juzChecklistSchema } from '../src/validators/workflow.validator.js';

test('penugasan per juz menolak nomor juz ganda dan catatan koreksi kosong', () => {
  const valid = { team_id: 'team-1', stage: 'INITIAL', juz_assignments: [{ assignee_id: '00000000-0000-4000-8000-000000000001', juz_numbers: [1, 2] }] };
  assert.equal(assignmentSchema.body.safeParse(valid).success, true);
  assert.equal(assignmentSchema.body.safeParse({ ...valid, juz_assignments: [...valid.juz_assignments, { assignee_id: '00000000-0000-4000-8000-000000000002', juz_numbers: [2] }] }).success, false);
  assert.equal(juzChecklistSchema.body.safeParse({ result: 'REVISION_REQUIRED', notes: '' }).success, false);
  assert.equal(juzChecklistSchema.body.safeParse({ result: 'PASSED', notes: '' }).success, true);
});

test('checklist per juz hanya milik pentashih yang ditugaskan dan menyelesaikan tugas setelah semua juz dicatat', async () => {
  const original = prisma.$transaction;
  const writes = [];
  const rows = [
    { id: 'j1', juz_number: 1, result: 'PASSED', notes: null },
    { id: 'j2', juz_number: 2, result: null, notes: null },
  ];
  const tx = {
    $queryRaw: async () => [],
    registration: { findUnique: async () => ({ id: 'reg', status: 'TASHIH_IN_PROGRESS' }) },
    assignment: {
      findUnique: async ({ include }) => include ? { id: 'assignment', assignee_id: 'owner', status: 'IN_PROGRESS', juz_items: rows, reviews: [] } : { registration_id: 'reg' },
      update: async ({ data }) => { writes.push(['assignment', data]); return data; },
    },
    assignmentJuz: { update: async ({ data }) => { const result = { ...rows[1], ...data }; writes.push(['juz', result]); return result; } },
    tashihReview: { create: async ({ data }) => { writes.push(['review', data]); return { id: 'review', ...data }; } },
    auditLog: { create: async () => ({}) },
  };
  try {
    prisma.$transaction = async callback => callback(tx);
    await assert.rejects(recordJuzChecklist('assignment', 2, { result: 'PASSED', notes: '' }, { id: 'other', roles: ['PENTASHIH'] }), error => error.statusCode === 403);
    const saved = await recordJuzChecklist('assignment', 2, { result: 'REVISION_REQUIRED', notes: 'Perbaiki harakat' }, { id: 'owner', roles: ['PENTASHIH'] });
    assert.equal(saved.result, 'REVISION_REQUIRED');
    assert.equal(writes.find(([type]) => type === 'review')[1].result, 'REVISION_REQUIRED');
    assert.equal(writes.find(([type]) => type === 'assignment')[1].status, 'COMPLETED');
  } finally {
    prisma.$transaction = original;
  }
});
