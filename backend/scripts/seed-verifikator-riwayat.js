// Dev saja: akun Verifikator uji + 6 pengajuan di tiap tahap setelah surat hasil disahkan, untuk mencoba tab
// "Riwayat" (lacak berkas) dan "Siap BAST": disahkan belum dikirim -> menunggu bayar -> bukti bayar masuk ->
// lunas (Siap BAST) -> BAST menunggu diterima distributor -> diterima distributor.
// Aman diulang: data REG-RIWAYAT-UJI-000N lama dihapus lalu dibuat ulang; password akun yang sudah ada tidak diubah.
// Pakai: node scripts/seed-verifikator-riwayat.js
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { prisma } from '../src/config/database.js';
import { calculateDueAt } from '../src/services/sla.service.js';

const STORAGE = fileURLToPath(new URL('../storage/private/', import.meta.url));

// Slip setoran PDF yang "diunggah" penerbit (pemilik berkas = akun penerbit), seperti alur konfirmasi bayar asli.
async function createReceipt(ownerId, { billing, ntpn, publisher, paidAt }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 300]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText('BUKTI SETOR PNBP (DATA UJI)', { x: 30, y: 255, size: 14, font: bold });
  [
    `Kode Billing : ${billing}`,
    `NTPN         : ${ntpn}`,
    `Penyetor     : ${publisher}`,
    'Nominal      : Rp 1.000.000',
    `Waktu Setor  : ${paidAt.toLocaleString('id-ID')}`,
    'Bank Persepsi: Bank Uji (dummy)',
  ].forEach((line, n) => page.drawText(line, { x: 30, y: 215 - n * 22, size: 11, font }));
  const bytes = Buffer.from(await pdf.save());
  const id = randomUUID();
  await mkdir(STORAGE, { recursive: true });
  await writeFile(`${STORAGE}${id}`, bytes);
  await prisma.storedFile.create({ data: {
    id, owner_id: ownerId, mime_type: 'application/pdf', file_size: bytes.length,
    checksum: createHash('sha256').update(bytes).digest('hex'),
  } });
  return id;
}

if (process.env.NODE_ENV === 'production') throw new Error('Skrip data contoh tidak boleh dijalankan di production.');

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'password123';
const EMAIL = 'verifikator.uji@lpmq.kemenag.go.id';

// Tahap tiap pengajuan: status penugasan, status registrasi, status bayar, status BAST, sudah dikirim?
const STAGES = [
  { title: 'Disahkan, Belum Dikirim', assignment: 'READY_TO_SEND', reg: 'VERIFICATION_APPROVED', pay: 'UNPAID', sent: false },
  { title: 'Menunggu Pembayaran', assignment: 'COMPLETED', reg: 'AWAITING_PAYMENT', pay: 'UNPAID', sent: true },
  { title: 'Bukti Bayar Masuk', assignment: 'COMPLETED', reg: 'PAYMENT_VERIFICATION', pay: 'PAID', sent: true },
  { title: 'Lunas Siap BAST', assignment: 'COMPLETED', reg: 'PAYMENT_VERIFICATION', pay: 'VERIFIED', sent: true },
  { title: 'BAST Menunggu Distributor', assignment: 'COMPLETED', reg: 'WAITING_DISTRIBUTOR_RECEIPT', pay: 'VERIFIED', sent: true, bast: 'PENDING' },
  { title: 'Diterima Distributor', assignment: 'COMPLETED', reg: 'WAITING_DISTRIBUTION', pay: 'VERIFIED', sent: true, bast: 'RECEIVED' },
];

const roleOf = code => prisma.role.findUnique({ where: { code } });
const activeWithRole = (code, email) => prisma.user.findFirst({
  where: { status: 'ACTIVE', roles: { some: { role: { code } } } },
  orderBy: email ? undefined : { name: 'asc' },
}).then(async fallback => (email && await prisma.user.findFirst({ where: { email, status: 'ACTIVE' } })) || fallback);

