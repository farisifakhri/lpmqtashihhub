const ACTIVE_VERIFICATION_ASSIGNMENT_STATUSES = [
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_APPROVAL',
  'WAITING_SIGNATURE',
  'READY_TO_SEND',
];

export function buildAdminPublisherRegistrationWhere({ status, search } = {}) {
  const where = {};

  if (status) {
    where.status = status;
  }
  if (search && search.trim()) {
    const query = search.trim();
    where.OR = [
      { name: { contains: query } },
      { registration_code: { contains: query } },
      { email: { contains: query } },
      { npwp: { contains: query } },
    ];
  }

  return where;
}

export function buildMasterIntakeQueueWhere() {
  return {
    OR: [
      {
        status: 'READY_FOR_VERIFICATION',
        OR: [
          { physical_master_intake: { is: null } },
          { physical_master_intake: { isNot: { status: 'RECEIVED' } } },
        ],
      },
      {
        status: 'REVISION_REQUIRED',
        revision_source: 'PHYSICAL_MASTER',
        physical_master_intake: {
          status: 'RETURNED',
        },
      },
    ],
  };
}

export function buildUnassignedVerificationWhere({ search } = {}) {
  const where = {
    status: 'READY_FOR_VERIFICATION',
    physical_master_intake: {
      status: 'RECEIVED',
      receipt_no: { not: null },
    },
    verification_assignments: {
      none: {
        status: { in: ACTIVE_VERIFICATION_ASSIGNMENT_STATUSES },
      },
    },
  };

  if (search) {
    where.OR = [
      { registration_no: { contains: search } },
      { title: { contains: search } },
      { publisher: { legal_name: { contains: search } } },
    ];
  }

  return where;
}
