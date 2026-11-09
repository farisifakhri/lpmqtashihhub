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
