export function getInspectionDraft(detail, definitions) {
  const snapshot = detail.latest_result_document?.content_snapshot;
  if (snapshot) {
    return {
      checklist: Array.isArray(snapshot.checklist) && snapshot.checklist.length === definitions.length
        ? definitions.map((def) => snapshot.checklist.find((item) => item.code === def.code)
          || { code: def.code, result: 'SESUAI', notes: '' })
        : null,
      decision: snapshot.decision,
      notes: snapshot.notes,
      letterText: snapshot.letter_text,
    };
  }
  return { checklist: null, decision: detail.assignment?.decision, notes: detail.assignment?.notes };
}

export function getInspectionViewModel(detail, currentUser, selectedFileId, checklist) {
  // These flags control presentation only; the API enforces roles and transitions.
  const assignment = detail?.assignment || {};
  const registration = detail?.registration || {};
  const publisher = registration.publisher || {};
  const physicalMaster = registration.physical_master_intake || {};
  const notaDinas = detail?.nota_dinas || {};
  const latestResultDoc = detail?.latest_result_document;
  const beritaAcaraDoc = detail?.berita_acara;

  const isLatestDocSigned = latestResultDoc?.status === 'SIGNED' || latestResultDoc?.status === 'SENT';
  const isBaSigned = !beritaAcaraDoc || beritaAcaraDoc.status === 'SIGNED' || beritaAcaraDoc.status === 'SENT';
  const isAllFullySigned = isLatestDocSigned && isBaSigned;

  const latestSignatory = latestResultDoc?.signatories?.find(s => s.signer_user_id === currentUser?.id);
  const canUserSignLatest = Boolean(
    ['APPROVED', 'SIGNING'].includes(latestResultDoc?.status) &&
    latestSignatory &&
    latestSignatory.status === 'PENDING'
  );

  const baSignatories = beritaAcaraDoc?.signatories || [];
  const baMySignatory = baSignatories.find(s => s.signer_user_id === currentUser?.id);
  const priorBaPending = baMySignatory
    ? baSignatories.find(s => s.sign_order < baMySignatory.sign_order && s.status !== 'SIGNED')
    : null;
  const canUserSignBa = Boolean(
    ['APPROVED', 'SIGNING'].includes(beritaAcaraDoc?.status) &&
    baMySignatory &&
    baMySignatory.status === 'PENDING' &&
    !priorBaPending
  );

  const isEmailFailed = latestResultDoc?.status === 'EMAIL_FAILED' || latestResultDoc?.email_delivery_status === 'EMAIL_FAILED';
  const isRevoked = assignment.status === 'REVOKED';
  const isAssigned = assignment.status === 'ASSIGNED';
  const isInProgress = assignment.status === 'IN_PROGRESS';
  const isCompletedOrSubmitted =
    assignment.status === 'COMPLETED' || latestResultDoc?.status === 'SUBMITTED';
  const userRoles = Array.isArray(currentUser?.roles)
    ? currentUser.roles
    : (currentUser?.role ? [currentUser.role] : []);
  const isHead = userRoles.includes('KEPALA_LPMQ') || currentUser?.role === 'KEPALA_LPMQ';
  const isVerifier = userRoles.includes('VERIFIKATOR') || currentUser?.role === 'VERIFIKATOR';
  const isAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN');

  const isAssignedVerifier = isVerifier && (!assignment.verifier_id || assignment.verifier_id === currentUser?.id || assignment.verifier?.id === currentUser?.id);
  const canVerifierWork = isInProgress && isAssignedVerifier && !isRevoked;
  const isReadOnly = !canVerifierWork;

  const canHeadApprove = isHead && (registration.status === 'WAITING_VERIFICATION_APPROVAL' || latestResultDoc?.status === 'SUBMITTED');
  const isSent = latestResultDoc?.status === 'SENT' || ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'REVISION_REQUIRED'].includes(registration.status);
  const canVerifierSend = isAssignedVerifier && (registration.status === 'VERIFICATION_APPROVED' || ['APPROVED', 'SIGNING', 'SIGNED'].includes(latestResultDoc?.status)) && !isSent && !isEmailFailed;

  const latestPayment = registration.payment_records?.[0];
  const latestHandover = registration.physical_handovers?.[0];
  const isPaymentVerified = latestPayment?.status === 'VERIFIED';
  const canVerifierHandover =
    (isVerifier || isAdmin) &&
    registration.status === 'PAYMENT_VERIFICATION' &&
    isPaymentVerified &&
    (!latestHandover || latestHandover.status === 'RETURNED');
  const isWaitingDistributor = registration.status === 'WAITING_DISTRIBUTOR_RECEIPT';
  const isHandoverReceived =
    latestHandover?.status === 'RECEIVED' ||
    ['WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT', 'STT_ISSUED', 'COMPLETED'].includes(
      registration.status
    );

  const selectedFileObj = registration.manuscript_files?.find(f => f.id === selectedFileId) || registration.manuscript_files?.[0];

  const sesuaiCount = checklist.filter(c => c.result === 'SESUAI').length;
  const tidakSesuaiCount = checklist.filter(c => c.result === 'TIDAK_SESUAI').length;
  const tidakBerlakuCount = checklist.filter(c => c.result === 'TIDAK_BERLAKU').length;
  return {
    assignment, registration, publisher, physicalMaster, notaDinas,
    latestResultDoc, beritaAcaraDoc, isLatestDocSigned, isBaSigned, isAllFullySigned,
    latestSignatory, canUserSignLatest, baSignatories, baMySignatory, priorBaPending,
    canUserSignBa, isEmailFailed, isRevoked, isAssigned, isInProgress,
    isCompletedOrSubmitted, userRoles, isHead, isVerifier, isAdmin,
    isAssignedVerifier, canVerifierWork, isReadOnly, canHeadApprove, isSent,
    canVerifierSend, latestPayment, latestHandover, isPaymentVerified, canVerifierHandover,
    isWaitingDistributor, isHandoverReceived, selectedFileObj, sesuaiCount, tidakSesuaiCount,
    tidakBerlakuCount,
  };
}
