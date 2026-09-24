/**
 * Centralized Workflow View Model & Status Engine
 * Acuan: Total Redesign UI/UX Sistem Pentashihan LPMQ v2 (Bab 9)
 *
 * Menghilangkan conditional status yang tersebar di UI.
 * Menghasilkan model status, fase, pemilik tindakan, SLA, dan blocker secara deterministik.
 */

import { WORKFLOW_PHASES } from '@/features/workflow/workflow-phases';
export { WORKFLOW_PHASES };

export const STATUS_DEFINITIONS = {
  DRAFT: {
    phase: 'REGISTRATION',
    statusLabel: 'Draf Pengajuan',
    statusDescription: 'Pengajuan baru, berkas atau data naskah belum lengkap.',
    ownerRole: 'ADMIN_PENERBIT',
    ownerRoleLabel: 'Penerbit',
    nextActionLabel: 'Lengkapi berkas & ajukan',
    actionPath: id => `/publisher/registrations/${id}`,
  },
  READY_FOR_VERIFICATION: {
    phase: 'VERIFICATION',
    statusLabel: 'Menunggu Penugasan Verifikator',
    statusDescription: 'Naskah telah diajukan dan master fisik diterima loket; menunggu Admin Internal menugaskan verifikator.',
    ownerRole: 'KEPALA_LPMQ',
    ownerRoleLabel: 'Kepala LPMQ',
    nextActionLabel: 'Terbitkan Nota Dinas & tugaskan verifikator',
    actionPath: id => `/internal/verifications?tab=NEED_ASSIGNMENT&id=${id}`,
  },
  VERIFICATION_ASSIGNED: {
    phase: 'VERIFICATION',
    statusLabel: 'Verifikator Ditugaskan',
    statusDescription: 'Nota Dinas telah terbit; verifikator yang ditugaskan dapat memulai pemeriksaan berkas & rasm.',
    ownerRole: 'VERIFIKATOR',
    ownerRoleLabel: 'Verifikator',
    nextActionLabel: 'Mulai pemeriksaan naskah',
    actionPath: (id, reg) => `/internal/verifications/${reg?.verification_assignment?.id || reg?.verification_assignments?.[0]?.id || id}`,
  },
  IN_VERIFICATION: {
    phase: 'VERIFICATION',
    statusLabel: 'Sedang Diverifikasi',
    statusDescription: 'Pemeriksaan checklist berkas administrasi dan master mushaf sedang berlangsung.',
    ownerRole: 'VERIFIKATOR',
    ownerRoleLabel: 'Verifikator',
    nextActionLabel: 'Lanjutkan telaah naskah',
    actionPath: (id, reg) => `/internal/verifications/${reg?.verification_assignment?.id || reg?.verification_assignments?.[0]?.id || id}`,
  },
  REVISION_REQUIRED: {
    phase: 'VERIFICATION',
    statusLabel: 'Perlu Perbaikan Berkas',
    statusDescription: 'Catatan telaah verifikator memerlukan perbaikan atau penggantian berkas oleh pemohon.',
    ownerRole: 'ADMIN_PENERBIT',
    ownerRoleLabel: 'Penerbit',
    nextActionLabel: 'Unggah berkas perbaikan',
    actionPath: id => `/publisher/registrations/${id}`,
  },
  WAITING_VERIFICATION_APPROVAL: {
    phase: 'VERIFICATION',
    statusLabel: 'Menunggu Persetujuan Kepala',
    statusDescription: 'Draf hasil telaah telah diajukan verifikator dan sedang menunggu persetujuan Kepala LPMQ.',
    ownerRole: 'KEPALA_LPMQ',
    ownerRoleLabel: 'Kepala LPMQ',
    nextActionLabel: 'Tinjau dan putuskan draf',
    actionPath: id => `/internal/verifications?tab=WAITING_APPROVAL&id=${id}`,
  },
  VERIFICATION_APPROVED: {
    phase: 'VERIFICATION',
    statusLabel: 'Siap Dikirim',
    statusDescription: 'Surat dan Berita Acara telaah telah disetujui; menunggu verifikator mengirimkan surat resmi ke penerbit.',
    ownerRole: 'VERIFIKATOR',
    ownerRoleLabel: 'Verifikator',
    nextActionLabel: 'Kirim surat hasil verifikasi',
    actionPath: id => `/internal/verifications?tab=READY_TO_SEND&id=${id}`,
  },
  AWAITING_PAYMENT: {
    phase: 'PAYMENT',
    statusLabel: 'Menunggu Pembayaran PNBP',
    statusDescription: 'Kode billing SIMPONI aktif. Pembayaran wajib disetor sebelum masa berlaku billing habis.',
    ownerRole: 'ADMIN_PENERBIT',
    ownerRoleLabel: 'Penerbit',
    nextActionLabel: 'Bayar dan konfirmasi setoran',
    actionPath: id => `/publisher/billing?registration_id=${id}`,
  },
  PAYMENT_VERIFICATION: {
    phase: 'PAYMENT',
    statusLabel: 'Verifikasi Pembayaran',
    statusDescription: 'Bukti setor NTPN telah dikirimkan pemohon; verifikator memeriksa keabsahan setoran PNBP.',
    ownerRole: 'VERIFIKATOR',
    ownerRoleLabel: 'Verifikator',
    nextActionLabel: 'Periksa bukti bayar & sahkan',
    actionPath: id => `/internal/payments?id=${id}`,
  },
  WAITING_DISTRIBUTOR_RECEIPT: {
    phase: 'HANDOVER',
    statusLabel: 'Menunggu Konfirmasi Distributor',
    statusDescription: 'Master fisik diserahkan ke tim distribusi; menunggu verifikasi fisik dan penetapan tenggat pentashihan.',
    ownerRole: 'DISTRIBUTOR',
    ownerRoleLabel: 'Distributor',
    nextActionLabel: 'Konfirmasi fisik & tetapkan target',
    actionPath: id => `/internal/distributions?id=${id}`,
  },
  PHYSICAL_HANDOVER_CORRECTION_REQUIRED: {
    phase: 'HANDOVER',
    statusLabel: 'Perlu Koreksi Master Fisik',
    statusDescription: 'Master fisik tidak lengkap atau cacat; pemohon wajib menyerahkan penggantian naskah fisik.',
    ownerRole: 'ADMIN_PENERBIT',
    ownerRoleLabel: 'Penerbit',
    nextActionLabel: 'Serahkan penggantian master ke LPMQ',
    actionPath: id => `/publisher/registrations/${id}`,
  },
  WAITING_DISTRIBUTION: {
    phase: 'TASHIH',
    statusLabel: 'Siap Penugasan Tim Sidang',
    statusDescription: 'Master fisik diterima distributor; siap ditetapkan SK Tim Pentashih.',
    ownerRole: 'DISTRIBUTOR',
    ownerRoleLabel: 'Distributor',
    nextActionLabel: 'Tetapkan anggota tim pentashih',
    actionPath: id => `/internal/distributions?id=${id}`,
  },
  TASHIH_IN_PROGRESS: {
    phase: 'TASHIH',
    statusLabel: 'Sidang Tashih Berjalan',
    statusDescription: 'Tim pentashih sedang menelaah ayat, rasm usmani, harakat, dan tanda waqaf mushaf.',
    ownerRole: 'PENTASHIH',
    ownerRoleLabel: 'Tim Pentashih',
    nextActionLabel: 'Catat hasil telaah & rekomendasi',
    actionPath: id => `/internal/tashih?id=${id}`,
  },
  READY_FOR_STT: {
    phase: 'STT_ISSUANCE',
    statusLabel: 'Siap Penetapan STT',
    statusDescription: 'Naskah dumi bersih telah disetujui tim; siap ditetapkan Surat Tanda Tashih oleh Kepala LPMQ.',
    ownerRole: 'KEPALA_LPMQ',
    ownerRoleLabel: 'Kepala LPMQ',
    nextActionLabel: 'Tetapkan & tandatangani STT',
    actionPath: id => `/internal/documents?id=${id}`,
  },
  STT_ISSUED: {
    phase: 'STT_ISSUANCE',
    statusLabel: 'STT Ditetapkan',
    statusDescription: 'Surat Tanda Tashih telah ditetapkan sah dan berlaku aktif.',
    ownerRole: 'DOKUMENTATOR',
    ownerRoleLabel: 'Dokumentator',
    nextActionLabel: 'Lanjutkan pemberkasan dokumentasi',
    actionPath: id => `/internal/documents?id=${id}`,
  },
  DOCUMENTATION_IN_PROGRESS: {
    phase: 'DOCUMENTATION',
    statusLabel: 'Pemberkasan Dokumentasi',
    statusDescription: 'Penyusunan Berita Acara Tashih & verifikasi tanda terima deposit 5 eksemplar naskah.',
    ownerRole: 'DOKUMENTATOR',
    ownerRoleLabel: 'Dokumentator',
    nextActionLabel: 'Verifikasi tanda terima deposit',
    actionPath: id => `/internal/documents?id=${id}`,
  },
  COMPLETED: {
    phase: 'COMPLETED',
    statusLabel: 'Selesai (Surat Terbit)',
    statusDescription: 'Seluruh tahapan verifikasi, pentashihan, penerbitan STT, dan dokumentasi telah tuntas.',
    ownerRole: 'LPMQ',
    ownerRoleLabel: 'Sistem LPMQ',
    nextActionLabel: 'Arsip selesai',
    actionPath: id => `/publisher/documents?id=${id}`,
  },
  CANCELLED: {
    phase: 'REGISTRATION',
    statusLabel: 'Dibatalkan',
    statusDescription: 'Pengajuan dibatalkan sebelum tahapan pembayaran atau penetapan selesai.',
    ownerRole: 'ADMIN_PENERBIT',
    ownerRoleLabel: 'Penerbit',
    nextActionLabel: 'Pengajuan ditutup',
    actionPath: null,
  },
};

