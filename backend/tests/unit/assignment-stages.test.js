import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentStageOptions } from '../../src/services/distribution.service.js';

const allowed = (input) => assignmentStageOptions(input).filter(o => o.allowed).map(o => o.key);
const base = { isTashihRevision: false, revisionKind: 'CORRECTION', hasAssignmentsForRound: false, previousStage: null, registrationType: 'NEW', hasDispatchProof: false };

test('Sidang pertama: hanya Penugasan Awal yang terbuka', () => {
  assert.deepEqual(allowed(base), ['INITIAL']);
  const revision = assignmentStageOptions(base).find(o => o.key === 'REVISION');
  assert.match(revision.reason, /Belum ada keputusan perbaikan/);
});

test('Perpanjangan tanpa sidang sebelumnya langsung ke Dumi', () => {
  assert.deepEqual(allowed({ ...base, registrationType: 'EXTENSION' }), ['DUMMY']);
});

test('Ronde perbaikan: Perbaikan terkunci sampai naskah perbaikan terkirim, Awal & Dumi selalu terkunci', () => {
  const round = { ...base, isTashihRevision: true, previousStage: 'INITIAL' };
  assert.deepEqual(allowed(round), []);
  assert.match(assignmentStageOptions(round).find(o => o.key === 'REVISION').reason, /Menunggu penerbit mengirim naskah perbaikan/);
  assert.deepEqual(allowed({ ...round, hasDispatchProof: true }), ['REVISION']);
});

test('Ronde dumi: Dumi terkunci sampai naskah dumi terkirim', () => {
  const round = { ...base, isTashihRevision: true, revisionKind: 'DUMMY', previousStage: 'REVISION' };
  assert.deepEqual(allowed(round), []);
  assert.match(assignmentStageOptions(round).find(o => o.key === 'DUMMY').reason, /naskah dumi/);
  assert.deepEqual(allowed({ ...round, hasDispatchProof: true }), ['DUMMY']);
});

test('Ronde yang sudah berjalan tetap memakai tahap penugasan terakhir', () => {
  assert.deepEqual(allowed({ ...base, isTashihRevision: true, hasAssignmentsForRound: true, previousStage: 'REVISION' }), ['REVISION']);
});
