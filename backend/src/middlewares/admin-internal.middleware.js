import { authorize } from './rbac.middleware.js';

// Separate from the existing KEPALA_LPMQ and verification guards, but reuse
// the same authorization logic and authenticated roles-array contract.
// Memberships are additive: ADMIN never substitutes for an operational role.
export const ADMIN_INTERNAL_ROLES = ['ADMIN', 'SUPERADMIN'];
export const MANUAL_TEAM_ASSIGNMENT_ROLES = ['ADMIN', 'SUPERADMIN'];

export const requireAdminInternal = authorize(...ADMIN_INTERNAL_ROLES);
// Confirmed policy: manual team assignment belongs exclusively to admins.
export const requireManualTeamAssignment = authorize(...MANUAL_TEAM_ASSIGNMENT_ROLES);