const verifierRole = await roleOf('VERIFIKATOR');
const head = await activeWithRole('KEPALA_LPMQ', 'kepala@lpmq.kemenag.go.id');
const distributor = await activeWithRole('DISTRIBUTOR', 'distributor@lpmq.kemenag.go.id');
const publishers = await prisma.publisher.findMany({ take: 3 });
const serviceType = await prisma.serviceType.findFirst({ where: { status: 'ACTIVE' } });
const pemaraf = await prisma.user.findMany({
  where: { status: 'ACTIVE', roles: { some: { role: { code: 'PEMARAF' } } } }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 2,
});
if (!verifierRole || !head || !distributor || !publishers.length || !serviceType) {
  throw new Error('Butuh role Verifikator, akun Kepala LPMQ, Distributor, Penerbit, dan Jenis Layanan aktif. Jalankan seed utama dulu.');
}

const SLA_SNAPSHOT = {
  service_name: serviceType.name, total_fee: 1000000,
  sla_initial_days: serviceType.duration_initial || 15,
  sla_revision_days: serviceType.duration_revision || 7,
  sla_dummy_days: serviceType.duration_dummy || 3,
};

const verifier = await prisma.user.upsert({
  where: { email: EMAIL },
  update: { status: 'ACTIVE' },
  create: { name: 'Verifikator Uji Riwayat', email: EMAIL, password_hash: await bcrypt.hash(PASSWORD, 10), status: 'ACTIVE' },
});
await prisma.userRole.upsert({
  where: { user_id_role_id: { user_id: verifier.id, role_id: verifierRole.id } },
  update: {},
  create: { user_id: verifier.id, role_id: verifierRole.id },
});

