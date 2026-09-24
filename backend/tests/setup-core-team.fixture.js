import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import { assertIsolatedTestDatabase } from '../src/utils/test-database.js';

// Compatibility fixture for legacy API suites that assume one demo account per role.
// Production configuration and the dedicated rotation test use the validated 27-account API.
try {
  assertIsolatedTestDatabase(process.env.DATABASE_URL);
  const emails = {
    VERIFIKATOR: 'verifikator@lpmq.kemenag.go.id',
    DISTRIBUTOR: 'distributor@lpmq.kemenag.go.id',
    DOKUMENTATOR: 'dokumentator@lpmq.kemenag.go.id',
  };
  const users = Object.fromEntries(await Promise.all(Object.entries(emails).map(async ([role, email]) => {
    const user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
    assert.ok(user?.roles.some(item => item.role.code === role), `Akun demo ${role} tidak ditemukan.`);
    return [role, user];
  })));
  const roster = Array.from({ length: 9 }, (_, index) => ({
    id: randomUUID(), version: 1, team_number: index + 1,
    verifier_id: users.VERIFIKATOR.id,
    distributor_id: users.DISTRIBUTOR.id,
    documenter_id: users.DOKUMENTATOR.id,
  }));
  const existing = await prisma.coreTeamRoster.findMany({ where: { version: 1 } });
  if (existing.length === 0) {
    await prisma.coreTeamRoster.createMany({ data: roster });
  } else {
    assert.equal(existing.length, 9, 'Roster uji harus lengkap dengan sembilan tim.');
    for (const team of roster) {
      const current = existing.find(item => item.team_number === team.team_number);
      assert.ok(current && current.verifier_id === team.verifier_id && current.distributor_id === team.distributor_id && current.documenter_id === team.documenter_id,
        `Tim uji ${team.team_number} berbeda dari akun demo.`);
    }
  }
  console.log('Legacy API test roster ready.');
} finally {
  await prisma.$disconnect();
}
