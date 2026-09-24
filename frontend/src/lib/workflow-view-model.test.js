import { describe, it, expect } from 'vitest';
import { getWorkflowViewModel, WORKFLOW_PHASES, STATUS_DEFINITIONS } from './workflow-view-model';

describe('Centralized Workflow View Model', () => {
  it('maps DRAFT status correctly to Publisher owner and action path', () => {
    const reg = {
      id: 'reg-123',
      status: 'DRAFT',
      publisher: { legal_name: 'PT Mushaf Jaya' },
    };
    const user = { role: 'ADMIN_PENERBIT' };

    const vm = getWorkflowViewModel(reg, user);
    expect(vm.phase).toBe('REGISTRATION');
    expect(vm.statusLabel).toBe('Draf Pengajuan');
    expect(vm.ownerRole).toBe('ADMIN_PENERBIT');
    expect(vm.ownerName).toBe('PT Mushaf Jaya');
    expect(vm.nextActionLabel).toBe('Lengkapi berkas & ajukan');
    expect(vm.nextActionPath).toBe('/publisher/registrations/reg-123');
    expect(vm.canUserAct).toBe(true);
  });

  it('maps READY_FOR_VERIFICATION with physical intake missing as a blocker for Head of LPMQ', () => {
    const reg = {
      id: 'reg-456',
      status: 'READY_FOR_VERIFICATION',
      physical_master_intake: { status: 'PENDING' },
    };
    const headUser = { role: 'KEPALA_LPMQ' };

    const vm = getWorkflowViewModel(reg, headUser);
    expect(vm.phase).toBe('VERIFICATION');
    expect(vm.statusLabel).toBe('Menunggu Penugasan Verifikator');
    expect(vm.ownerRole).toBe('KEPALA_LPMQ');
    expect(vm.blockedReason).toContain('Menunggu penyerahan dan intake master fisik');
    expect(vm.canUserAct).toBe(true);
  });

  it('evaluates SLA overdue correctly when stage_due_at is past', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const reg = {
      id: 'reg-789',
      status: 'IN_VERIFICATION',
      due_at: pastDate,
      assigned_verificator: { name: 'Drs. H. Sholihin' },
    };
    const user = { role: 'VERIFIKATOR' };

    const vm = getWorkflowViewModel(reg, user);
    expect(vm.isOverdue).toBe(true);
    expect(vm.ownerName).toBe('Drs. H. Sholihin');
    expect(vm.canUserAct).toBe(true);
  });

  it('forbids action for unauthorized roles', () => {
    const reg = {
      id: 'reg-101',
      status: 'AWAITING_PAYMENT',
    };
    const verifikatorUser = { role: 'VERIFIKATOR' };

    const vm = getWorkflowViewModel(reg, verifikatorUser);
    expect(vm.ownerRole).toBe('ADMIN_PENERBIT');
    expect(vm.canUserAct).toBe(false);
  });

  it('maps WAITING_PHYSICAL_MASTER and READY_FOR_ASSIGNMENT operational states accurately', () => {
    // 1. Intake pending -> WAITING_PHYSICAL_MASTER
    const pendingReg = {
      id: 'reg-pending',
      status: 'READY_FOR_VERIFICATION',
      physical_master_intake: { status: 'PENDING' },
    };
    const adminUser = { role: 'ADMIN' };
    const pendingVm = getWorkflowViewModel(pendingReg, adminUser);
    expect(pendingVm.operationalState).toBe('WAITING_PHYSICAL_MASTER');
    expect(pendingVm.operationalStatusLabel).toBe('Menunggu penerimaan master fisik');
    expect(pendingVm.operationalOwnerRole).toBe('ADMIN');
    expect(pendingVm.operationalNextAction).toBe('Periksa master fisik');
    expect(pendingVm.canUserAct).toBe(true);
    expect(pendingVm.nextActionPath).toBe('/internal/master-intake');

    // 2. Intake received with receipt_no -> READY_FOR_ASSIGNMENT
    const readyReg = {
      id: 'reg-ready',
      status: 'READY_FOR_VERIFICATION',
      physical_master_intake: { status: 'RECEIVED', receipt_no: 'TR-123' },
    };
    const headUser = { role: 'KEPALA_LPMQ' };
    const readyVm = getWorkflowViewModel(readyReg, headUser);
    expect(readyVm.operationalState).toBe('READY_FOR_ASSIGNMENT');
    expect(readyVm.operationalStatusLabel).toBe('Siap ditugaskan');
    expect(readyVm.operationalOwnerRole).toBe('KEPALA_LPMQ');
    expect(readyVm.operationalNextAction).toBe('Pilih Verifikator dan terbitkan Nota Dinas');
    expect(readyVm.canUserAct).toBe(true);
    expect(readyVm.nextActionPath).toBe('/internal/verifications?tab=NEED_ASSIGNMENT&id=reg-ready');

    // 3. Assignment ASSIGNED -> VERIFICATION_ASSIGNED
    const assignedReg = {
      id: 'reg-assigned',
      status: 'VERIFICATION_ASSIGNED',
    };
    const assignedVm = getWorkflowViewModel(assignedReg, { role: 'VERIFIKATOR' });
    expect(assignedVm.operationalState).toBe('VERIFICATION_ASSIGNED');
    expect(assignedVm.operationalStatusLabel).toBe('Verifikator telah ditugaskan');
    expect(assignedVm.operationalNextAction).toBe('Mulai pemeriksaan');
  });

  it('differentiates REVISION_REQUIRED origin between verification and pentashihan', () => {
    // 1. Revision from verification
    const verifRevisionReg = {
      id: 'reg-rev-verif',
      status: 'REVISION_REQUIRED',
      assignments: [],
    };
    const verifVm = getWorkflowViewModel(verifRevisionReg, { role: 'ADMIN_PENERBIT' });
    expect(verifVm.phase).toBe('VERIFICATION');
    expect(verifVm.statusLabel).toBe('Perlu Perbaikan Berkas');

    // 2. Revision from pentashihan (has assignments / distributor review)
    const tashihRevisionReg = {
      id: 'reg-rev-tashih',
      status: 'REVISION_REQUIRED',
      assignments: [{ id: 'a1', status: 'COMPLETED' }],
      status_histories: [
        { from_status: 'TASHIH_IN_PROGRESS', to_status: 'REVISION_REQUIRED', notes: 'Perbaiki lafaz QS 2:255' },
      ],
    };
    const tashihVm = getWorkflowViewModel(tashihRevisionReg, { role: 'ADMIN_PENERBIT' });
    expect(tashihVm.phase).toBe('TASHIH');
    expect(tashihVm.statusLabel).toBe('Perlu Perbaikan Naskah Sidang');
    expect(tashihVm.operationalState).toBe('TASHIH_REVISION_REQUIRED');
    expect(tashihVm.operationalNextAction).toBe('Unggah perbaikan naskah / dumi');
  });
});

