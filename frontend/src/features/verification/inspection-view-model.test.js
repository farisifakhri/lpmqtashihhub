import { describe, it, expect } from 'vitest';
import { getInspectionViewModel, approvalStageText } from './inspection-view-model';

const detail = (signers, complete) => ({
  paraf: { gate_active: true, signers, required: 2, complete },
  assignment: { verifier: { id: 'v1' } },
  registration: { status: 'WAITING_VERIFICATION_APPROVAL' },
  latest_result_document: { status: 'SUBMITTED', content_snapshot: { decision: 'REVISION_REQUIRED' }, signatories: [{ status: 'SIGNED', signer_user_id: 'v1' }] },
});
const pemaraf = { id: 'p1', roles: ['KEPALA_LPMQ'], isPemaraf: true };
const kepala = { id: 'k1', roles: ['KEPALA_LPMQ'] };
const vm = (d, u) => getInspectionViewModel(d, u, null, []);

describe('gerbang paraf surat hasil', () => {
  it('Pemaraf bisa memaraf sekali, lalu tombolnya hilang', () => {
    const before = vm(detail([], false), pemaraf);
    expect(before.canPemarafSign).toBe(true);
    expect(before.canHeadApprove).toBe(false);
    const after = vm(detail([{ id: 'p1', name: 'P1' }], false), pemaraf);
    expect(after.canPemarafSign).toBe(false);
    expect(after.parafStatus.signedByMe).toBe(true);
  });

  it('Kepala baru bisa mengesahkan setelah paraf lengkap', () => {
    expect(vm(detail([{ id: 'p1' }], false), kepala).canHeadApprove).toBe(false);
    expect(vm(detail([{ id: 'p1' }, { id: 'p2' }], true), kepala).canHeadApprove).toBe(true);
  });
});

describe('penunjukan Pemaraf', () => {
  it('Pemaraf yang tidak ditunjuk tidak mendapat tombol paraf', () => {
    const d = detail([], false);
    d.paraf.assigned = ['p2', 'p3'];
    const result = vm(d, pemaraf);
    expect(result.canPemarafSign).toBe(false);
    expect(result.parafStatus.assignedToMe).toBe(false);
  });
});

describe('approvalStageText (kartu antrean)', () => {
  const paraf = (signers, complete = false) => ({ signers, assigned: ['p1', 'p2'], required: 2, complete });
  it('Pemaraf yang sudah memaraf melihat "Menunggu Pemaraf Lain"', () => {
    expect(approvalStageText(paraf([{ id: 'p1' }]), { id: 'p1', isPemaraf: true }).title).toBe('Menunggu Pemaraf Lain (1/2)');
  });
  it('Pemaraf yang belum memaraf melihat "Menunggu Paraf Anda"', () => {
    expect(approvalStageText(paraf([{ id: 'p1' }]), { id: 'p2', isPemaraf: true }).title).toBe('Menunggu Paraf Anda (1/2)');
  });
  it('paraf lengkap: semua peran melihat "Menunggu Pengesahan Kepala LPMQ"', () => {
    const done = paraf([{ id: 'p1' }, { id: 'p2' }], true);
    expect(approvalStageText(done, { id: 'p1', isPemaraf: true }).title).toBe('Menunggu Pengesahan Kepala LPMQ');
    expect(approvalStageText(done, { id: 'v1' }).title).toBe('Menunggu Pengesahan Kepala LPMQ');
  });
  it('tanpa data paraf: teks lama tetap', () => {
    expect(approvalStageText(null, { id: 'v1' }).title).toBe('Draft Sedang Diperiksa Kepala LPMQ');
  });
});
