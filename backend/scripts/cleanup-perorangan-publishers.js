import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const INTERNAL_ROLES = [
  'SUPERADMIN',
  'ADMIN_INTERNAL',
  'KEPALA_LPMQ',
  'VERIFIKATOR',
  'DISTRIBUTOR',
  'PENTASHIH',
  'DOKUMENTATOR',
];

const db = new PrismaClient();

try {
  const target = new URL(process.env.DATABASE_URL);
  const database = decodeURIComponent(target.pathname.slice(1));

  // Ambil semua kandidat penerbit bertipe PERORANGAN
  const candidates = await db.publisher.findMany({
    where: { entity_type: 'PERORANGAN' },
    select: {
      id: true,
      legal_name: true,
      entity_type: true,
      verification_status: true,
      user_id: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          roles: {
            select: {
              role: {
                select: { code: true },
              },
            },
          },
        },
      },
      registrations: {
        select: {
          id: true,
          registration_no: true,
          title: true,
          status: true,
        },
      },
      documents: {
        select: {
          id: true,
          document_type: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  // Validasi ketat: pastikan semua kandidat benar-benar bertipe PERORANGAN
  if (candidates.some(c => c.entity_type !== 'PERORANGAN')) {
    throw new Error('Ditemukan entitas non-PERORANGAN dalam kandidat pembersihan; operasi dibatalkan.');
  }

  // Validasi ketat: pastikan tidak ada user internal yang terikat pada akun perorangan
  for (const c of candidates) {
    if (c.user?.roles?.some(r => INTERNAL_ROLES.includes(r.role.code))) {
      throw new Error(`Penerbit ${c.legal_name} terikat dengan akun internal ber-role ${c.user.roles.map(r => r.role.code).join(',')}; pembersihan ditolak demi keamanan.`);
    }
  }

  const totalPublishers = await db.publisher.count();
  const preservedPublishers = totalPublishers - candidates.length;

  console.log(JSON.stringify({
    database,
    host: target.hostname,
    total_publishers_before: totalPublishers,
    candidates_count: candidates.length,
    preserved_publishers: preservedPublishers,
    candidates: candidates.map(c => ({
      id: c.id,
      legal_name: c.legal_name,
      entity_type: c.entity_type,
      user_email: c.user?.email || null,
      registrations_count: c.registrations.length,
      registrations: c.registrations.map(r => ({ id: r.id, no: r.registration_no, title: r.title })),
      documents_count: c.documents.length,
    })),
  }, null, 2));

  if (!process.argv.includes('--execute')) {
    console.log('\n[PRATINJAU SAJA] Eksekusi penghapusan memerlukan argumen: --expected=N --backup=FULL_DUMP_PATH --execute');
  } else {
    const expectedArg = process.argv.find(arg => arg.startsWith('--expected='));
    const backupArg = process.argv.find(arg => arg.startsWith('--backup='));

    const expected = Number(expectedArg?.slice(11));
    const backupPathRaw = backupArg?.slice(9);

    if (!backupPathRaw || !Number.isSafeInteger(expected) || expected < 0 || candidates.length !== expected) {
      throw new Error(`Argumen --expected=${expected} tidak cocok dengan jumlah kandidat aktual (${candidates.length}) atau file backup tidak diberikan.`);
    }

    if (expected === 0) {
      console.log('\nTidak ada data penerbit PERORANGAN yang perlu dibersihkan. Basis data sudah bersih.');
      process.exit(0);
    }

    const backup = path.resolve(backupPathRaw);
    let metadata;
    try {
      metadata = JSON.parse(await readFile(`${backup}.json`, 'utf8'));
    } catch {
      throw new Error(`Gagal membaca file metadata checksum backup: ${backup}.json`);
    }

    if (metadata.database !== database || metadata.host !== target.hostname) {
      throw new Error(`Metadata backup tidak cocok dengan database tujuan (${metadata.database}@${metadata.host} vs ${database}@${target.hostname}).`);
    }

    const hash = createHash('sha256');
    for await (const chunk of createReadStream(backup)) hash.update(chunk);
    if (hash.digest('hex') !== metadata.sha256) {
      throw new Error('Integritas file backup gagal: Checksum SHA256 file backup tidak cocok dengan metadata!');
    }

    const publisherIds = candidates.map(c => c.id);
    const userIds = candidates.map(c => c.user_id).filter(Boolean);
    const registrationIds = candidates.flatMap(c => c.registrations.map(r => r.id));

    const manifestPath = `${backup}.cleanup-perorangan.json`;
    await writeFile(manifestPath, JSON.stringify({
      database,
      backup,
      expected_publishers: expected,
      candidates,
      completed: false,
      started_at: new Date().toISOString(),
    }, null, 2), { flag: 'wx' });

    const result = await db.$transaction(async tx => {
      // 1. Kunci baris penerbit yang akan dihapus
      const lockedPublishers = await tx.publisher.findMany({
        where: { id: { in: publisherIds } },
        select: { id: true, entity_type: true },
      });

      if (lockedPublishers.length !== expected || lockedPublishers.some(p => p.entity_type !== 'PERORANGAN')) {
        throw new Error('Data kandidat berubah saat transaksi berjalan; pembersihan dibatalkan (rollback).');
      }

      // Catat hitungan sebelum pembersihan
      const initialCounts = {
        publishers: await tx.publisher.count(),
        users: await tx.user.count(),
        registrations: await tx.registration.count(),
        audit_logs: await tx.auditLog.count(),
      };

      // 2. Bersihkan anak data dari registrations (jika ada)
      if (registrationIds.length > 0) {
        await tx.manuscriptFile.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.statusHistory.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.registrationAddon.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.verificationAssignment.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.verificationDocument.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.physicalMasterIntake.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.physicalManuscriptHandover.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.paymentRecord.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.assignment.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.documentationItem.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.officialDocument.deleteMany({ where: { registration_id: { in: registrationIds } } });
        await tx.notification.deleteMany({ where: { registration_id: { in: registrationIds } } });

        // Hapus permohonan pendaftaran itu sendiri
        await tx.registration.deleteMany({ where: { id: { in: registrationIds } } });
      }

      // 3. Bersihkan dokumen penerbit
      await tx.publisherDocument.deleteMany({ where: { publisher_id: { in: publisherIds } } });

      // 4. Hapus data penerbit
      const deletedPublishers = await tx.publisher.deleteMany({ where: { id: { in: publisherIds } } });

      // 5. Bersihkan akun user penerbit perorangan beserta token dan role-nya
      if (userIds.length > 0) {
        await tx.userRole.deleteMany({ where: { user_id: { in: userIds } } });
        await tx.passwordResetToken.deleteMany({ where: { user_id: { in: userIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }

      // 6. Verifikasi kepatuhan & integritas setelah penghapusan
      const remainingPerorangan = await tx.publisher.count({ where: { entity_type: 'PERORANGAN' } });
      if (remainingPerorangan > 0) {
        throw new Error(`Masih terdapat ${remainingPerorangan} penerbit PERORANGAN setelah penghapusan; operasi di-rollback.`);
      }

      const finalCounts = {
        publishers: await tx.publisher.count(),
        users: await tx.user.count(),
        registrations: await tx.registration.count(),
        audit_logs: await tx.auditLog.count(),
      };

      // Pastikan audit log sama sekali tidak berkurang
      if (finalCounts.audit_logs !== initialCounts.audit_logs) {
        throw new Error('Peringatan: Jumlah audit log berubah; pembersihan di-rollback.');
      }

      // Pastikan penerbit berkurang tepat sejumlah yang diharapkan
      if (initialCounts.publishers - finalCounts.publishers !== expected) {
        throw new Error(`Selisih penerbit (${initialCounts.publishers - finalCounts.publishers}) tidak sama dengan expected (${expected}); rollback.`);
      }

      return {
        deleted_publishers: deletedPublishers.count,
        deleted_users: userIds.length,
        deleted_registrations: registrationIds.length,
        remaining_publishers: finalCounts.publishers,
        remaining_users: finalCounts.users,
        remaining_registrations: finalCounts.registrations,
        preserved_audit_logs: finalCounts.audit_logs,
      };
    }, { timeout: 60000 });

    await writeFile(manifestPath, JSON.stringify({
      database,
      backup,
      expected_publishers: expected,
      candidates,
      completed: true,
      result,
      completed_at: new Date().toISOString(),
    }, null, 2));

    console.log('\n[BERHASIL DIBERSIHKAN]');
    console.log(JSON.stringify({
      ...result,
      manifest: manifestPath,
      backup,
      notice: 'Data penerbit perorangan dan akun uji terkait berhasil dibersihkan secara aman.',
    }, null, 2));
  }
} finally {
  await db.$disconnect();
}

