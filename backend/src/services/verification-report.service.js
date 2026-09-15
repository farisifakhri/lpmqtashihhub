import { prisma } from '../config/database.js';
import { fail, requireRole } from './workflow-utils.js';

// Konfigurasi SLA Resmi SOP Verifikasi LPMQ (VER-I01)
export const SLA_CONFIG = {
  INTAKE_PHYSICAL_MINUTES: 30,       // Langkah 2 SOP: Tanda terima master fisik di loket
  VERIFICATION_REVIEW_DAYS: 2,       // Langkah 4 SOP: Telaah berkas & draf nota dinas (48 jam)
  PAYMENT_BILLING_DAYS: 7,          // Langkah 6 SOP: Masa aktif kode billing PNBP SIMPONI
  TASHIH_DEFAULT_DAYS: 30,          // Langkah 8 SOP: Standar masa sidang pentashihan mushaf
};

/**
 * Laporan Kinerja dan Analitik Modul Verifikasi (VER-I06)
 * Otoritas: SUPERADMIN, ADMIN, KEPALA_LPMQ, VERIFIKATOR
 */
export const getVerificationPerformanceReport = async (filters = {}, user) => {
  requireRole(user, ['SUPERADMIN', 'ADMIN', 'KEPALA_LPMQ', 'VERIFIKATOR']);

  const now = new Date();

  // 1. Total Registrasi & Distribusi Status
  const [allRegistrations, assignments, payments, handovers] = await Promise.all([
    prisma.registration.findMany({
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    prisma.verificationAssignment.findMany({
      select: {
        id: true,
        status: true,
        decision: true,
        assigned_at: true,
        started_at: true,
        due_at: true,
        completed_at: true,
      },
    }),
    prisma.paymentRecord.findMany({
      select: {
        id: true,
        status: true,
        amount: true,
        created_at: true,
        expires_at: true,
        paid_at: true,
        verified_at: true,
      },
    }),
    prisma.physicalManuscriptHandover.findMany({
      select: {
        id: true,
        status: true,
        handed_over_at: true,
        received_at: true,
        tashih_due_at: true,
      },
    }),
  ]);

  // Status breakdown map
  const statusDistribution = {};
  allRegistrations.forEach((r) => {
    statusDistribution[r.status] = (statusDistribution[r.status] || 0) + 1;
  });

  const inVerificationStatuses = [
    'READY_FOR_VERIFICATION',
    'VERIFICATION_ASSIGNED',
    'IN_VERIFICATION',
    'WAITING_VERIFICATION_APPROVAL',
    'VERIFICATION_APPROVED',
  ];

  const totalInVerification = allRegistrations.filter((r) =>
    inVerificationStatuses.includes(r.status)
  ).length;

  const totalPassed = assignments.filter((a) => a.decision === 'PASSED').length;
  const totalRevision = assignments.filter((a) => a.decision === 'REVISION_REQUIRED').length;

  // 2. Durasi rata-rata verifikasi (jam)
  const completedAssignments = assignments.filter(
    (a) => a.status === 'COMPLETED' && a.started_at && a.completed_at
  );

  let totalDurationMs = 0;
  completedAssignments.forEach((a) => {
    totalDurationMs += new Date(a.completed_at).getTime() - new Date(a.started_at).getTime();
  });

  const avgDurationHours =
    completedAssignments.length > 0
      ? Number((totalDurationMs / (completedAssignments.length * 3600000)).toFixed(1))
      : 0;

  // 3. Metrik SLA Overdue (VER-I03)
  const overdueAssignments = assignments.filter((a) => {
    if (a.status === 'COMPLETED') return false;
    if (!a.due_at) return false;
    return new Date(a.due_at).getTime() < now.getTime();
  }).length;

  const overduePayments = payments.filter((p) => {
    if (p.status === 'VERIFIED' || p.status === 'PAID') return false;
    if (!p.expires_at) return false;
    return new Date(p.expires_at).getTime() < now.getTime();
  }).length;

  const totalOverdue = overdueAssignments + overduePayments;

  // 4. Rekapitulasi PNBP
  let totalBilled = 0;
  let totalVerified = 0;
  let totalUnpaid = 0;
  let verifiedCount = 0;
  let paidPendingCount = 0;
  let unpaidCount = 0;

  payments.forEach((p) => {
    const amt = Number(p.amount) || 0;
    totalBilled += amt;
    if (p.status === 'VERIFIED') {
      totalVerified += amt;
      verifiedCount++;
    } else if (p.status === 'PAID') {
      paidPendingCount++;
    } else if (p.status === 'UNPAID') {
      totalUnpaid += amt;
      unpaidCount++;
    }
  });

  // 5. Serah-terima fisik metrics
  const completedHandovers = handovers.filter(
    (h) => h.status === 'RECEIVED' && h.handed_over_at && h.received_at
  );

  let totalHandoverDurationMs = 0;
  completedHandovers.forEach((h) => {
    totalHandoverDurationMs +=
      new Date(h.received_at).getTime() - new Date(h.handed_over_at).getTime();
  });

  const avgHandoverDurationHours =
    completedHandovers.length > 0
      ? Number((totalHandoverDurationMs / (completedHandovers.length * 3600000)).toFixed(1))
      : 0;

  // Compliance percentage
  const totalCheckedAssignments = assignments.length;
  const onTimeAssignments = totalCheckedAssignments - overdueAssignments;
  const complianceRate =
    totalCheckedAssignments > 0
      ? Number(((onTimeAssignments / totalCheckedAssignments) * 100).toFixed(1))
      : 100;

  return {
    generated_at: now.toISOString(),
    sla_config: SLA_CONFIG,
    summary: {
      total_registrations: allRegistrations.length,
      total_in_verification: totalInVerification,
      total_passed: totalPassed,
      total_revision: totalRevision,
      total_overdue: totalOverdue,
      overdue_assignments: overdueAssignments,
      overdue_payments: overduePayments,
      avg_duration_hours: avgDurationHours,
      compliance_rate_percent: complianceRate,
    },
    status_distribution: statusDistribution,
    payments: {
      total_billed_amount: totalBilled,
      total_verified_amount: totalVerified,
      total_unpaid_amount: totalUnpaid,
      verified_count: verifiedCount,
      paid_pending_count: paidPendingCount,
      unpaid_count: unpaidCount,
    },
    handovers: {
      total_handovers: handovers.length,
      received_count: completedHandovers.length,
      pending_count: handovers.filter((h) => h.status === 'PENDING').length,
      returned_count: handovers.filter((h) => h.status === 'RETURNED').length,
      avg_handover_hours: avgHandoverDurationHours,
    },
  };
};

/**
 * Timeline Naskah Lintas Peran (VER-I05)
 * Menyajikan riwayat status yang disanitasi:
 * - Penerbit tidak melihat catatan internal rahasia atau identitas petugas telaah.
 * - Internal (SUPERADMIN, ADMIN, VERIFIKATOR, dll) melihat detail komprehensif.
 */
export const getRegistrationTimeline = async (registrationId, user) => {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      publisher: { select: { id: true, legal_name: true } },
      status_histories: {
        orderBy: { changed_at: 'asc' },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!reg) {
    fail(404, 'Pengajuan tidak ditemukan.');
  }

  const isSuperadmin = user.roles.includes('SUPERADMIN');
  const isPublisher = user.roles.includes('ADMIN_PENERBIT') && !isSuperadmin;

  if (isPublisher && reg.publisher_id !== user.publisherId) {
    fail(403, 'Akses ditolak. Pengajuan bukan milik penerbit Anda.');
  }

  // Sanitasi catatan untuk perspektif penerbit (VER-I05)
  const timeline = reg.status_histories.map((h) => {
    if (isPublisher) {
      return {
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        changed_at: h.changed_at,
        // Penerbit hanya melihat deskripsi umum, tanpa memo internal tim
        notes: sanitizeNotesForPublisher(h.to_status, h.notes),
        actor_display: 'Petugas LPMQ',
      };
    }

    // Tampilan internal lengkap
    return {
      id: h.id,
      from_status: h.from_status,
      to_status: h.to_status,
      changed_at: h.changed_at,
      notes: h.notes,
      actor: h.actor
        ? {
            id: h.actor.id,
            name: h.actor.name,
            email: h.actor.email,
          }
        : null,
    };
  });

  return {
    registration_id: reg.id,
    registration_no: reg.registration_no,
    current_status: reg.status,
    is_sanitized: isPublisher,
    timeline,
  };
};

function sanitizeNotesForPublisher(status, rawNotes) {
  if (!rawNotes) return null;
  // Jika status transisi ke REVISION_REQUIRED, penerbit perlu arahan perbaikan
  if (status === 'REVISION_REQUIRED') {
    return rawNotes;
  }
  // Sembunyikan catatan teknis internal dari penerbit
  if (
    rawNotes.includes('[Internal]') ||
    rawNotes.includes('Nota Dinas') ||
    rawNotes.includes('RAHASIA INTERNAL')
  ) {
    return 'Tahapan verifikasi berkas dan naskah master telah selesai diproses oleh tim teknis LPMQ.';
  }
  return rawNotes;
}
