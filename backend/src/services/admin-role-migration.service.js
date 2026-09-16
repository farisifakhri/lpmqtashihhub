import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';

export async function inspectKetuaPentashih(db = prisma) {
  // ACTIVE/INACTIVE/SUSPENDED are account states, NOT office appointments.
  const users = await db.user.findMany({
    select: {
      id: true, name: true, status: true,
      roles: { select: { role: { select: { code: true, name: true } } } },
      teams_led: { select: { id: true, name: true } },
      team_memberships: { select: { role_in_team: true } },
    },
  });
  const officeLabel = /ketua[\s_-]*pentashih/i;
  const labelled = users.filter(user => officeLabel.test(user.name)
    || user.roles.some(item => officeLabel.test(item.role.name))
    || user.team_memberships.some(item => officeLabel.test(item.role_in_team)));
  return {
    labelled_candidates: labelled,
    team_leaders_for_manual_review: users.filter(user => user.teams_led.length),
    existing_admins: users.filter(user => user.roles.some(item => item.role.code === 'ADMIN')),
    note: 'No automatic promotion from team leadership, assignment stage, name or account status. Execution requires reviewed user IDs.',
  };
}

export async function migrateReviewedAdmins({ userIds, expected, approvedBy, execute = false }, db = prisma) {
  if (!Array.isArray(userIds) || !userIds.length || new Set(userIds).size !== userIds.length
    || userIds.some(id => !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
    || expected !== userIds.length) throw new Error('Provide distinct reviewed UUIDs and their explicit expected count.');
  const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, status: true, roles: { select: { role: { select: { code: true } } } } } });
  if (users.length !== expected || users.some(user => user.status !== 'ACTIVE')) throw new Error('Reviewed users must exist and be ACTIVE.');
  if (!execute) return { dry_run: true, selected: users, count: users.length };
  const actor = await db.user.findUnique({ where: { id: approvedBy }, include: { roles: { include: { role: true } } } });
  if (!actor || actor.status !== 'ACTIVE' || !actor.roles.some(item => item.role.code === 'SUPERADMIN')) throw new Error('Execution requires an active SUPERADMIN approval actor.');
  return db.$transaction(async tx => {
    const role = await tx.role.findUnique({ where: { code: 'ADMIN' } });
    if (!role) throw new Error('Apply add_admin_role migration first.');
    let changed = 0;
    for (const user of users) {
      const current = await tx.user.findUnique({ where: { id: user.id }, include: { roles: { include: { role: true } } } });
      if (current.status !== 'ACTIVE') throw new Error('Account state changed.');
      if (current.roles.some(item => item.role.code === 'ADMIN')) continue;
      await tx.userRole.upsert({ where: { user_id_role_id: { user_id: user.id, role_id: role.id } }, create: { user_id: user.id, role_id: role.id }, update: {} });
      await tx.auditLog.create({ data: {
        actor_id: actor.id, action: 'MIGRATE_KETUA_PENTASHIH_TO_ADMIN', subject_type: 'User', subject_id: user.id,
        before_json: { roles: current.roles.map(item => item.role.code) },
        after_json: { roles: [...current.roles.map(item => item.role.code), 'ADMIN'], source: 'Reviewed one-time migration', run_id: randomUUID() },
      } });
      changed += 1;
    }
    return { dry_run: false, selected: users.length, changed };
  });
}
