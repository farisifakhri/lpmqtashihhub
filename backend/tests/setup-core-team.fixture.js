import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';

// Compatibility fixture for legacy API suites that assume one demo account per role.
// Production configuration and the dedicated rotation test use the validated 27-account API.
try {
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
  await prisma.coreTeamRoster.createMany({ data: Array.from({ length: 9 }, (_, index) => ({
    id: randomUUID(), version: 1, team_number: index + 1,
    verifier_id: users.VERIFIKATOR.id,
    distributor_id: users.DISTRIBUTOR.id,
    documenter_id: users.DOKUMENTATOR.id,
  })) });
  console.log('Legacy API test roster prepared.');
} finally {
  await prisma.$disconnect();
}
