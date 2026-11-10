/**
 * Script Backfill: Pembersihan Catatan Telaah Pembanding dari Snapshot Dokumen Resmi
 *
 * Sesuai Paket B-19a:
 * Catatan telaah pembanding distributor (comparison_notes) yang sebelumnya tersimpan
 * pada content_snapshot dokumen REVISION_RETURN_LETTER dipindahkan ke tabel internal
 * `distributor_comparisons` dan dibersihkan dari snapshot agar tidak bocor ke penerbit.
 *
 * Penggunaan:
 *   node backend/scripts/backfill-clean-comparison-notes.js --dry-run
 *   node backend/scripts/backfill-clean-comparison-notes.js --execute
 */

import { prisma } from '../src/config/database.js';

const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

async function main() {
  console.log(`=== BACKFILL CLEAN COMPARISON NOTES (${isDryRun ? 'DRY RUN' : 'EXECUTE MODE'}) ===\n`);

  const documents = await prisma.officialDocument.findMany({
    where: { document_type: 'REVISION_RETURN_LETTER' },
    include: {
      registration: {
        select: {
          id: true,
          registration_no: true,
          core_distributor_id: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`Ditemukan ${documents.length} dokumen surat pengembalian revisi.`);

  let targetCount = 0;
  let migratedCount = 0;

  for (const doc of documents) {
    let snapshot = doc.content_snapshot;
    if (typeof snapshot === 'string') {
      try { snapshot = JSON.parse(snapshot); } catch { snapshot = {}; }
    }

    if (snapshot && snapshot.comparison_notes) {
      targetCount++;
      const notes = snapshot.comparison_notes;
      const roundNumber = snapshot.revision_round || doc.version || 1;
      const registrationId = doc.registration_id;

      console.log(`[Target #${targetCount}] Dokumen ID: ${doc.id} | Reg No: ${doc.registration?.registration_no || registrationId} | Ronde: ${roundNumber}`);
      console.log(`  Catatan: "${notes.length > 60 ? notes.substring(0, 60) + '...' : notes}"`);

      if (!isDryRun) {
        // 1. Pindahkan ke distributor_comparisons jika belum ada
        const existingComparison = await prisma.distributorComparison.findUnique({
          where: {
            registration_id_round_number: {
              registration_id: registrationId,
              round_number: roundNumber,
            },
          },
        });

        if (!existingComparison) {
          // Cari distributor: dari core_distributor_id atau user pertama ber-role DISTRIBUTOR
          let distributorId = doc.registration?.core_distributor_id;
          if (!distributorId) {
            const fallbackDist = await prisma.user.findFirst({
              where: { roles: { some: { role: { code: 'DISTRIBUTOR' } } } },
              select: { id: true },
            });
            distributorId = fallbackDist?.id;
          }

          if (distributorId) {
            await prisma.distributorComparison.create({
              data: {
                registration_id: registrationId,
                round_number: roundNumber,
                distributor_id: distributorId,
                notes: notes,
              },
            });
            console.log(`  -> Berhasil disalin ke tabel distributor_comparisons.`);
          }
        }

        // 2. Bersihkan comparison_notes dari content_snapshot
        const { comparison_notes: _removed, ...cleanedSnapshot } = snapshot;
        await prisma.officialDocument.update({
          where: { id: doc.id },
          data: { content_snapshot: cleanedSnapshot },
        });
        console.log(`  -> Berhasil dibersihkan dari content_snapshot.`);
        migratedCount++;
      }
    }
  }

  console.log('\n=== RINGKASAN ===');
  console.log(`Total dokumen diperiksa: ${documents.length}`);
  console.log(`Dokumen dengan comparison_notes: ${targetCount}`);
  if (isDryRun) {
    console.log(`Mode: DRY RUN (Tidak ada data yang diubah). Jalankan dengan --execute untuk menerapkan.`);
  } else {
    console.log(`Berhasil dibersihkan dan dimigrasikan: ${migratedCount} dokumen.`);
  }
}

main()
  .catch((err) => {
    console.error('Terjadi kesalahan saat backfill:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
