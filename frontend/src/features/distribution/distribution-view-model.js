// Presentation data only. The server validates who may assign and review.
export function getReviewProgress(registration) {
  const assignments = registration.assignments || [];
  const iteration = assignments.reduce((max, item) => Math.max(max, item.iteration || 1), 1);
  const currentAssignments = assignments.filter((item) => (item.iteration || 1) === iteration);
  const totalMembers = currentAssignments.length;
  const completedMembers = currentAssignments.filter(
    (item) => item.status === 'COMPLETED' && item.reviews?.length > 0
  ).length;
  return {
    iteration,
    currentAssignments,
    totalMembers,
    completedMembers,
    isReadyToReview: totalMembers > 0 && completedMembers === totalMembers,
  };
}
