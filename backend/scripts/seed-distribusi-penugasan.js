// Dev saja: satu naskah "Menunggu Penugasan" (WAITING_DISTRIBUTION) di tab Penugasan Distributor untuk mencoba "Mulai Penugasan".
// Tim inti, berkas, dan item layanan disalin dari REG-202611-0002. Aman diulang: REG-PENUGASAN-UJI-0001 lama dihapus lalu dibuat ulang.
// Pakai: node scripts/seed-distribusi-penugasan.js
import 'dotenv/config';
import { prisma } from '../src/config/database.js';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const REG_NO = 'REG-PENUGASAN-UJI-0001';
const src = await prisma.registration.findUnique({
  where: { registration_no: 'REG-202611-0002' },
  include: { manuscripts: { include: { items: true, variants: true } }, manuscript_files: true },
});
if (!src?.core_distributor_id || !src.core_team_number) throw new Error('Butuh REG-202611-0002 dengan tim inti (distributor) sebagai sumber.');

const old = await prisma.registration.findUnique({ where: { registration_no: REG_NO } });
if (old) {
  const id = old.id;
  await prisma.approvalParaf.deleteMany({ where: { subject_type: 'DISTRIBUTOR_REVIEW', subject_id: id } });
  await prisma.physicalManuscriptHandover.deleteMany({ where: { registration_id: id } });
  await prisma.verificationAssignment.deleteMany({ where: { registration_id: id } });
  await prisma.paymentRecord.deleteMany({ where: { registration_id: id } });
  await prisma.physicalMasterIntake.deleteMany({ where: { registration_id: id } });
  await prisma.manuscriptVariant.deleteMany({ where: { manuscript: { registration_id: id } } });
  await prisma.manuscriptItem.deleteMany({ where: { manuscript: { registration_id: id } } });
  await prisma.manuscriptFile.deleteMany({ where: { registration_id: id } });
  await prisma.manuscript.deleteMany({ where: { registration_id: id } });
  await prisma.notification.deleteMany({ where: { registration_id: id } });
  await prisma.statusHistory.deleteMany({ where: { registration_id: id } });
  await prisma.registration.delete({ where: { id } });
}

const now = new Date();
const title = "Mushaf Al-Qur'an Uji Penugasan Sidang";
const reg = await prisma.registration.create({ data: {
  registration_no: REG_NO, title, status: 'WAITING_DISTRIBUTION', stage_entered_at: now,
  publisher_id: src.publisher_id, service_type_id: src.service_type_id,
  submission_source: src.submission_source, registration_type: src.registration_type, registration_category: src.registration_category,
  statement_accepted: true, foreign_metadata: { ...src.foreign_metadata, nama_mushaf: title, nama_produk: title },
  fee_sla_snapshot: src.fee_sla_snapshot,
  core_team_number: src.core_team_number, core_team_version: src.core_team_version,
  core_verifier_id: src.core_verifier_id, core_distributor_id: src.core_distributor_id, core_documenter_id: src.core_documenter_id,
} });

for (const m of src.manuscripts) {
  const ms = await prisma.manuscript.create({ data: { registration_id: reg.id, seq_number: m.seq_number, title } });
  for (const it of m.items) {
    await prisma.manuscriptItem.create({ data: {
      manuscript_id: ms.id, item_id: it.item_id, role: it.role, fee_snapshot: it.fee_snapshot,
      initial_days_snapshot: it.initial_days_snapshot, revision_days_snapshot: it.revision_days_snapshot, dummy_days_snapshot: it.dummy_days_snapshot,
    } });
  }
  for (const v of m.variants) await prisma.manuscriptVariant.create({ data: { manuscript_id: ms.id, ukuran: v.ukuran, oplah: v.oplah } });
  for (const f of src.manuscript_files.filter(file => file.version === 1)) {
    await prisma.manuscriptFile.create({ data: {
      registration_id: reg.id, manuscript_id: f.manuscript_id ? ms.id : null, file_id: f.file_id, type: f.type,
      mime_type: f.mime_type, file_size: f.file_size, checksum: f.checksum, version: 1,
    } });
  }
}

await prisma.paymentRecord.create({ data: {
  registration_id: reg.id, billing_no: 'SIMPONI-PENUGASAN-UJI-0001', amount: src.fee_sla_snapshot?.total_fee || 1500000,
  status: 'VERIFIED', provider: 'SIMPONI', paid_at: now, verified_at: now,
} });
await prisma.verificationAssignment.create({ data: {
  registration_id: reg.id, verifier_id: src.core_verifier_id, status: 'COMPLETED', decision: 'PASSED', assigned_at: now, started_at: now,
} });
await prisma.physicalMasterIntake.create({ data: {
  registration_id: reg.id, format: 'A4', binding_method: 'PER_JUZ', volume_count: 30, condition: 'BAIK',
  receipt_no: 'TT-LPMQ-PENUGASAN-UJI-0001', received_at: now, status: 'RECEIVED',
} });
await prisma.physicalManuscriptHandover.create({ data: {
  registration_id: reg.id, from_user_id: src.core_verifier_id, to_user_id: src.core_distributor_id,
  stage: 'VERIFICATION_TO_DISTRIBUTION', receipt_no: 'BAST-VER-DIST-PENUGASAN-UJI-0001', condition: 'BAIK', volume_count: 30,
  handed_over_at: now, received_at: now, tashih_due_at: new Date(now.getTime() + 14 * 864e5), status: 'RECEIVED',
} });

const distributor = await prisma.user.findUnique({ where: { id: src.core_distributor_id }, select: { name: true, email: true } });
console.log(`Siap diuji: ${REG_NO} (Tim ${src.core_team_number})`);
console.log(`Login distributor: ${distributor.name} <${distributor.email}>`);
console.log('Buka: /internal/distributions/assignment -> tab 2 -> "Mulai Penugasan"');
await prisma.$disconnect();
