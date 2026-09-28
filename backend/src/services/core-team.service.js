import { prisma } from '../config/database.js';
import { audit, fail, requireRole } from './workflow-utils.js';

const rotationId = 1;
const positions = [
  ['verifier_id', 'VERIFIKATOR'],
  ['distributor_id', 'DISTRIBUTOR'],
  ['documenter_id', 'DOKUMENTATOR'],
];

export async function lockRotation(tx) {
  await tx.$queryRaw`SELECT id FROM core_team_rotations WHERE id = ${rotationId} FOR UPDATE`;
  const rotation = await tx.coreTeamRotation.findUnique({ where: { id: rotationId } });
  if (!rotation) fail(409, 'Konfigurasi rotasi tim inti belum tersedia. Jalankan migrasi database.');
  return rotation;
}

export async function allocateCoreTeam(tx, registrationId, user, req) {
  // Caller holds the registration row lock first. The same order is used by all submit requests.
  const rotation = await lockRotation(tx);
  const roster = await tx.coreTeamRoster.findUnique({
    where: { version_team_number: { version: rotation.active_version, team_number: rotation.next_team_number } },
  });
  if (!roster) fail(409, `Tim ${rotation.next_team_number} belum dikonfigurasi. Lengkapi sembilan tim sebelum pengajuan baru dikirim.`);
  const activeMembers = await tx.user.count({
    where: { id: { in: [roster.verifier_id, roster.distributor_id, roster.documenter_id] }, status: 'ACTIVE' },
  });
  if (activeMembers !== 3) fail(409, `Salah satu akun pada tim ${roster.team_number} tidak aktif. Perbarui roster sebelum submit.`);
  const snapshot = {
    core_team_number: roster.team_number,
    core_team_version: roster.version,
    core_verifier_id: roster.verifier_id,
    core_distributor_id: roster.distributor_id,
    core_documenter_id: roster.documenter_id,
  };
  await tx.registration.update({ where: { id: registrationId }, data: snapshot });
  await tx.coreTeamRotation.update({
    where: { id: rotationId },
    data: { next_team_number: roster.team_number === 9 ? 1 : roster.team_number + 1 },
  });
  await audit(tx, user, 'ALLOCATE_CORE_TEAM', 'Registration', registrationId, snapshot, req);
  return snapshot;
}

export async function getCoreTeamConfig(user) {
  requireRole(user, ['SUPERADMIN', 'HELPER_ADMIN']);
  const rotation = await prisma.coreTeamRotation.findUnique({ where: { id: rotationId } });
  if (!rotation) fail(409, 'Konfigurasi rotasi belum tersedia. Jalankan migrasi database.');
  const rosters = await prisma.coreTeamRoster.findMany({
    where: { version: rotation.active_version },
    include: {
      verifier: { select: { id: true, name: true, status: true } },
      distributor: { select: { id: true, name: true, status: true } },
      documenter: { select: { id: true, name: true, status: true } },
    },
    orderBy: { team_number: 'asc' },
  });
  return { ...rotation, rosters };
}

export async function listLegacyCoreTeamCases(user, { page = 1, limit = 50 } = {}) {
  requireRole(user, ['SUPERADMIN']);
  const where = { core_team_number: null, status: { not: 'DRAFT' } };
  const [total, registrations] = await Promise.all([prisma.registration.count({ where }), prisma.registration.findMany({
    where,
    select: {
      id: true, registration_no: true, status: true,
      verification_assignments: {
        orderBy: { assigned_at: 'desc' }, take: 1,
        select: { verifier_id: true, status: true },
      },
      physical_handovers: {
        orderBy: { created_at: 'desc' }, take: 1,
        select: { from_user_id: true, to_user_id: true, status: true },
      },
    },
    orderBy: { created_at: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })]);
  return { total, page, limit, items: registrations.map(item => ({
    registrationId: item.id,
    registrationNo: item.registration_no,
    status: item.status,
    verifierId: item.verification_assignments[0]?.verifier_id || null,
    distributorId: item.physical_handovers[0]?.to_user_id || null,
    handoverStatus: item.physical_handovers[0]?.status || null,
    reviewRequired: true,
  })) };
}

export async function configureCoreTeams(teams, reason, user, req) {
  requireRole(user, ['SUPERADMIN']);
  return prisma.$transaction(async tx => {
    const rotation = await lockRotation(tx);
    const ids = [...new Set(teams.flatMap(team => positions.map(([key]) => team[key])))];
    if (ids.length !== 27) fail(400, 'Setiap posisi pada sembilan tim harus memakai akun yang berbeda.');
    const accounts = await tx.user.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: { roles: { include: { role: true } } },
    });
    const byId = new Map(accounts.map(account => [account.id, account]));
    for (const team of teams) {
      const members = positions.map(([key, role]) => {
        const account = byId.get(team[key]);
        if (!account || !account.roles.some(item => item.role.code === role)) {
          fail(400, `Tim ${team.team_number}: akun ${role} harus aktif dan memiliki peran yang sesuai.`);
        }
        return account.id;
      });
      if (new Set(members).size !== 3) fail(400, `Tim ${team.team_number} memiliki akun yang berulang.`);
    }
    const latest = await tx.coreTeamRoster.aggregate({ _max: { version: true } });
    const version = (latest._max.version || 0) + 1;
    await tx.coreTeamRoster.createMany({ data: teams.map(team => ({ ...team, version })) });
    await tx.coreTeamRotation.update({ where: { id: rotationId }, data: { active_version: version } });
    await audit(tx, user, 'CONFIGURE_CORE_TEAMS', 'CoreTeamRotation', String(rotationId), { version, reason, teams }, req, rotation);
    return { active_version: version, next_team_number: rotation.next_team_number };
  }, { isolationLevel: 'ReadCommitted' });
}

export async function setNextCoreTeam(teamNumber, reason, user, req) {
  requireRole(user, ['SUPERADMIN']);
  return prisma.$transaction(async tx => {
    const rotation = await lockRotation(tx);
    const count = await tx.coreTeamRoster.count({ where: { version: rotation.active_version } });
    if (count !== 9) fail(409, 'Lengkapi sembilan tim pada roster aktif terlebih dahulu.');
    const updated = await tx.coreTeamRotation.update({
      where: { id: rotationId }, data: { next_team_number: teamNumber },
    });
    await audit(tx, user, 'SET_NEXT_CORE_TEAM', 'CoreTeamRotation', String(rotationId), { next_team_number: teamNumber, reason }, req, rotation);
    return updated;
  }, { isolationLevel: 'ReadCommitted' });
}
