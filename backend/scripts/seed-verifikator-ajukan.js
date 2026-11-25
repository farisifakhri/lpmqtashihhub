// Dev saja: satu naskah di meja Verifikator (IN_VERIFICATION, penugasan IN_PROGRESS) untuk dicoba diajukan ke Kepala,
// sehingga dialog "Tunjuk Pemaraf" bisa dilihat. Aman diulang: naskah REG-AJUKAN-UJI-0001 lama dihapus lalu dibuat ulang.
// Pakai: node scripts/seed-verifikator-ajukan.js
import 'dotenv/config';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { prisma } from '../src/config/database.js';
import { upload } from '../src/services/storage.service.js';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const REG_NO = 'REG-AJUKAN-UJI-0001';
const verifier = await prisma.user.findUnique({ where: { email: 'verifikator@lpmq.kemenag.go.id' } });
const publisher = await prisma.publisher.findFirst({ where: { user_id: { not: null } } });
const serviceType = await prisma.serviceType.findFirst({ where: { status: 'ACTIVE' } });
const item = await prisma.jenisNaskahItem.findFirst({ where: { role: 'DASAR', status: 'ACTIVE' } });
if (!verifier || !publisher || !serviceType) throw new Error('Butuh verifikator@lpmq.kemenag.go.id, Penerbit, dan Jenis Layanan. Jalankan seed utama dulu.');

const old = await prisma.registration.findUnique({ where: { registration_no: REG_NO } });
if (old) {
  const id = old.id;
  const docs = await prisma.verificationDocument.findMany({ where: { registration_id: id }, select: { id: true, assignment_id: true } });
  await prisma.approvalParaf.deleteMany({ where: { subject_type: 'VERIFICATION_RESULT', subject_id: { in: docs.map(d => d.assignment_id).filter(Boolean) } } });
  await prisma.verificationDocumentSignatory.deleteMany({ where: { document_id: { in: docs.map(d => d.id) } } });
  await prisma.verificationDocument.deleteMany({ where: { registration_id: id } });
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

const pdf = async (text) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([595, 842]).drawText(text, { x: 50, y: 780, size: 14, font });
  return upload(Buffer.from(await doc.save()), 'application/pdf', publisher.user_id ? { id: publisher.user_id } : verifier);
};

const now = new Date();
const title = "Mushaf Al-Qur'an Uji Pengajuan (Pilih Pemaraf)";
const reg = await prisma.registration.create({ data: {
  registration_no: REG_NO, publisher_id: publisher.id, service_type_id: serviceType.id, title,
  status: 'IN_VERIFICATION', submission_source: 'PUBLISHER_PORTAL', registration_type: 'NEW', statement_accepted: true,
  core_verifier_id: verifier.id, stage_entered_at: now,
  fee_sla_snapshot: { service_name: serviceType.name, total_fee: 1000000, sla_initial_days: serviceType.duration_initial || 15, sla_revision_days: serviceType.duration_revision || 7, sla_dummy_days: serviceType.duration_dummy || 3 },
} });
const ms = await prisma.manuscript.create({ data: { registration_id: reg.id, seq_number: 1, title } });
if (item) {
  await prisma.manuscriptItem.create({ data: {
    manuscript_id: ms.id, item_id: item.id, role: item.role, fee_snapshot: item.fee_per_unit,
    initial_days_snapshot: item.duration_initial, revision_days_snapshot: item.duration_revision, dummy_days_snapshot: item.duration_dummy,
  } });
}
await prisma.manuscriptVariant.create({ data: { manuscript_id: ms.id, ukuran: '21,0 x 29,7', oplah: 3000 } });
for (const [type, text] of [['SAMPLE_PAGE_1_5', `Sampel Naskah: ${title}`], ['COVER', `Cover: ${title}`]]) {
  const file = await pdf(text);
  await prisma.manuscriptFile.create({ data: {
    registration_id: reg.id, manuscript_id: ms.id, file_id: file.id, type, mime_type: 'application/pdf',
    file_size: file.file_size, checksum: file.checksum, version: 1,
  } });
}
await prisma.physicalMasterIntake.create({ data: {
  registration_id: reg.id, format: 'A4', volume_count: 30, binding_method: 'JILID_LEPAS', condition: 'BAIK',
  receipt_no: 'TT-LPMQ-AJUKAN-UJI-0001', received_at: now, status: 'RECEIVED',
} });
const assignment = await prisma.verificationAssignment.create({ data: {
  registration_id: reg.id, verifier_id: verifier.id, status: 'IN_PROGRESS', assigned_at: now, started_at: now,
  due_at: new Date(now.getTime() + 2 * 864e5), notes: 'Naskah uji: isi checklist lalu ajukan ke Kepala LPMQ.',
} });

console.log(`Siap diuji: ${REG_NO} (login verifikator@lpmq.kemenag.go.id / password123)`);
console.log(`Buka: /internal/verifications/${assignment.id}`);
await prisma.$disconnect();
