import { prisma } from '../src/config/database.js';

async function main() {
  console.log('=== MEMULAI PEMBERSIHAN DATA TEST-CORE & DUMMY ROSTER ===\n');

  // 1. Hapus data pengajuan TEST-CORE
  const testCoreRegs = await prisma.registration.findMany({
    where: {
      OR: [
        { registration_no: { startsWith: 'TEST-CORE-' } },
        { title: { startsWith: 'Uji rotasi' } },
      ],
    },
    select: { id: true, registration_no: true, title: true },
  });

  console.log(`1. Ditemukan ${testCoreRegs.length} pengajuan TEST-CORE.`);
  if (testCoreRegs.length > 0) {
    const ids = testCoreRegs.map((r) => r.id);

    await prisma.physicalMasterIntake.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.verificationAssignment.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.physicalManuscriptHandover.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.notification.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { subject_id: { in: ids } } });

    const deletedRegs = await prisma.registration.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`   -> Berhasil menghapus ${deletedRegs.count} pengajuan TEST-CORE.`);
  }

  // 2. Bersihkan core_team_rosters versi test (version > 1)
  const deletedRosters = await prisma.coreTeamRoster.deleteMany({
    where: {
      version: { gt: 1 },
    },
  });
  console.log(`2. Menghapus ${deletedRosters.count} entri core_team_rosters versi dummy (version > 1).`);

  // Pastikan core_team_rotations diset ke active_version = 1 dan next_team_number = 1
  const rotation = await prisma.coreTeamRotation.findFirst();
  if (rotation) {
    await prisma.coreTeamRotation.update({
      where: { id: rotation.id },
      data: {
        active_version: 1,
        next_team_number: 1,
      },
    });
    console.log('   -> core_team_rotations di-reset ke active_version: 1, next_team_number: 1.');
  }

  // 3. Bersihkan akun user dummy (@example.test atau nama berisi "uji")
  const dummyUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: '@example.test' } },
        { name: { contains: 'uji' } },
        { name: { contains: 'Uji' } },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  console.log(`3. Ditemukan ${dummyUsers.length} akun user dummy.`);
  if (dummyUsers.length > 0) {
    const dummyIds = dummyUsers.map((u) => u.id);

    await prisma.coreTeamRoster.deleteMany({
      where: {
        OR: [
          { verifier_id: { in: dummyIds } },
          { distributor_id: { in: dummyIds } },
          { documenter_id: { in: dummyIds } },
        ],
      },
    });
    await prisma.verificationDocument.deleteMany({ where: { created_by_id: { in: dummyIds } } });
    await prisma.verificationDocumentSignatory.deleteMany({ where: { signer_user_id: { in: dummyIds } } });
    await prisma.documentSignatory.deleteMany({ where: { signer_user_id: { in: dummyIds } } });
    await prisma.verificationAssignment.deleteMany({ where: { verifier_id: { in: dummyIds } } });
    await prisma.physicalManuscriptHandover.deleteMany({
      where: {
        OR: [
          { from_user_id: { in: dummyIds } },
          { to_user_id: { in: dummyIds } },
        ],
      },
    });
    await prisma.userRole.deleteMany({ where: { user_id: { in: dummyIds } } });
    await prisma.teamMember.deleteMany({ where: { user_id: { in: dummyIds } } });
    await prisma.notification.deleteMany({ where: { user_id: { in: dummyIds } } });
    await prisma.auditLog.updateMany({
      where: { actor_id: { in: dummyIds } },
      data: { actor_id: null },
    });

    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: dummyIds } },
    });
    console.log(`   -> Berhasil menghapus permanen ${deletedUsers.count} akun user dummy.`);
  }

  // 4. Bersihkan akun duplikat lama Ahmad Falahudin (tim01-verifikator@roster.lpmq.invalid)
  const oldFalahudin = await prisma.user.findUnique({
    where: { email: 'tim01-verifikator@roster.lpmq.invalid' },
  });
  if (oldFalahudin) {
    const officialFalahudin = await prisma.user.findUnique({
      where: { email: 'verifikator@lpmq.kemenag.go.id' },
    });
    if (officialFalahudin) {
      await prisma.verificationDocument.updateMany({
        where: { created_by_id: oldFalahudin.id },
        data: { created_by_id: officialFalahudin.id },
      });
      await prisma.verificationDocumentSignatory.updateMany({
        where: { signer_user_id: oldFalahudin.id },
        data: { signer_user_id: officialFalahudin.id },
      });
      await prisma.documentSignatory.updateMany({
        where: { signer_user_id: oldFalahudin.id },
        data: { signer_user_id: officialFalahudin.id },
      });
      await prisma.physicalManuscriptHandover.updateMany({
        where: { from_user_id: oldFalahudin.id },
        data: { from_user_id: officialFalahudin.id },
      });
      await prisma.physicalManuscriptHandover.updateMany({
        where: { to_user_id: oldFalahudin.id },
        data: { to_user_id: officialFalahudin.id },
      });
      await prisma.verificationAssignment.updateMany({
        where: { verifier_id: oldFalahudin.id },
        data: { verifier_id: officialFalahudin.id },
      });
      await prisma.auditLog.updateMany({
        where: { actor_id: oldFalahudin.id },
        data: { actor_id: officialFalahudin.id },
      });
    }
    await prisma.userRole.deleteMany({ where: { user_id: oldFalahudin.id } });
    await prisma.teamMember.deleteMany({ where: { user_id: oldFalahudin.id } });
    await prisma.notification.deleteMany({ where: { user_id: oldFalahudin.id } });
    await prisma.user.delete({ where: { id: oldFalahudin.id } });
    console.log(`4. Akun lama/duplikat Ahmad Falahudin (${oldFalahudin.email}) berhasil dihapus permanen.`);
  }

  console.log('\n=== PEMBERSIHAN SELESAI DENGAN SUKSES! ===');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error saat pembersihan test core:', e);
    prisma.$disconnect();
    process.exit(1);
  });
