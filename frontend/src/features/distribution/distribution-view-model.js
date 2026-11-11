// Presentation data only. The server validates who may assign and review.
export function getReviewProgress(registration) {
  const assignments = registration.assignments || [];
  const iteration = assignments.reduce((max, item) => Math.max(max, item.iteration || 1), 1);
  const currentAssignments = assignments.filter((item) => (item.iteration || 1) === iteration);
  const activeAssignments = currentAssignments.filter((item) => item.status !== 'REVOKED');
  const totalMembers = activeAssignments.length;
  const completedMembers = activeAssignments.filter(
    (item) => item.status === 'COMPLETED' && item.reviews?.length > 0
  ).length;
  const hasRevoked = currentAssignments.some((item) => item.status === 'REVOKED');
  return {
    iteration,
    currentAssignments,
    activeAssignments,
    totalMembers,
    completedMembers,
    hasRevoked,
    isReadyToReview: totalMembers > 0 && completedMembers === totalMembers,
  };
}

// Jenis penugasan yang disarankan untuk naskah (nilai bawaan server di createAssignments).
export function getAssignmentStage(registration) {
  const letter = (registration?.official_documents || [])
    .filter((doc) => doc.document_type === 'REVISION_RETURN_LETTER')
    .sort((a, b) => (b.version || 0) - (a.version || 0))[0];
  const isDummy = letter?.content_snapshot?.revision_kind === 'NASKAH_DUMI' || registration?.revision_kind === 'NASKAH_DUMI';
  const stage = isDummy
    ? 'DUMMY'
    : registration?.assignments?.length > 0
    ? 'REVISION'
    : registration?.registration_type === 'EXTENSION'
    ? 'DUMMY'
    : 'INITIAL';
  return { stage };
}
