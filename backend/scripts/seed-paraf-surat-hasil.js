// Dev saja: beberapa pengajuan dengan Surat Hasil Verifikasi (lolos) + Berita Acara yang sudah ditandatangani
// Verifikator dan menunggu paraf kedua Pemaraf, lalu pengesahan Kepala LPMQ. Cocok untuk mencoba Antrean Paraf
// (centang beberapa lalu paraf sekaligus).
// Aman diulang: data REG-PARAF-UJI-000N lama dihapus lalu dibuat ulang (paraf ikut direset).
// Pakai: node scripts/seed-paraf-surat-hasil.js [jumlah] [email-pemaraf-1] [email-pemaraf-2]   (bawaan 5)
import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { computeDocumentHash } from '../src/services/verification-signing.service.js';
import { openParafRequest } from '../src/services/paraf.service.js';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const COUNT = Math.min(Math.max(Number(process.argv[2]) || 5, 1), 20);
const TITLES = [
  "Mushaf Al-Qur'an Uji Paraf Rasm Usmani",
  "Mushaf Al-Qur'an Terjemah Uji Paraf",
  "Juz Amma Uji Paraf Edisi Santri",
  "Mushaf Al-Qur'an Tajwid Warna Uji Paraf",
  "Mushaf Al-Qur'an Saku Uji Paraf",
];

const verifier = await prisma.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { code: 'VERIFIKATOR' } } } } });
const publishers = await prisma.publisher.findMany({ take: 5 });
const serviceType = await prisma.serviceType.findFirst({ where: { status: 'ACTIVE' } });
if (!verifier || !publishers.length || !serviceType) throw new Error('Butuh akun Verifikator, Penerbit, dan Jenis Layanan aktif. Jalankan seed utama dulu.');

// Verifikator menunjuk 2 Pemaraf: email dari argumen ke-2 & ke-3 bila diisi, selain itu 2 Pemaraf aktif pertama (urut nama).
const pemarafEmails = process.argv.slice(3, 5);
const designated = await prisma.user.findMany({
  where: { status: 'ACTIVE', roles: { some: { role: { code: 'PEMARAF' } } }, ...(pemarafEmails.length ? { email: { in: pemarafEmails } } : {}) },
  select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 2,
});
if (designated.length !== 2) throw new Error('Butuh minimal 2 akun Pemaraf aktif.');

for (let n = 1; n <= COUNT; n += 1) {
  const suffix = String(n).padStart(4, '0');
  const REG_NO = `REG-PARAF-UJI-${suffix}`;
  const BILLING = `SIMPONI-PARAF-UJI-${suffix}`;

  const old = await prisma.registration.findUnique({ where: { registration_no: REG_NO }, include: { verification_assignments: true } });
  if (old) {
    const docs = await prisma.verificationDocument.findMany({ where: { registration_id: old.id }, select: { id: true } });
    await prisma.approvalParaf.deleteMany({ where: { subject_type: 'VERIFICATION_RESULT', subject_id: { in: old.verification_assignments.map(a => a.id) } } });
    await prisma.verificationDocumentSignatory.deleteMany({ where: { document_id: { in: docs.map(d => d.id) } } });
    await prisma.verificationDocument.deleteMany({ where: { registration_id: old.id } });
    await prisma.verificationAssignment.deleteMany({ where: { registration_id: old.id } });
    await prisma.paymentRecord.deleteMany({ where: { registration_id: old.id } });
    await prisma.notification.deleteMany({ where: { registration_id: old.id } });
    await prisma.registration.delete({ where: { id: old.id } });
  }

  // Tanggal mundur per dokumen agar urutan "terlama di atas" dan penanda lama menunggu terlihat.
  const now = new Date(Date.now() - (COUNT - n) * 864e5);
  const reg = await prisma.registration.create({ data: {
    registration_no: REG_NO,
    publisher_id: publishers[(n - 1) % publishers.length].id,
    service_type_id: serviceType.id,
    title: TITLES[(n - 1) % TITLES.length],
    status: 'WAITING_VERIFICATION_APPROVAL',
    submission_source: 'PUBLISHER_PORTAL',
    registration_type: 'NEW',
    statement_accepted: true,
    core_verifier_id: verifier.id,
    stage_entered_at: now,
    fee_sla_snapshot: { service_name: serviceType.name, total_fee: 1000000 },
  } });
  await prisma.paymentRecord.create({ data: {
    registration_id: reg.id, billing_no: BILLING, amount: 1000000, status: 'UNPAID', provider: 'SIMPONI',
    expires_at: new Date(now.getTime() + 7 * 864e5),
  } });
  const assignment = await prisma.verificationAssignment.create({ data: {
    registration_id: reg.id, verifier_id: verifier.id, status: 'WAITING_APPROVAL', assigned_at: now, decision: 'PASSED',
  } });

  const snapshot = { decision: 'PASSED', billing_no: BILLING, notes: 'Berkas dan naskah memenuhi syarat verifikasi (data uji paraf).' };
  for (const document_type of ['SURAT_HASIL_VERIFIKASI', 'BERITA_ACARA_VERIFIKASI']) {
    const doc = await prisma.verificationDocument.create({ data: {
      registration_id: reg.id, assignment_id: assignment.id, document_type, status: 'SUBMITTED',
      created_by_id: verifier.id, content_snapshot: snapshot,
    } });
    await prisma.verificationDocumentSignatory.create({ data: {
      document_id: doc.id, signer_user_id: verifier.id, name_position_snapshot: `${verifier.name} (Verifikator)`,
      sign_order: 1, status: 'SIGNED', signed_at: now, document_hash: computeDocumentHash(doc),
    } });
  }

  await prisma.$transaction(async tx => {
    await openParafRequest(tx, 'VERIFICATION_RESULT', assignment.id, designated, {
      requested_by_id: verifier.id,
      notify: { registration_id: reg.id, title: `Surat hasil verifikasi menunggu paraf Anda: ${REG_NO}`, payload: { link: `/internal/verifications/${assignment.id}` } },
    });
    // created_at mengikuti tanggal pengajuan agar Antrean Paraf terurut sesuai skenario.
    await tx.approvalParaf.update({ where: { subject_type_subject_id: { subject_type: 'VERIFICATION_RESULT', subject_id: assignment.id } }, data: { created_at: now } });
  });
  console.log(`Siap diuji: ${REG_NO}  ->  /internal/verifications/${assignment.id}`);
}

console.log(`Pemaraf ditunjuk: ${designated.map(d => d.name).join(' & ')}. Buka /internal/paraf, centang beberapa, lalu "Paraf Sekarang".`);
console.log('Setelah kedua Pemaraf memaraf, Kepala LPMQ "Setujui & Sahkan".');
await prisma.$disconnect();
