// Queue order is based on entry into the current stage, not draft creation.
export const ACTIVE_REGISTRATION_STATUSES = [
  'READY_FOR_VERIFICATION', 'VERIFICATION_ASSIGNED', 'IN_VERIFICATION',
  'REVISION_REQUIRED', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED',
  'AWAITING_PAYMENT', 'PAYMENT_VERIFICATION', 'WAITING_DISTRIBUTOR_RECEIPT',
  'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS', 'READY_FOR_STT',
  'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS',
];

export const REGISTRATION_SEGMENTS = {
  PUBLISHER_ACTIONS: ['DRAFT', 'REVISION_REQUIRED', 'AWAITING_PAYMENT'],
  PUBLISHER_PROCESSING: ACTIVE_REGISTRATION_STATUSES.filter(status => !['REVISION_REQUIRED', 'AWAITING_PAYMENT'].includes(status)),
  VERIFICATION: ['READY_FOR_VERIFICATION', 'VERIFICATION_ASSIGNED', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL', 'VERIFICATION_APPROVED'],
  TASHIH: ['WAITING_DISTRIBUTOR_RECEIPT', 'WAITING_DISTRIBUTION', 'TASHIH_IN_PROGRESS'],
  COMPLETED: ['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'],
};

export function queuePagination(query = {}) {
  const number = (value, fallback, max) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
  };
  const page = number(query.page, 1, 1000000);
  const limit = number(query.limit, 20, 100);
  return { page, limit, skip: (page - 1) * limit };
}

export function queueItems(items, enteredAt, skip = 0, fifo = true) {
  return items.map((item, index) => ({
    ...item,
    queue_entered_at: enteredAt(item),
    // Position is within the selected, permission-scoped queue, not a global ticket.
    queue_position: fifo ? skip + index + 1 : null,
  }));
}
