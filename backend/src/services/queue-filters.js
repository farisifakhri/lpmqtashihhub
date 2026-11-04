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

export function buildVerificationAssignmentsWhere(query = {}, user, { scopeToVerifier = false } = {}) {
  const where = {};
  const isHead = user.roles.includes('KEPALA_LPMQ');
  const isAdmin = user.roles.includes('SUPERADMIN') || user.roles.includes('ADMIN_INTERNAL');
  if (scopeToVerifier || (!isHead && !isAdmin)) where.verifier_id = user.id;
  if (query.my_tasks === 'true' && isHead) where.assigned_by_id = user.id;
  if (query.status) where.status = query.status;
  if (query.registration_status) {
    where.registration = { ...(where.registration || {}), status: query.registration_status };
  }
  if (query.handover_ready === 'true') {
    where.status = 'COMPLETED';
    where.registration = {
      ...(where.registration || {}),
      core_distributor_id: { not: null },
      payment_records: { some: { status: 'VERIFIED' } },
      OR: [
        { status: 'PAYMENT_VERIFICATION', physical_handovers: { none: { status: 'PENDING' } } },
        { status: 'PHYSICAL_HANDOVER_CORRECTION_REQUIRED', physical_handovers: { some: { status: 'RETURNED' } } },
      ],
    };
  }
  if (query.search) {
    where.registration = {
      ...(where.registration || {}),
      AND: [{ OR: [
        { registration_no: { contains: query.search } },
        { title: { contains: query.search } },
        { publisher: { legal_name: { contains: query.search } } },
      ] }],
    };
  }

  return where;
}
