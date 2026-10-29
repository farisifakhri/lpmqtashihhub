import 'dotenv/config';
import { prisma } from '../src/config/database.js';

const normalizeName = (str) =>
  (str || '')
    .toLowerCase()
    .replace(/\b(dr|dra|drs|h|hj|lc|ma|m\.ag|m\.a|s\.ag|s\.th\.i|s\.s|s\.s\.i|s\.pd|s\.h|m\.si)\.?\s*/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

async function consolidateDuplicateStaff() {
  console.log('=== Memulai Pembersihan & Konsolidasi Akun Petugas Ganda (LPMQ) ===');

  const users = await prisma.user.findMany({
    include: {
      roles: { include: { role: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Total pengguna dalam pangkalan data: ${users.length}`);

  // Kelompokkan pengguna berdasarkan NIP atau nama ternormalisasi
  const groups = new Map();

  for (const user of users) {
    const cleanNip = user.nip ? user.nip.replace(/\s+/g, '') : null;
    const norm = normalizeName(user.name);

    let groupKey = null;

    if (cleanNip && cleanNip.length >= 6) {
      groupKey = `nip:${cleanNip}`;
    } else if (norm && norm.length >= 4) {
      groupKey = `name:${norm}`;
    }

    // Jika akun berakhiran @roster.lpmq.invalid, cocokkan dengan nama
    if (user.email && user.email.includes('@roster.lpmq.invalid')) {
      groupKey = `name:${norm}`;
    }

    if (!groupKey) continue;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(user);
  }

  // Filter hanya grup yang memiliki lebih dari 1 akun (duplikat)
  const duplicateGroups = Array.from(groups.entries()).filter(([, list]) => list.length > 1);

  console.log(`Ditemukan ${duplicateGroups.length} kelompok akun petugas dengan nama/NIP ganda.`);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const [key, list] of duplicateGroups) {
    // Tentukan akun utama (primary)
    // Prioritas:
    // 1. Akun email resmi (@lpmq.kemenag.go.id)
    // 2. Akun pentashih resmi (@pentashih.lpmq.go.id)
    // 3. Bukan akun dummy (@roster.lpmq.invalid)
    // 4. Memiliki NIP terisi
    // 5. Tanggal pembuatan lebih awal
    const scored = list.map((u) => {
      let score = 0;
      if (u.email.endsWith('@lpmq.kemenag.go.id')) score += 100;
      else if (u.email.endsWith('@pentashih.lpmq.go.id')) score += 50;
      if (!u.email.includes('@roster.lpmq.invalid')) score += 30;
      if (u.nip && u.nip.trim().length >= 6) score += 20;
      return { user: u, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const primary = scored[0].user;
    const secondaryList = scored.slice(1).map((s) => s.user);

    console.log(`\n[GRUP: ${key}] Akun Utama: "${primary.name}" (${primary.email}, NIP: ${primary.nip || '-'})`);

    for (const duplicate of secondaryList) {
      console.log(`  -> Menggabungkan akun duplikat: "${duplicate.name}" (${duplicate.email}, id: ${duplicate.id})`);

      // 1. Pindahkan seluruh peran yang dimiliki akun duplikat ke akun utama
      const duplicateRoles = duplicate.roles.map((ur) => ur.role);
      for (const r of duplicateRoles) {
        await prisma.userRole.upsert({
          where: {
            user_id_role_id: {
              user_id: primary.id,
              role_id: r.id,
            },
          },
          update: {},
          create: {
            user_id: primary.id,
            role_id: r.id,
          },
        });
      }

      // 2. Re-link relasi database dari duplicate.id ke primary.id
      // A. Core Team Roster (Tim Inti)
      await prisma.coreTeamRoster.updateMany({
        where: { verifier_id: duplicate.id },
        data: { verifier_id: primary.id },
      });
      await prisma.coreTeamRoster.updateMany({
        where: { distributor_id: duplicate.id },
        data: { distributor_id: primary.id },
      });
      await prisma.coreTeamRoster.updateMany({
        where: { documenter_id: duplicate.id },
        data: { documenter_id: primary.id },
      });

      // B. Team Members (Anggota Kelompok Sidang)
      const dupMemberships = await prisma.teamMember.findMany({
        where: { user_id: duplicate.id },
      });
      for (const m of dupMemberships) {
        const existingPrimary = await prisma.teamMember.findUnique({
          where: {
            team_id_user_id: {
              team_id: m.team_id,
              user_id: primary.id,
            },
          },
        });
        if (existingPrimary) {
          await prisma.teamMember.delete({
            where: { id: m.id },
          });
        } else {
          await prisma.teamMember.update({
            where: { id: m.id },
            data: { user_id: primary.id },
          });
        }
      }

      // C. Verification Assignments (Penugasan Verifikator)
      await prisma.verificationAssignment.updateMany({
        where: { verifier_id: duplicate.id },
        data: { verifier_id: primary.id },
      });
      await prisma.verificationAssignment.updateMany({
        where: { assigned_by_id: duplicate.id },
        data: { assigned_by_id: primary.id },
      });
      await prisma.verificationAssignment.updateMany({
        where: { revoked_by_id: duplicate.id },
        data: { revoked_by_id: primary.id },
      });

      // D. Assignments (Tugas Pentashih)
      await prisma.assignment.updateMany({
        where: { assignee_id: duplicate.id },
        data: { assignee_id: primary.id },
      });

      // E. Distribution Teams (Ketua Tim)
      await prisma.distributionTeam.updateMany({
        where: { leader_user_id: duplicate.id },
        data: { leader_user_id: primary.id },
      });

      // F. Physical Master Intake Loket
      await prisma.physicalMasterIntake.updateMany({
        where: { received_by_id: duplicate.id },
        data: { received_by_id: primary.id },
      });

      // G. Physical Manuscript Handover (Serah Terima Master Fisik)
      await prisma.physicalManuscriptHandover.updateMany({
        where: { from_user_id: duplicate.id },
        data: { from_user_id: primary.id },
      });
      await prisma.physicalManuscriptHandover.updateMany({
        where: { to_user_id: duplicate.id },
        data: { to_user_id: primary.id },
      });

      // H. Verification Documents
      await prisma.verificationDocument.updateMany({
        where: { created_by_id: duplicate.id },
        data: { created_by_id: primary.id },
      });
      await prisma.verificationDocument.updateMany({
        where: { approved_by_id: duplicate.id },
        data: { approved_by_id: primary.id },
      });

      // I. Verification Document Signatories
      await prisma.verificationDocumentSignatory.updateMany({
        where: { signer_user_id: duplicate.id },
        data: { signer_user_id: primary.id },
      });

      // J. Official Documents & Signatories
      await prisma.documentSignatory.updateMany({
        where: { signer_user_id: duplicate.id },
        data: { signer_user_id: primary.id },
      });

      // K. Logs & Notifications
      await prisma.auditLog.updateMany({
        where: { actor_id: duplicate.id },
        data: { actor_id: primary.id },
      });
      await prisma.statusHistory.updateMany({
        where: { actor_id: duplicate.id },
        data: { actor_id: primary.id },
      });
      await prisma.notification.updateMany({
        where: { user_id: duplicate.id },
        data: { user_id: primary.id },
      });

      // L. Hapus relasi role akun duplikat
      await prisma.userRole.deleteMany({
        where: { user_id: duplicate.id },
      });

      // M. Hapus record akun duplikat
      await prisma.user.delete({
        where: { id: duplicate.id },
      });

      deletedCount++;
    }

    // Refresh dan cetak peran aktif akun utama setelah konsolidasi
    const updatedPrimary = await prisma.user.findUnique({
      where: { id: primary.id },
      include: { roles: { include: { role: true } } },
    });
    const rolesList = updatedPrimary.roles.map((r) => r.role.code).join(', ');
    console.log(`  -> Selesai: Akun utama kini memiliki peran: [${rolesList}]`);

    mergedCount++;
  }

  console.log(`\n=== Pembersihan Selesai ===`);
  console.log(`- Kelompok profil dikonsolidasi: ${mergedCount}`);
  console.log(`- Akun duplikat yang dihapus: ${deletedCount}`);
  console.log(`Setiap petugas kini memiliki tepat 1 profil dengan multi-role.`);
}

consolidateDuplicateStaff()
  .catch((e) => {
    console.error('Error saat konsolidasi petugas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

