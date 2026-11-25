import assert from 'node:assert/strict';

export async function runVerificationDispatchTests({
  test,
  prisma,
  base,
  loginAs,
  publisherToken,
  verifikatorToken,
  adminToken,
  serviceId,
}) {
  const kepalaToken = (await loginAs('kepala@lpmq.kemenag.go.id')).token;
  const verifier = await prisma.user.findUnique({ where: { email: 'verifikator@lpmq.kemenag.go.id' } });

  const call = async (path, token, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'b22-dispatch-test',
      },
      ...(method !== 'GET' && body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, json: await response.json() };
  };

  const expect = async (path, token, method = 'GET', body, expectedStatus = 200) => {
    const result = await call(path, token, method, body);
    assert.equal(
      result.status,
      expectedStatus,
      `Expected ${expectedStatus} on ${method} ${path}, got ${result.status}: ${JSON.stringify(result.json)}`
    );
    return result.json.data;
  };

  const validChecklist = [
    { code: 'REGISTRATION_DATA', result: 'SESUAI' },
    { code: 'DIGITAL_FILES', result: 'SESUAI' },
    { code: 'PHYSICAL_MASTER', result: 'SESUAI' },
    { code: 'MANUSCRIPT_CONTENT', result: 'SESUAI' },
  ];

  let reg;
  let assignment;
  let doc;
  const billingNo = `SIMPONI-B22-${Date.now()}`;

  await test('B22 Setup: Buat pengajuan, serah terima master fisik, dan mulai pemeriksaan verifikator', async () => {
    reg = await expect(
      '/registrations',
      publisherToken,
      'POST',
      {
        service_type_id: serviceId,
        title: 'Mushaf B-22 Alur Hasil Verifikasi & SLA',
        mushaf_details: {
          penanggung_jawab_produk: 'Penanggung Jawab B-22',
          jenis_mushaf: 'Mushaf Standar Usmani',
          sizes: [{ ukuran: 'Standar A4 (21,0 x 29,7 cm)', oplah: 1000 }],
          surat_permohonan_file_id: 'mock-file-permohonan',
          cover_file_id: 'mock-file-cover',
          contoh_halaman_file_id: 'mock-file-contoh',
        },
      },
      201
    );

    await expect(`/registrations/${reg.id}/physical-master`, publisherToken, 'PUT', {
      format: 'A4',
      binding_method: 'PER_JUZ',
      volume_count: 30,
      delivery_method: 'LANGSUNG',
      notes: 'Master fisik lengkap untuk pengujian B-22',
    });

    await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST');

    await expect(`/registrations/${reg.id}/physical-master/receive`, adminToken, 'POST', {
      decision: 'RECEIVED',
      receipt_no: `TR-B22-${Date.now()}`,
      condition: 'Kondisi lengkap dan baik',
      volume_count: 30,
    });

    const assigned = await expect(
      `/registrations/${reg.id}/verification-assignments`,
      adminToken,
      'POST',
      {
        verifier_id: verifier.id,
        nota_no: `ND-B22-${Date.now()}`,
        notes: 'Pemeriksaan naskah dengan pengujian B-22',
      },
      201
    );
    assignment = assigned.assignment;

    await expect(`/verification-assignments/${assignment.id}/start`, verifikatorToken, 'PATCH');
    const started = await prisma.verificationAssignment.findUnique({ where: { id: assignment.id } });
    assert.equal(started.status, 'IN_PROGRESS');
  });

  await test('B22-T1 & B22-T3: Verifikator menyimpan kalkulasi tarif PNBP ke snapshot pengajuan', async () => {
    const feePayload = {
      is_extension: false,
      manuscripts: [
        {
          title: 'Mushaf B-22 Alur Hasil Verifikasi & SLA',
          dasar: 'JUZ30',
          tambahan: ['TERJEMAH'],
          variants: [{ ukuran: 'A4', oplah: 1000 }],
        },
      ],
    };

    const feeResult = await expect(
      `/verification-assignments/${assignment.id}/fee-calculation`,
      verifikatorToken,
      'PUT',
      feePayload,
      200
    );

    assert.ok(feeResult.snapshot, 'Snapshot harus dikembalikan');
    assert.equal(feeResult.snapshot.total_fee, 1500000, 'Total tarif harus Rp 1.500.000 (JUZ30 + TERJEMAH)');
    assert.equal(feeResult.snapshot.manuscripts.length, 1);

    // Pastikan database registration.fee_sla_snapshot terbarui
    const updatedReg = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.ok(updatedReg.fee_sla_snapshot);
    assert.equal(updatedReg.fee_sla_snapshot.total_fee, 1500000);
  });

  await test('B22-T5 Prep: Verifikator mengajukan draf hasil verifikasi ke Kepala LPMQ', async () => {
    // Unggah bukti billing PNBP
    const uploadRes = await fetch(`${base}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${verifikatorToken}`, 'Content-Type': 'application/pdf' },
      body: Buffer.from('%PDF-1.4\nBilling PNBP B-22\n%%EOF'),
    });
    assert.equal(uploadRes.status, 201);
    const billingFileId = (await uploadRes.json()).data.id;

    doc = await expect(
      `/verification-assignments/${assignment.id}/result-drafts`,
      verifikatorToken,
      'POST',
      {
        decision: 'PASSED',
        billing_no: billingNo,
        billing_file_id: billingFileId,
        checklist: validChecklist,
        letter_text: 'Naskah dinyatakan memenuhi seluruh persyaratan verifikasi administrasi dan teknis.',
      },
      201
    );

    assert.equal(doc.status, 'SUBMITTED');
    const waitingReg = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.equal(waitingReg.status, 'WAITING_VERIFICATION_APPROVAL');
  });

  await test('B22-T5: Pengesahan Kepala LPMQ otomatis mengirimkan surat hasil (Auto-Dispatch) & menerbitkan tagihan PNBP', async () => {
    // Kepala LPMQ mengesahkan draf (seperti tombol di UI frontend dengan auto_dispatch: true)
    const approveResult = await expect(
      `/verification-documents/${doc.id}/approve`,
      kepalaToken,
      'POST',
      { auto_generate: true, auto_dispatch: true },
      200
    );

    assert.equal(approveResult.status, 'SENT', 'Dokumen harus otomatis berstatus SENT setelah pengesahan Kepala LPMQ');
    assert.ok(approveResult.sent_at, 'Waktu pengiriman sent_at harus terisi');

    // Cek status assignment verifikasi: harus COMPLETED, result_sent_at terisi, sla_outcome terisi
    const finalAssignment = await prisma.verificationAssignment.findUnique({
      where: { id: assignment.id },
    });
    assert.equal(finalAssignment.status, 'COMPLETED', 'Assignment harus COMPLETED setelah dispatch');
    assert.ok(finalAssignment.completed_at, 'completed_at harus terisi');
    assert.ok(finalAssignment.result_sent_at, 'result_sent_at harus terisi');
    assert.ok(
      ['EARLY', 'ON_TIME', 'LATE'].includes(finalAssignment.sla_outcome),
      `sla_outcome harus valid enum, didapat: ${finalAssignment.sla_outcome}`
    );
    assert.ok(typeof finalAssignment.sla_working_days_used === 'number', 'sla_working_days_used harus berupa integer');

    // Cek tagihan PNBP: harus diterbitkan dengan nominal sesuai snapshot (Rp 1.500.000)
    const activePayment = await prisma.paymentRecord.findFirst({
      where: { registration_id: reg.id },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(activePayment, 'PaymentRecord harus terbentuk');
    assert.equal(activePayment.status, 'UNPAID');
    assert.equal(activePayment.billing_no, billingNo);

    const snapshot = (await prisma.registration.findUnique({ where: { id: reg.id } })).fee_sla_snapshot;
    assert.equal(Number(activePayment.amount), snapshot.total_fee, 'Nominal tagihan harus sama persis dengan fee_sla_snapshot');
    assert.equal(Number(activePayment.amount), 1500000);

    // Registrasi harus berstatus AWAITING_PAYMENT
    const finalReg = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.equal(finalReg.status, 'AWAITING_PAYMENT');

    // Penerbit dapat mengakses dokumen secara langsung
    const pubDoc = await expect(`/verification-documents/${doc.id}`, publisherToken, 'GET');
    assert.equal(pubDoc.status, 'SENT');
    assert.equal(pubDoc.id, doc.id);
  });

  await test('B22-T4: Kalkulasi tarif dikunci setelah tagihan PNBP aktif terbit (409 Conflict)', async () => {
    // Verifikator mencoba mengubah kalkulasi biaya setelah tagihan terbit
    const res = await call(
      `/verification-assignments/${assignment.id}/fee-calculation`,
      verifikatorToken,
      'PUT',
      {
        manuscripts: [
          {
            title: 'Mushaf B-22 Alur Hasil Verifikasi & SLA',
            dasar: 'JUZ30',
          },
        ],
      }
    );
    assert.equal(res.status, 409, 'Harus ditolak 409 bila tagihan sudah terbit');
    assert.match(res.json.message || '', /(tagihan PNBP sudah diterbitkan|IN_PROGRESS)/i);
  });

  await test('B22-T8: Pengiriman ulang surat yang sudah SENT ditolak idempoten (409 Conflict)', async () => {
    // Coba panggil /send pada dokumen yang sudah SENT
    const res = await call(
      `/verification-documents/${doc.id}/send`,
      verifikatorToken,
      'POST',
      { channel: 'IN_APP' }
    );
    assert.equal(res.status, 409, 'Harus 409 Conflict jika sudah terkirim');
    assert.match(res.json.message || '', /sudah dikirimkan/i);
  });

  await test('B22-T7: Resiliensi kegagalan pengiriman (EMAIL_FAILED) dan keberhasilan pengiriman ulang', async () => {
    // Simulasikan dokumen yang berstatus EMAIL_FAILED dengan catatan error
    await prisma.verificationDocument.update({
      where: { id: doc.id },
      data: {
        status: 'EMAIL_FAILED',
        dispatch_error: 'Simulasi kegagalan koneksi SMTP outbox email',
      },
    });

    const failedDoc = await prisma.verificationDocument.findUnique({ where: { id: doc.id } });
    assert.equal(failedDoc.status, 'EMAIL_FAILED');
    assert.ok(failedDoc.dispatch_error);

    // Panggil ulang endpoint pengiriman (/send)
    const retryResult = await expect(
      `/verification-documents/${doc.id}/send`,
      verifikatorToken,
      'POST',
      { channel: 'IN_APP' },
      200
    );

    assert.equal(retryResult.document.status, 'SENT');
    assert.equal(retryResult.document.dispatch_error, null, 'dispatch_error harus dibersihkan setelah pengiriman ulang sukses');

    // Pastikan tidak ada tagihan ganda yang diterbitkan (tetap 1 PaymentRecord)
    const paymentCount = await prisma.paymentRecord.count({ where: { registration_id: reg.id } });
    assert.equal(paymentCount, 1, 'Hanya boleh ada 1 PaymentRecord');
  });
}
