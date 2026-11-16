/**
 * B-22: Script Backfill SLA Verifikasi untuk Data Lama
 *
 * Menghitung dan mengisi kolom result_sent_at, sla_outcome, dan sla_working_days_used
 * pada penugasan verifikasi yang sudah berstatus COMPLETED.
 *
 * Mode Default: DRY RUN (hanya menampilkan laporan tanpa mengubah database).
 * Gunakan flag `--execute` untuk menerapkan perubahan ke database.
 *
 * Penggunaan:
 *   node backend/scripts/backfill-b22-sla.js           # Dry-run
 *   node backend/scripts/backfill-b22-sla.js --execute # Tulis ke DB
 */

import { prisma } from '../src/config/database.js';
import { countWorkingDays, determineVerificationSlaOutcome } from '../src/services/sla.service.js';

const isExecute = process.argv.includes('--execute');

async function main() {
  console.log(`[B-22 Backfill SLA] Memulai proses backfill SLA verifikasi...`);
  console.log(`[B-22 Backfill SLA] Mode: ${isExecute ? 'EXECUTE (Menulis ke DB)' : 'DRY RUN (Simulasi)'}\n`);

  const assignments = await prisma.verificationAssignment.findMany({
    where: {
      status: 'COMPLETED',
      sla_outcome: null,
    },
    include: {
      documents: {
        where: {
          document_type: { in: ['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'] },
          status: 'SENT',
        },
        orderBy: { sent_at: 'desc' },
        take: 1,
      },
    },
  });

  console.log(`Ditemukan ${assignments.length} penugasan COMPLETED tanpa sla_outcome.\n`);

  let updatedCount = 0;
  for (const a of assignments) {
    const sentDoc = a.documents?.[0];
    const sentAt = sentDoc?.sent_at || a.completed_at || new Date();
    const startPoint = a.started_at || a.assigned_at || sentAt;

    let workingDaysUsed = 0;
    try {
      workingDaysUsed = await countWorkingDays(prisma, startPoint, sentAt, { applyCutoff: true });
    } catch {
      workingDaysUsed = 1;
    }

    const slaOutcome = determineVerificationSlaOutcome(a.due_at, sentAt);

    console.log(
      `Assignment ${a.id} | Verifier: ${a.verifier_id} | Due: ${a.due_at?.toISOString() || '-'} | Sent: ${sentAt.toISOString()} | Used: ${workingDaysUsed} HK -> Outcome: ${slaOutcome}`
    );

    if (isExecute) {
      await prisma.verificationAssignment.update({
        where: { id: a.id },
        data: {
          result_sent_at: sentAt,
          sla_outcome: slaOutcome,
          sla_working_days_used: workingDaysUsed,
        },
      });
      updatedCount++;
    }
  }

  console.log(`\n[B-22 Backfill SLA] Selesai. Total diproses: ${assignments.length}. Diperbarui: ${isExecute ? updatedCount : 0} (Dry run: ${!isExecute}).`);
}

main()
  .catch((err) => {
    console.error('[B-22 Backfill SLA] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
