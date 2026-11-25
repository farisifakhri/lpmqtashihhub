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
  let roster = await tx.coreTeamRoster.findUnique({
    where: { version_team_number: { version: rotation.active_version, team_number: rotation.next_team_number } },
  });

  // Jika tidak ditemukan pada versi aktif saat ini, cek versi terbaru pada coreTeamRoster
  if (!roster) {
    const latestRoster = await tx.coreTeamRoster.findFirst({
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    if (latestRoster) {
      roster = await tx.coreTeamRoster.findUnique({
        where: { version_team_number: { version: latestRoster.version, team_number: rotation.next_team_number } },
      });
      if (roster) {
        await tx.coreTeamRotation.update({
          where: { id: rotationId },
          data: { active_version: latestRoster.version },
        });
      }
    }
  }

  // Jika tabel core_team_rosters masih kosong (misal database baru di-seed sebelum konfigurasi manual):
  // inisialisasi 9 tim secara otomatis dari akun petugas aktif (VERIFIKATOR, DISTRIBUTOR, DOKUMENTATOR)
  if (!roster) {
    const count = await tx.coreTeamRoster.count();
    if (count === 0) {
      const [verifiers, distributors, documenters] = await Promise.all([
        tx.user.findMany({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'VERIFIKATOR' } } } }, select: { id: true }, take: 9 }),
        tx.user.findMany({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'DISTRIBUTOR' } } } }, select: { id: true }, take: 9 }),
        tx.user.findMany({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'DOKUMENTATOR' } } } }, select: { id: true }, take: 9 }),
      ]);
      if (verifiers.length > 0 && distributors.length > 0 && documenters.length > 0) {
        const v = rotation.active_version || 1;
        const autoTeams = Array.from({ length: 9 }, (_, index) => ({
          version: v,
          team_number: index + 1,
          verifier_id: verifiers[index % verifiers.length].id,
          distributor_id: distributors[index % distributors.length].id,
          documenter_id: documenters[index % documenters.length].id,
        }));
        await tx.coreTeamRoster.createMany({ data: autoTeams });
        roster = await tx.coreTeamRoster.findUnique({
          where: { version_team_number: { version: v, team_number: rotation.next_team_number } },
        });
      }
    }
  }

  // Jika tim pada pointer saat ini memiliki anggota tidak aktif, cari tim berikutnya yang aktif
  if (roster) {
    let candidateRoster = roster;
    let foundActive = false;
    for (let offset = 0; offset < 9; offset++) {
      const teamNum = ((roster.team_number - 1 + offset) % 9) + 1;
      const testRoster = offset === 0 ? candidateRoster : await tx.coreTeamRoster.findUnique({
        where: { version_team_number: { version: candidateRoster.version, team_number: teamNum } },
      });
      if (testRoster) {
        const activeCount = await tx.user.count({
          where: { id: { in: [testRoster.verifier_id, testRoster.distributor_id, testRoster.documenter_id] }, status: 'ACTIVE' },
        });
        if (activeCount === 3) {
          candidateRoster = testRoster;
          foundActive = true;
          break;
        }
      }
    }
    if (foundActive) {
      roster = candidateRoster;
    }
  }

  // Jika tetap tidak ditemukan roster atau anggota aktif:
  // Jangan jadikan konfigurasi internal tim sebagai penghalang pengajuan bagi penerbit.
  if (!roster) {
    const [fallbackVerifier, fallbackDistributor, fallbackDocumenter] = await Promise.all([
      tx.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'VERIFIKATOR' } } } }, select: { id: true } }),
      tx.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'DISTRIBUTOR' } } } }, select: { id: true } }),
      tx.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'DOKUMENTATOR' } } } }, select: { id: true } }),
    ]);
    if (fallbackVerifier || fallbackDistributor || fallbackDocumenter) {
      const fallbackSnapshot = {
        core_team_number: 1,
        core_team_version: rotation.active_version || 1,
        core_verifier_id: fallbackVerifier?.id || null,
        core_distributor_id: fallbackDistributor?.id || null,
        core_documenter_id: fallbackDocumenter?.id || null,
      };
      await tx.registration.update({ where: { id: registrationId }, data: fallbackSnapshot });
      await audit(tx, user, 'ALLOCATE_CORE_TEAM', 'Registration', registrationId, fallbackSnapshot, req);
      return fallbackSnapshot;
    }
    fail(409, `Tim ${rotation.next_team_number} belum dikonfigurasi. Lengkapi sembilan tim sebelum pengajuan baru dikirim.`);
  }

  const activeMembers = await tx.user.count({
    where: { id: { in: [roster.verifier_id, roster.distributor_id, roster.documenter_id] }, status: 'ACTIVE' },
  });
  if (activeMembers !== 3) {
    const [fallbackVerifier, fallbackDistributor, fallbackDocumenter] = await Promise.all([
      tx.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'VERIFIKATOR' } } } }, select: { id: true } }),
      tx.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'DISTRIBUTOR' } } } }, select: { id: true } }),
      tx.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'DOKUMENTATOR' } } } }, select: { id: true } }),
    ]);
    if (fallbackVerifier && fallbackDistributor && fallbackDocumenter) {
      const snapshot = {
        core_team_number: roster.team_number,
        core_team_version: roster.version,
        core_verifier_id: fallbackVerifier.id,
        core_distributor_id: fallbackDistributor.id,
        core_documenter_id: fallbackDocumenter.id,
      };
      await tx.registration.update({ where: { id: registrationId }, data: snapshot });
      await tx.coreTeamRotation.update({
        where: { id: rotationId },
        data: { next_team_number: roster.team_number === 9 ? 1 : roster.team_number + 1 },
      });
      await audit(tx, user, 'ALLOCATE_CORE_TEAM', 'Registration', registrationId, snapshot, req);
      return snapshot;
    }
    fail(409, `Salah satu akun pada tim ${roster.team_number} tidak aktif. Perbarui roster sebelum submit.`);
  }

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
  requireRole(user, ['SUPERADMIN', 'ADMIN_INTERNAL']);
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
