import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { recordJuzChecklist } from '../../src/services/distribution.service.js';
import { assignmentSchema, juzChecklistSchema } from '../../src/validators/workflow.validator.js';

test('penugasan per juz menolak nomor juz ganda dan catatan koreksi kosong', () => {
  const valid = { team_id: 'team-1', stage: 'INITIAL', juz_assignments: [{ assignee_id: '00000000-0000-4000-8000-000000000001', juz_numbers: [1, 2] }] };
  assert.equal(assignmentSchema.body.safeParse(valid).success, true);
  assert.equal(assignmentSchema.body.safeParse({ ...valid, juz_assignments: [...valid.juz_assignments, { assignee_id: '00000000-0000-4000-8000-000000000002', juz_numbers: [2] }] }).success, false);
  assert.equal(juzChecklistSchema.body.safeParse({ result: 'REVISION_REQUIRED', notes: '' }).success, false);
  assert.equal(juzChecklistSchema.body.safeParse({ result: 'PASSED', notes: '' }).success, true);
});

test('checklist per juz telah dialihkan dan endpoint mengembalikan 410 Gone', async () => {
  const originalTx = prisma.$transaction;
  try {
    prisma.$transaction = async (fn) => fn({});
    const user = { id: 'usr-pentashih', roles: ['PENTASHIH'] };
    await assert.rejects(
      recordJuzChecklist('assignment', 2, { result: 'PASSED', notes: '' }, user),
      (error) => error.statusCode === 410 && /dialihkan/i.test(error.message)
    );
  } finally {
    prisma.$transaction = originalTx;
  }
});
