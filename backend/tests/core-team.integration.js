import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/config/database.js';
import { configureCoreTeams, setNextCoreTeam } from '../src/services/core-team.service.js';
import { submitRegistration } from '../src/services/registration.service.js';
import { createVerificationAssignment } from '../src/services/verification-intake.service.js';
import { deleteUser, updateUser } from '../src/services/user-management.service.js';

const roleUser = async role => prisma.user.findFirst({
  where: { status: 'ACTIVE', roles: { some: { role: { code: role } } } },
});

try {
  const [admin, head, verifier, distributor, documenter, publisher, serviceType] = await Promise.all([
    roleUser('SUPERADMIN'), roleUser('KEPALA_LPMQ'), roleUser('VERIFIKATOR'), roleUser('DISTRIBUTOR'),
    roleUser('DOKUMENTATOR'), prisma.publisher.findFirst({ where: { verification_status: 'VERIFIED' }, include: { user: true } }),
    prisma.serviceType.findFirst(),
  ]);
  assert.ok(admin && head && verifier && distributor && documenter && publisher?.user && serviceType);
  const adminActor = { id: admin.id, name: admin.name, roles: ['SUPERADMIN'] };
  const publisherActor = { id: publisher.user.id, name: publisher.user.name, publisherId: publisher.id, roles: ['ADMIN_PENERBIT'] };
  const makeMembers = async (template, roleCode) => {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    const members = [template.id];
    for (let index = 1; index < 9; index++) {
      const account = await prisma.user.create({ data: {
        name: `${roleCode} uji ${index}`, email: `${roleCode.toLowerCase()}-${randomUUID()}@example.test`,
        password_hash: template.password_hash, status: 'ACTIVE',
        roles: { create: { role_id: role.id } },
      } });
      members.push(account.id);
    }
    return members;
  };
  const [verifiers, distributors, documenters] = await Promise.all([
    makeMembers(verifier, 'VERIFIKATOR'), makeMembers(distributor, 'DISTRIBUTOR'), makeMembers(documenter, 'DOKUMENTATOR'),
  ]);
  const teams = Array.from({ length: 9 }, (_, index) => ({
    team_number: index + 1, verifier_id: verifiers[index],
    distributor_id: distributors[index], documenter_id: documenters[index],
  }));
  await configureCoreTeams(teams, 'Roster uji rotasi tim inti', adminActor);
  await setNextCoreTeam(4, 'Mulai dari tim empat untuk uji', adminActor);
  await assert.rejects(deleteUser(verifiers[0], adminActor), error => error.statusCode === 409);
  await assert.rejects(updateUser(verifiers[0], { status: 'INACTIVE' }, adminActor), error => error.statusCode === 409);
  await assert.rejects(updateUser(verifiers[0], { roles: [] }, adminActor), error => error.statusCode === 409);

  const drafts = await Promise.all(Array.from({ length: 7 }, (_, index) => prisma.registration.create({
    data: {
      registration_no: `TEST-CORE-${index}-${randomUUID()}`,
      publisher_id: publisher.id, service_type_id: serviceType.id,
      title: `Uji rotasi ${index}`, status: 'DRAFT',
    },
  })));
  const firstTwo = await Promise.all(drafts.slice(0, 2).map(draft => submitRegistration(draft.id, publisherActor)));
  assert.deepEqual(firstTwo.map(item => item.core_team_number).sort(), [4, 5]);
  const rest = [];
  for (const draft of drafts.slice(2)) rest.push(await submitRegistration(draft.id, publisherActor));
  assert.deepEqual(rest.map(item => item.core_team_number), [6, 7, 8, 9, 1]);
  assert.ok([...firstTwo, ...rest].every(item => {
    const team = teams[item.core_team_number - 1];
    return item.core_verifier_id === team.verifier_id && item.core_distributor_id === team.distributor_id && item.core_documenter_id === team.documenter_id;
  }));
  const pointer = await prisma.coreTeamRotation.findUnique({ where: { id: 1 } });
  assert.equal(pointer.next_team_number, 2);
  await assert.rejects(submitRegistration(drafts[0].id, publisherActor), error => error.statusCode === 400);
  assert.equal((await prisma.coreTeamRotation.findUnique({ where: { id: 1 } })).next_team_number, 2);
  await prisma.physicalMasterIntake.create({ data: {
    registration_id: drafts[0].id, status: 'RECEIVED', receipt_no: `CORE-RECEIPT-${randomUUID()}`,
  } });
  const firstTeam = firstTwo[0].core_team_number;
  await assert.rejects(createVerificationAssignment(drafts[0].id, {
    nota_no: `CORE-NOTA-${randomUUID()}`, verifier_id: teams[firstTeam % 9].verifier_id,
  }, adminActor), error => error.statusCode === 400);
  const assigned = await createVerificationAssignment(drafts[0].id, {
    nota_no: `CORE-NOTA-${randomUUID()}`,
  }, adminActor);
  assert.equal(assigned.assignment.verifier_id, teams[firstTeam - 1].verifier_id);
  console.log('Core team rotation: concurrent 4/5, wrap 9/1, and retry passed.');
} finally {
  await prisma.$disconnect();
}