/**
 * Menghasilkan View Model terstandarisasi untuk objek workflow pengajuan.
 */
export function getWorkflowViewModel(registration, currentUser) {
  if (!registration) return null;

  const status = registration.status || 'DRAFT';
  const def = STATUS_DEFINITIONS[status] || STATUS_DEFINITIONS.DRAFT;

  // Evaluasi Blocker & Operational State (P0-04, Bagian 7)
  let operationalState = registration.operational_state || null;
  let operationalStatusLabel = def.statusLabel;
  let operationalOwnerRole = def.ownerRole;
  let operationalOwnerRoleLabel = def.ownerRoleLabel;
  let operationalNextAction = def.nextActionLabel;

  let blockedReason = null;
  if (status === 'READY_FOR_VERIFICATION') {
    const intake = registration.physical_master_intake || registration.physical_master;
    if (!intake || intake.status !== 'RECEIVED' || !intake.receipt_no) {
      operationalState = 'WAITING_PHYSICAL_MASTER';
      operationalStatusLabel = 'Menunggu penerimaan master fisik';
      operationalOwnerRole = 'ADMIN';
      operationalOwnerRoleLabel = 'Admin Loket';
      operationalNextAction = 'Periksa master fisik';
      blockedReason = 'Menunggu penyerahan dan intake master fisik A4 di loket LPMQ.';
    } else {
      operationalState = 'READY_FOR_ASSIGNMENT';
      operationalStatusLabel = 'Siap ditugaskan';
      operationalOwnerRole = 'KEPALA_LPMQ';
      operationalOwnerRoleLabel = 'Kepala LPMQ';
      operationalNextAction = 'Pilih Verifikator dan terbitkan Nota Dinas';
    }
  } else if (status === 'VERIFICATION_ASSIGNED') {
    operationalState = 'VERIFICATION_ASSIGNED';
    operationalStatusLabel = 'Verifikator telah ditugaskan';
    operationalNextAction = 'Mulai pemeriksaan';
  } else if (status === 'IN_VERIFICATION') {
    operationalState = 'IN_VERIFICATION';
    operationalStatusLabel = 'Sedang diperiksa';
    operationalNextAction = 'Lengkapi pemeriksaan';
  } else if (status === 'PAYMENT_VERIFICATION') {
    const isPaymentVerified =
      registration.payment_records?.some((p) => p.status === 'VERIFIED') ||
      registration.payment?.status === 'VERIFIED' ||
      registration.payment_record?.status === 'VERIFIED';

    if (isPaymentVerified) {
      operationalState = 'READY_FOR_PHYSICAL_HANDOVER';
      operationalStatusLabel = 'Pembayaran Lunas - Siap Serah-Terima Fisik';
      operationalOwnerRole = 'VERIFIKATOR';
      operationalOwnerRoleLabel = 'Verifikator';
      operationalNextAction = 'Serahkan master fisik ke Distributor (Langkah 7 SOP)';
    }
  } else if (status === 'REVISION_REQUIRED') {
    const isTashihRevision =
      registration.revision_source === 'TASHIH' ||
      (Array.isArray(registration.assignments) && registration.assignments.length > 0) ||
      registration.status_histories?.some(
        (h) => (h.from_status === 'TASHIH_IN_PROGRESS' || h.from_status === 'WAITING_DISTRIBUTION') && h.to_status === 'REVISION_REQUIRED'
      );

    if (isTashihRevision) {
      operationalState = 'TASHIH_REVISION_REQUIRED';
      operationalStatusLabel = 'Perlu Perbaikan Naskah Sidang';
      operationalOwnerRole = 'ADMIN_PENERBIT';
      operationalOwnerRoleLabel = 'Penerbit';
      operationalNextAction = 'Unggah perbaikan naskah / dumi';
      blockedReason =
        registration.revision_notes ||
        registration.status_histories?.[registration.status_histories.length - 1]?.notes ||
        'Hasil sidang pentashihan memerlukan koreksi lafazh/rasm/tanda baca atau naskah dumi.';
    } else if (
      registration.revision_source === 'PHYSICAL_MASTER' ||
      registration.physical_master_intake?.status === 'RETURNED'
    ) {
      operationalState = 'PHYSICAL_MASTER_CORRECTION_REQUIRED';
      operationalStatusLabel = 'Perlu Perbaikan Master Fisik';
      operationalOwnerRole = 'ADMIN_PENERBIT';
      operationalOwnerRoleLabel = 'Penerbit';
      operationalNextAction = 'Perbaiki jilid master fisik & serahkan ulang ke loket LPMQ';
      blockedReason =
        registration.physical_master_intake?.notes ||
        'Master fisik dikembalikan di loket karena jilid tidak lengkap atau cacat.';
    }
  }

  // Tentukan nama pejabat/petugas penanggung jawab saat ini
  let ownerName = null;
  if (def.ownerRole === 'ADMIN_PENERBIT') {
    ownerName = registration.publisher?.legal_name || 'Pemohon Penerbit';
  } else if (def.ownerRole === 'VERIFIKATOR') {
    ownerName = registration.assigned_verificator?.name || registration.verifier?.name || null;
  } else if (def.ownerRole === 'KEPALA_LPMQ') {
    ownerName = 'Kepala LPMQ Kemenag RI';
  } else if (def.ownerRole === 'DISTRIBUTOR') {
    ownerName = 'Koordinator Distribusi Naskah';
  } else if (def.ownerRole === 'PENTASHIH') {
    ownerName = registration.distribution_team?.name || 'Tim Pentashih';
  }

  // Evaluasi tenggat SLA
  const dueAt = registration.due_at || registration.stage_due_at || null;
  const isOverdue = dueAt ? new Date(dueAt).getTime() < Date.now() : false;

  // Evaluasi apakah user yang sedang login berhak mengambil tindakan aktif
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const effectiveOwnerRole = operationalOwnerRole || def.ownerRole;
  let canUserAct = false;

  if (userRoles.includes('SUPERADMIN')) {
    canUserAct = true;
  } else if (def.ownerRole === 'ADMIN_PENERBIT') {
    canUserAct = userRoles.includes('ADMIN_PENERBIT') || currentUser?.role === 'ADMIN_PENERBIT';
  } else if (def.ownerRole === 'VERIFIKATOR') {
    canUserAct = userRoles.includes('VERIFIKATOR') || currentUser?.role === 'VERIFIKATOR';
  } else if (def.ownerRole === 'KEPALA_LPMQ') {
    canUserAct = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  } else if (def.ownerRole === 'DISTRIBUTOR') {
    canUserAct = userRoles.includes('DISTRIBUTOR') || currentUser?.role === 'DISTRIBUTOR';
  } else if (def.ownerRole === 'PENTASHIH') {
    canUserAct = userRoles.includes('PENTASHIH') || currentUser?.role === 'PENTASHIH';
  } else if (def.ownerRole === 'DOKUMENTATOR') {
    canUserAct = userRoles.includes('DOKUMENTATOR') || currentUser?.role === 'DOKUMENTATOR';
  }

  if (operationalState === 'WAITING_PHYSICAL_MASTER' && (userRoles.includes('ADMIN') || currentUser?.role === 'ADMIN')) {
    canUserAct = true;
  }

  let nextActionPath = def.actionPath ? def.actionPath(registration.id, registration) : null;
  if (operationalState === 'WAITING_PHYSICAL_MASTER') {
    nextActionPath = '/internal/master-intake';
  } else if (operationalState === 'READY_FOR_ASSIGNMENT') {
    nextActionPath = `/internal/verifications?tab=NEED_ASSIGNMENT&id=${registration.id}`;
  } else if (operationalState === 'READY_FOR_PHYSICAL_HANDOVER') {
    const assignmentId =
      registration.verification_assignment?.id ||
      registration.verification_assignments?.[0]?.id ||
      registration.id;
    nextActionPath = `/internal/verifications/${assignmentId}`;
  }

  const isTashihRev = operationalState === 'TASHIH_REVISION_REQUIRED';
  const effectivePhase = isTashihRev ? 'TASHIH' : def.phase;
  const effectiveStatusLabel = isTashihRev ? 'Perlu Perbaikan Naskah Sidang' : def.statusLabel;
  const effectiveStatusDescription = isTashihRev
    ? 'Catatan telaah sidang pentashihan memerlukan koreksi lafazh, rasm usmani, tanda baca, atau naskah dumi oleh pemohon.'
    : def.statusDescription;

  return {
    phase: effectivePhase,
    statusCode: status,
    operationalState,
    operationalStatusLabel,
    operationalOwnerRole,
    operationalOwnerRoleLabel,
    operationalNextAction,
    statusLabel: effectiveStatusLabel,
    statusDescription: effectiveStatusDescription,
    ownerRole: def.ownerRole,
    ownerRoleLabel: def.ownerRoleLabel,
    ownerName,
    nextActionLabel: operationalNextAction || def.nextActionLabel,
    nextActionPath,
    dueAt,
    isOverdue,
    blockedReason,
    canUserAct,
  };
}
