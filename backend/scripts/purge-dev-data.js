import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const OFFICIAL_EMAILS = [
  'admin@lpmq.kemenag.go.id',
  'admin.internal@lpmq.kemenag.go.id',
  'kepala@lpmq.kemenag.go.id',
  'penerbit@mushafnusantara.com',
];

async function main() {
  console.log('=== MEMULAI PEMBERSIHAN SELEKTIF (CARA 2) ===\n');

  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'password123';
  const newPasswordHash = await bcrypt.hash(defaultPassword, 10);

  await prisma.$transaction(async (tx) => {
    // 1. Bersihkan referensi antar pengajuan (self-relation)
    console.log('1. Memutus relasi sirkular pengajuan...');
    await tx.registration.updateMany({
      data: { previous_registration_id: null },
    });

    // 2. Hapus semua pengajuan
    const regCount = await tx.registration.count();
    console.log(`2. Menghapus ${regCount} data pengajuan (registrations) beserta relasinya...`);
    // Foreign keys dengan cascade akan otomatis menghapus:
    // manuscript_files, addons, verification_assignments, documents, signatures, handovers, payments, assignments, dll.
    await tx.registration.deleteMany();
    console.log('   -> Berhasil menghapus semua data pengajuan.');

    // 3. Identifikasi user nonaktif
    const inactiveUsers = await tx.user.findMany({
      where: { status: 'INACTIVE' },
      include: { publisher: true },
    });
    console.log(`3. Ditemukan ${inactiveUsers.length} user dengan status INACTIVE.`);

    const officialInactive = inactiveUsers.filter((u) => OFFICIAL_EMAILS.includes(u.email));
    const junkInactive = inactiveUsers.filter((u) => !OFFICIAL_EMAILS.includes(u.email));

    console.log(`   -> Akun resmi yang akan diaktifkan kembali: ${officialInactive.length} (${officialInactive.map(u => u.email).join(', ') || 'tidak ada'})`);
    console.log(`   -> Akun sampah/uji coba yang akan dihapus permanen: ${junkInactive.length}`);

    // Hapus akun sampah
    for (const junk of junkInactive) {
      if (junk.publisher) {
        await tx.publisherDocument.deleteMany({ where: { publisher_id: junk.publisher.id } });
        await tx.publisher.deleteMany({ where: { id: junk.publisher.id } });
      }
      await tx.userRole.deleteMany({ where: { user_id: junk.id } });
      await tx.teamMember.deleteMany({ where: { user_id: junk.id } });
      await tx.notification.deleteMany({ where: { user_id: junk.id } });
      await tx.auditLog.updateMany({
        where: { actor_id: junk.id },
        data: { actor_id: null },
      });
      await tx.user.delete({ where: { id: junk.id } });
      console.log(`   [DELETED] Akun sampah: ${junk.email} (${junk.name})`);
    }

    // Aktifkan kembali akun resmi yang sempat nonaktif
    for (const off of officialInactive) {
      await tx.user.update({
        where: { id: off.id },
        data: {
          status: 'ACTIVE',
          password_hash: newPasswordHash,
        },
      });
      console.log(`   [REACTIVATED] Akun resmi diaktifkan kembali: ${off.email}`);
    }

    // 4. Reset password seluruh akun aktif menjadi default
    console.log(`\n4. Menyamakan password seluruh user aktif menjadi default: "${defaultPassword}"...`);
    const updateResult = await tx.user.updateMany({
      where: { status: 'ACTIVE' },
      data: { password_hash: newPasswordHash },
    });
    console.log(`   -> Berhasil memperbarui password untuk ${updateResult.count} user aktif.`);
  }, { timeout: 60000 });

  // Verifikasi hasil akhir
  const remainingRegs = await prisma.registration.count();
  const remainingInactive = await prisma.user.count({ where: { status: 'INACTIVE' } });
  const totalActive = await prisma.user.count({ where: { status: 'ACTIVE' } });

  console.log('\n========================================');
  console.log('HASIL PEMBERSIHAN DATABASE:');
  console.log(`- Jumlah Pengajuan Tersisa: ${remainingRegs} (Harus 0)`);
  console.log(`- User Nonaktif Tersisa: ${remainingInactive} (Harus 0)`);
  console.log(`- Total User Aktif Bersih: ${totalActive}`);
  console.log(`- Password Default Semua Akun: ${defaultPassword}`);
  console.log('========================================\n');
}

main()
  .catch((err) => {
    console.error('Pembersihan gagal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