for (const [i, stage] of STAGES.entries()) {
  const suffix = String(i + 1).padStart(4, '0');
  const REG_NO = `REG-RIWAYAT-UJI-${suffix}`;

  const old = await prisma.registration.findUnique({ where: { registration_no: REG_NO }, include: { verification_assignments: true } });
  if (old) {
    const docs = await prisma.verificationDocument.findMany({ where: { registration_id: old.id }, select: { id: true } });
    await prisma.approvalParaf.deleteMany({ where: { subject_type: 'VERIFICATION_RESULT', subject_id: { in: old.verification_assignments.map(a => a.id) } } });
    await prisma.verificationDocumentSignatory.deleteMany({ where: { document_id: { in: docs.map(d => d.id) } } });
    await prisma.verificationDocument.deleteMany({ where: { registration_id: old.id } });
    await prisma.verificationAssignment.deleteMany({ where: { registration_id: old.id } });
    await prisma.physicalManuscriptHandover.deleteMany({ where: { registration_id: old.id } });
    const receipts = (await prisma.paymentRecord.findMany({ where: { registration_id: old.id }, select: { receipt_file_id: true } }))
      .map(p => p.receipt_file_id).filter(Boolean);
    await prisma.paymentRecord.deleteMany({ where: { registration_id: old.id } });
    await prisma.storedFile.deleteMany({ where: { id: { in: receipts } } });
    await Promise.all(receipts.map(id => unlink(`${STORAGE}${id}`).catch(() => {})));
    await prisma.notification.deleteMany({ where: { registration_id: old.id } });
    await prisma.registration.delete({ where: { id: old.id } });
  }

  // Garis waktu mundur: diajukan H-10, paraf H-9/H-8, disahkan H-7, dikirim H-6, bayar H-4, lunas H-3, BAST H-2, diterima H-1.
  const day = d => new Date(Date.now() - d * 864e5 - (STAGES.length - i) * 36e5);
  const reg = await prisma.registration.create({ data: {
    registration_no: REG_NO,
    publisher_id: publishers[i % publishers.length].id,
    service_type_id: serviceType.id,
    title: `Mushaf Al-Qur'an Uji Riwayat (${stage.title})`,
    status: stage.reg,
    submission_source: 'PUBLISHER_PORTAL',
    registration_type: 'NEW',
    statement_accepted: true,
    core_verifier_id: verifier.id,
    core_distributor_id: distributor.id,
    stage_entered_at: day(stage.bast === 'RECEIVED' ? 1 : stage.bast ? 2 : stage.pay === 'VERIFIED' ? 3 : stage.pay === 'PAID' ? 4 : stage.sent ? 6 : 7),
    // Durasi SLA wajib ada: dipakai menghitung tenggat tashih saat distributor menerima master fisik.
    fee_sla_snapshot: SLA_SNAPSHOT,
  } });
  const BILLING = `SIMPONI-RIWAYAT-UJI-${suffix}`;
  const publisher = publishers[i % publishers.length];
  const paid = stage.pay !== 'UNPAID';
  await prisma.paymentRecord.create({ data: {
    registration_id: reg.id, billing_no: BILLING, amount: 1000000, status: stage.pay, provider: 'SIMPONI',
    expires_at: day(-7),
    paid_at: paid ? day(4) : null,
    external_ref: paid ? `NTPN-UJI-${suffix}` : null,
    receipt_file_id: paid ? await createReceipt(publisher.user_id || verifier.id, {
      billing: BILLING, ntpn: `NTPN-UJI-${suffix}`, publisher: publisher.legal_name, paidAt: day(4),
    }) : null,
    verified_at: stage.pay === 'VERIFIED' ? day(3) : null,
  } });
  const assignment = await prisma.verificationAssignment.create({ data: {
    registration_id: reg.id, verifier_id: verifier.id, status: stage.assignment, decision: 'PASSED',
    assigned_at: day(12), started_at: day(11), review_submitted_at: day(10),
    completed_at: stage.sent ? day(6) : null, result_sent_at: stage.sent ? day(6) : null,
  } });

  const snapshot = { decision: 'PASSED', billing_no: BILLING, notes: 'Berkas dan naskah memenuhi syarat verifikasi (data uji riwayat).' };
  for (const [document_type, prefix] of [['SURAT_HASIL_VERIFIKASI', 'B'], ['BERITA_ACARA_VERIFIKASI', 'BA']]) {
    const doc = await prisma.verificationDocument.create({ data: {
      registration_id: reg.id, assignment_id: assignment.id, document_type, created_by_id: verifier.id, content_snapshot: snapshot,
      document_no: `${prefix}-RIWAYAT-UJI-${suffix}/LPMQ/2026`,
      status: stage.sent ? 'SENT' : 'SIGNED', signature_status: 'SIGNED', signed_at: day(7),
      approved_by_id: head.id, approved_at: day(7),
      sent_at: stage.sent ? day(6) : null, sent_channel: stage.sent ? 'EMAIL' : null,
    } });
    await prisma.verificationDocumentSignatory.create({ data: {
      document_id: doc.id, signer_user_id: verifier.id, name_position_snapshot: `${verifier.name} (Verifikator)`,
      sign_order: 1, status: 'SIGNED', signed_at: day(10),
    } });
  }

  if (pemaraf.length === 2) {
    await prisma.approvalParaf.create({ data: {
      subject_type: 'VERIFICATION_RESULT', subject_id: assignment.id, requested_by_id: verifier.id, required_count: 2,
      assigned_ids: pemaraf.map(p => p.id), pemaraf_id: pemaraf[1].id,
      signers: pemaraf.map((p, n) => ({ id: p.id, name: p.name, signed_at: day(9 - n).toISOString() })),
      signed_at: day(8), created_at: day(10),
    } });
  }

  if (stage.bast) {
    await prisma.physicalManuscriptHandover.create({ data: {
      registration_id: reg.id, from_user_id: verifier.id, to_user_id: distributor.id,
      receipt_no: `BAST-VER-DIST-RIWAYATUJI${suffix}`, condition: 'BAIK', volume_count: 30,
      handed_over_at: day(2), status: stage.bast,
      received_at: stage.bast === 'RECEIVED' ? day(1) : null,
      // Sama seperti penerimaan asli: tenggat tashih dihitung dari SLA perdana dengan kalender hari kerja.
      tashih_due_at: stage.bast === 'RECEIVED' ? await calculateDueAt(prisma, day(1), SLA_SNAPSHOT.sla_initial_days, { applyCutoff: true }) : null,
    } });
  }
  console.log(`${REG_NO}  [${stage.title}]  ->  /internal/verifications/${assignment.id}`);
}

console.log(`\nLogin Verifikator uji: ${EMAIL} / ${PASSWORD}${pemaraf.length === 2 ? '' : '  (paraf dilewati: kurang dari 2 akun Pemaraf)'}`);
console.log(`Distributor penerima BAST: ${distributor.name} (${distributor.email})`);
console.log('Buka Tugas Verifikasi Naskah -> tab "Riwayat" (lacak berkas) dan "Siap BAST".');
await prisma.$disconnect();
