import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/config/database.js';

async function main() {
  const isCleanOnly = process.argv.includes('--clean');

  console.log('=== SCRIPT NASKAH SAMPEL PER TAHAPAN ALUR LPMQ ===\n');

  // 1. Bersihkan naskah demo lama (REG-DEMO-*)
  const existingDemoRegs = await prisma.registration.findMany({
    where: { registration_no: { startsWith: 'REG-DEMO-' } },
    select: { id: true, registration_no: true },
  });

  if (existingDemoRegs.length > 0) {
    const ids = existingDemoRegs.map((r) => r.id);
    console.log(`Membersihkan ${ids.length} naskah sampel lama...`);

    await prisma.officialDocument.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.paymentRecord.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.physicalManuscriptHandover.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.verificationDocument.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.verificationAssignment.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.physicalMasterIntake.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.assignment.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.manuscriptVariant.deleteMany({ where: { manuscript: { registration_id: { in: ids } } } });
    await prisma.manuscriptItem.deleteMany({ where: { manuscript: { registration_id: { in: ids } } } });
    await prisma.manuscriptFile.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.manuscript.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.notification.deleteMany({ where: { registration_id: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { subject_id: { in: ids } } });
    await prisma.registration.deleteMany({ where: { id: { in: ids } } });

    console.log('✅ Pembersihan naskah sampel lama selesai.\n');
  }

  if (isCleanOnly) {
    console.log('Mode --clean: Berhenti di sini tanpa menambah naskah baru.');
    return;
  }

  // 2. Persiapkan data master & personil
  const publisher = await prisma.publisher.findFirst({
    include: { user: true },
  });
  if (!publisher) {
    throw new Error('Penerbit belum tersedia di database. Jalankan "npm run prisma:seed" terlebih dahulu.');
  }

  const serviceType = await prisma.serviceType.findFirst({
    where: { status: 'ACTIVE' },
  });
  if (!serviceType) {
    throw new Error('Jenis Layanan belum tersedia. Jalankan "npm run prisma:seed" terlebih dahulu.');
  }

  const defaultItem = await prisma.jenisNaskahItem.findFirst({
    where: { role: 'DASAR', status: 'ACTIVE' },
  });

  const verifier = await prisma.user.findFirst({
    where: {
      email: 'verifikator@lpmq.kemenag.go.id',
      status: 'ACTIVE',
    },
  });

  const distributor = await prisma.user.findFirst({
    where: {
      email: 'distributor@lpmq.kemenag.go.id',
      status: 'ACTIVE',
    },
  });

  const adminInternal = await prisma.user.findFirst({
    where: {
      email: 'admin.internal@lpmq.kemenag.go.id',
      status: 'ACTIVE',
    },
  });

  const pentashihGroup = await prisma.distributionTeam.findFirst({
    where: { id: 'kelompok-1', status: 'ACTIVE' },
    include: { members: { include: { user: true } } },
  });

  const now = new Date();

  // Helper untuk membuat Registration + Manuscript + ManuscriptItem
  async function createBaseRegistration({ regNo, title, status, extraReg = {} }) {
    const reg = await prisma.registration.create({
      data: {
        registration_no: regNo,
        publisher_id: publisher.id,
        service_type_id: serviceType.id,
        title,
        status,
        submission_source: 'PUBLISHER_PORTAL',
        registration_type: 'NEW',
        statement_accepted: true,
        core_team_number: 1,
        core_team_version: 1,
        core_verifier_id: verifier?.id,
        core_distributor_id: distributor?.id,
        stage_entered_at: now,
        ...extraReg,
      },
    });

    const ms = await prisma.manuscript.create({
      data: {
        registration_id: reg.id,
        seq_number: 1,
        title,
      },
    });

    if (defaultItem) {
      await prisma.manuscriptItem.create({
        data: {
          manuscript_id: ms.id,
          item_id: defaultItem.id,
          role: defaultItem.role,
          fee_snapshot: defaultItem.fee_per_unit,
          initial_days_snapshot: defaultItem.duration_initial,
          revision_days_snapshot: defaultItem.duration_revision,
          dummy_days_snapshot: defaultItem.duration_dummy,
        },
      });
    }

    await prisma.manuscriptVariant.create({
      data: {
        manuscript_id: ms.id,
        ukuran: '21,0 x 29,7',
        oplah: 3000,
      },
    });

    return { reg, ms };
  }

  console.log('Menambahkan naskah sampel per tahapan alur LPMQ:\n');

  // -------------------------------------------------------------
  // TAHAP 1: DRAFT (Penerbit belum submit)
  // -------------------------------------------------------------
  const t1 = await createBaseRegistration({
    regNo: 'REG-DEMO-01-DRAFT',
    title: "Mushaf Al-Qur'an Standar Indonesia (Tahap 1: Draf Pengajuan)",
    status: 'DRAFT',
    extraReg: { statement_accepted: false },
  });
  console.log(`[1] DRAFT                     : ${t1.reg.registration_no} - Siap dicoba submit oleh Penerbit`);

  // -------------------------------------------------------------
  // TAHAP 2: READY_FOR_VERIFICATION (Intake PENDING di loket)
  // -------------------------------------------------------------
  const t2 = await createBaseRegistration({
    regNo: 'REG-DEMO-02-LOKET',
    title: "Mushaf Al-Qur'an dan Terjemahnya (Tahap 2: Menunggu Loket Fisik)",
    status: 'READY_FOR_VERIFICATION',
  });
  await prisma.physicalMasterIntake.create({
    data: {
      registration_id: t2.reg.id,
      format: 'A4',
      volume_count: 30,
      binding_method: 'JILID_LEPAS',
      status: 'PENDING',
      notes: 'Naskah dikirim via kurir kilat, menunggu tanda terima di loket',
    },
  });
  console.log(`[2] MENUNGGU LOKET            : ${t2.reg.registration_no} - Siap dicoba terima fisik oleh Loket Internal`);

  // -------------------------------------------------------------
  // TAHAP 3: READY_FOR_VERIFICATION (Intake RECEIVED, siap ditugaskan verifikator)
  // -------------------------------------------------------------
  const t3 = await createBaseRegistration({
    regNo: 'REG-DEMO-03-READY',
    title: "Mushaf Al-Qur'an Tajwid Warna (Tahap 3: Siap Ditugaskan Verifikator)",
    status: 'READY_FOR_VERIFICATION',
  });
  await prisma.physicalMasterIntake.create({
    data: {
      registration_id: t3.reg.id,
      format: 'A4',
      volume_count: 30,
      binding_method: 'JILID_LEPAS',
      condition: 'BAIK',
      receipt_no: 'TT-LPMQ-2026-DEMO-03',
      received_at: now,
      status: 'RECEIVED',
      notes: 'Master fisik lengkap 30 juz dan kondisi rapi.',
    },
  });
  console.log(`[3] SIAP DITUGASKAN           : ${t3.reg.registration_no} - Siap dicoba klik "Tugaskan Verifikator"`);

  // -------------------------------------------------------------
  // TAHAP 4: IN_VERIFICATION (Sedang di meja verifikator)
  // -------------------------------------------------------------
  const t4 = await createBaseRegistration({
    regNo: 'REG-DEMO-04-VERIF',
    title: "Mushaf Al-Qur'an Waqaf Ibtida' (Tahap 4: Pemeriksaan di Meja Verifikator)",
    status: 'IN_VERIFICATION',
  });
  await prisma.physicalMasterIntake.create({
    data: {
      registration_id: t4.reg.id,
      format: 'A4',
      volume_count: 30,
      binding_method: 'JILID_LEPAS',
      condition: 'BAIK',
      receipt_no: 'TT-LPMQ-2026-DEMO-04',
      received_at: now,
      status: 'RECEIVED',
    },
  });
  await prisma.verificationAssignment.create({
    data: {
      registration_id: t4.reg.id,
      verifier_id: verifier.id,
      status: 'IN_PROGRESS',
      assigned_at: now,
      due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Silakan periksa kelengkapan fisik dan metadata naskah.',
    },
  });
  console.log(`[4] SEDANG DIVERIFIKASI       : ${t4.reg.registration_no} - Siap dicoba di lembar kerja Verifikator`);

  // -------------------------------------------------------------
  // TAHAP 5: WAITING_VERIFICATION_APPROVAL (Draf menunggu persetujuan Kepala)
  // -------------------------------------------------------------
  const t5 = await createBaseRegistration({
    regNo: 'REG-DEMO-05-APPROVAL',
    title: "Mushaf Al-Qur'an Qiraat Sab'ah (Tahap 5: Menunggu Persetujuan Kepala LPMQ)",
    status: 'WAITING_VERIFICATION_APPROVAL',
  });
  await prisma.physicalMasterIntake.create({
    data: {
      registration_id: t5.reg.id,
      format: 'A4',
      volume_count: 30,
      receipt_no: 'TT-LPMQ-2026-DEMO-05',
      received_at: now,
      status: 'RECEIVED',
    },
  });
  const assign5 = await prisma.verificationAssignment.create({
    data: {
      registration_id: t5.reg.id,
      verifier_id: verifier.id,
      status: 'WAITING_APPROVAL',
      assigned_at: now,
    },
  });
  await prisma.verificationDocument.create({
    data: {
      registration_id: t5.reg.id,
      assignment_id: assign5.id,
      document_type: 'SURAT_HASIL_VERIFIKASI',
      document_no: 'ND-VERIF-DEMO-05',
      status: 'SUBMITTED',
      created_by_id: verifier.id,
      content_snapshot: {
        summary: 'Pemeriksaan berkas dan naskah master fisik telah memenuhi syarat teknis verifikasi.',
        recommendation: 'PROCEED_TO_PAYMENT',
      },
    },
  });
  console.log(`[5] MENUNGGU PERSETUJUAN KEPALA: ${t5.reg.registration_no} - Siap dicoba approve oleh Kepala LPMQ`);

  // -------------------------------------------------------------
  // TAHAP 6: AWAITING_PAYMENT (Tagihan billing PNBP terbit)
  // -------------------------------------------------------------
  const t6 = await createBaseRegistration({
    regNo: 'REG-DEMO-06-BILLING',
    title: "Mushaf Al-Qur'an Transliterasi (Tahap 6: Menunggu Pembayaran Billing PNBP)",
    status: 'AWAITING_PAYMENT',
  });
  await prisma.paymentRecord.create({
    data: {
      registration_id: t6.reg.id,
      billing_no: 'SIMPONI-DEMO-0006',
      amount: 1000000,
      status: 'UNPAID',
      provider: 'SIMPONI',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`[6] MENUNGGU PEMBAYARAN PNBP  : ${t6.reg.registration_no} - Siap dicoba unggah bukti bayar / konfirmasi`);

  // -------------------------------------------------------------
  // TAHAP 7: WAITING_DISTRIBUTOR_RECEIPT (Pembayaran sah, serah terima BAST ke Distributor)
  // -------------------------------------------------------------
  const t7 = await createBaseRegistration({
    regNo: 'REG-DEMO-07-HANDOVER',
    title: "Mushaf Al-Qur'an Terjemah Perkata (Tahap 7: Serah Terima Fisik ke Distributor)",
    status: 'WAITING_DISTRIBUTOR_RECEIPT',
  });
  await prisma.paymentRecord.create({
    data: {
      registration_id: t7.reg.id,
      billing_no: 'SIMPONI-DEMO-0007',
      amount: 1000000,
      status: 'VERIFIED',
      paid_at: now,
      verified_at: now,
    },
  });
  await prisma.physicalManuscriptHandover.create({
    data: {
      registration_id: t7.reg.id,
      from_user_id: adminInternal ? adminInternal.id : verifier.id,
      to_user_id: distributor.id,
      stage: 'ADMIN_TO_DISTRIBUTOR',
      receipt_no: 'BAST-DEMO-0007',
      condition: 'BAIK',
      volume_count: 30,
      handed_over_at: now,
      status: 'PENDING',
      notes: 'Master fisik telah diverifikasi lunas PNBP, diserahkan ke Distributor.',
    },
  });
  console.log(`[7] SERAH TERIMA KE DISTRIBUTOR: ${t7.reg.registration_no} - Siap dicoba terima naskah oleh Distributor`);

  // -------------------------------------------------------------
  // TAHAP 8: TASHIH_IN_PROGRESS (Sedang ditashih kelompok pentashih)
  // -------------------------------------------------------------
  const t8 = await createBaseRegistration({
    regNo: 'REG-DEMO-08-TASHIH',
    title: "Mushaf Al-Qur'an Nusantara 30 Juz (Tahap 8: Sedang Ditashih Pentashih)",
    status: 'TASHIH_IN_PROGRESS',
  });
  const pentashihLeader = pentashihGroup?.members[0]?.user;
  if (pentashihLeader) {
    await prisma.assignment.create({
      data: {
        registration_id: t8.reg.id,
        team_id: 'kelompok-1',
        assignee_id: pentashihLeader.id,
        stage: 'INITIAL',
        iteration: 1,
        status: 'IN_PROGRESS',
        due_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`[8] SEDANG DITASHIH PENTASHIH : ${t8.reg.registration_no} - Siap dicoba telaah juz oleh Pentashih`);

  // -------------------------------------------------------------
  // TAHAP 9: REVISION_REQUIRED (Perlu perbaikan oleh Penerbit)
  // -------------------------------------------------------------
  const t9 = await createBaseRegistration({
    regNo: 'REG-DEMO-09-REVISI',
    title: "Mushaf Al-Qur'an Tafsir Tematik (Tahap 9: Perlu Perbaikan oleh Penerbit)",
    status: 'REVISION_REQUIRED',
    extraReg: { revision_source: 'TASHIH' },
  });
  console.log(`[9] PERLU REVISI PENERBIT     : ${t9.reg.registration_no} - Siap dicoba unduh rekap koreksi & upload revisi`);

  // -------------------------------------------------------------
  // TAHAP 10: COMPLETED (Tanda Tashih Terbit Resmi)
  // -------------------------------------------------------------
  const t10 = await createBaseRegistration({
    regNo: 'REG-DEMO-10-SELESAI',
    title: "Mushaf Al-Qur'an Standar Braille (Tahap 10: Tanda Tashih Terbit Sah)",
    status: 'COMPLETED',
  });
  await prisma.officialDocument.create({
    data: {
      registration_id: t10.reg.id,
      document_type: 'SURAT_TANDA_TASHIH',
      document_no: 'STT/LPMQ/01/2026/DEMO-0010',
      status: 'ISSUED',
      qr_token: `STT-TOKEN-${randomUUID()}`,
      issued_at: now,
      valid_until: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
      content_snapshot: {
        legal_name: publisher.legal_name,
        title: t10.reg.title,
        status: 'SAH',
      },
    },
  });
  console.log(`[10] SELESAI / STT TERBIT     : ${t10.reg.registration_no} - Siap dicoba verifikasi QR publik & arsip`);

  console.log('\n=== SUKSES! SELURUH 10 TAHAPAN ALUR LPMQ KINI TERSEDIA LENGKAP ===');
  console.log('Catatan: Naskah sampel ini TIDAK diwajibkan dalam produksi.');
  console.log('Untuk membersihkannya kembali kapan saja, jalankan: npm run clean:demo-stages');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error saat seeding demo stages:', e);
    prisma.$disconnect();
    process.exit(1);
  });
