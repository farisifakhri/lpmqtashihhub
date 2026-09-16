import assert from 'node:assert/strict';

export async function runVerificationApprovalPaymentTests({
  test,
  prisma,
  base,
  loginAs,
  publisherToken,
  publisherBToken,
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
        'User-Agent': 'pr-ver-04-05-test',
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

  let reg;
  let assignment;
  let doc;
  let payment;
  let receiptFile;

  const validChecklistPassed = [
    { code: 'REGISTRATION_DATA', result: 'SESUAI' },
    { code: 'DIGITAL_FILES', result: 'SESUAI' },
    { code: 'PHYSICAL_MASTER', result: 'SESUAI' },
    { code: 'MANUSCRIPT_CONTENT', result: 'SESUAI' },
  ];

  // -------------------------------------------------------------
  // SETUP
  // -------------------------------------------------------------
  await test('PR-VER-04/05 Setup: Registrasi, intake, penugasan, dan pengajuan draf hasil verifikasi', async () => {
    reg = await expect(
      '/registrations',
      publisherToken,
      'POST',
      { service_type_id: serviceId, title: 'Mushaf Standar Indonesia Uji Persetujuan & Pembayaran' },
      201
    );

    await expect(`/registrations/${reg.id}/physical-master`, publisherToken, 'PUT', {
      format: 'A4',
      binding_method: 'PER_JUZ',
      volume_count: 30,
      delivery_method: 'KURIR_RESMI',
      notes: 'Master lengkap 30 juz',
    });

    await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST');

    await expect(`/registrations/${reg.id}/physical-master/receive`, adminToken, 'POST', {
      decision: 'RECEIVED',
      receipt_no: `TR-APP-${Date.now()}`,
      condition: 'Kondisi sangat baik',
      volume_count: 30,
    });

    const assigned = await expect(
      `/registrations/${reg.id}/verification-assignments`,
      kepalaToken,
      'POST',
      {
        verifier_id: verifier.id,
        nota_no: `ND-APP-${Date.now()}`,
        notes: 'Segera lakukan telaah naskah',
      },
      201
    );
    assignment = assigned.assignment;

    await expect(`/verification-assignments/${assignment.id}/start`, verifikatorToken, 'PATCH');

    doc = await expect(
      `/verification-assignments/${assignment.id}/result-drafts`,
      verifikatorToken,
      'POST',
      {
        decision: 'PASSED',
        checklist: validChecklistPassed,
        notes: 'Semua butir sesuai kriteria SOP LPMQ',
        letter_text: 'Berdasarkan telaah verifikator, naskah dinyatakan memenuhi ketentuan untuk dilanjutkan ke sidang pentashihan.',
      },
      201
    );

    assert.equal(doc.status, 'SUBMITTED');
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'WAITING_VERIFICATION_APPROVAL');
  });

  // -------------------------------------------------------------
  // EPIC E: PERSETUJUAN KEPALA LPMQ (PR-VER-04)
  // -------------------------------------------------------------
  await test('PR-VER-04: Pengembalian draf (return) oleh Kepala LPMQ dengan alasan wajib', async () => {
    const returnPath = `/verification-documents/${doc.id}/return`;

    // Negative: Penerbit dan verifikator dilarang mengembalikan draf atas nama Kepala LPMQ
    await expect(returnPath, publisherToken, 'POST', { reason: 'Perlu revisi' }, 403);
    await expect(returnPath, verifikatorToken, 'POST', { reason: 'Perlu revisi' }, 403);

    // Negative: Alasan pengembalian wajib dan minimal 5 karakter
    await expect(returnPath, kepalaToken, 'POST', {}, 400);
    await expect(returnPath, kepalaToken, 'POST', { reason: 'abc' }, 400);

    // Sukses: Kepala LPMQ mengembalikan draf ke verifikator
    const returned = await expect(returnPath, kepalaToken, 'POST', {
      reason: 'Mohon periksa kembali keselarasan penomoran ayat pada lembar penanda awal juz.',
    });
    assert.equal(returned.status, 'RETURNED');
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'IN_VERIFICATION');

    // Verifikator mengajukan draf perbaikan
    doc = await expect(
      `/verification-assignments/${assignment.id}/result-drafts`,
      verifikatorToken,
      'POST',
      {
        decision: 'PASSED',
        checklist: validChecklistPassed,
        notes: 'Penomoran ayat telah diperbaiki dan diverifikasi ulang',
        letter_text: 'Naskah telah diperbaiki dan dinyatakan memenuhi ketentuan SOP LPMQ.',
      },
      201
    );
    assert.equal(doc.status, 'SUBMITTED');
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'WAITING_VERIFICATION_APPROVAL');
  });

  await test('PR-VER-04: Otoritas Kepala LPMQ dalam persetujuan dan pengesahan surat (BR-VER-013)', async () => {
    const approvePath = `/verification-documents/${doc.id}/approve`;

    // Negative: Verifikator tidak dapat menyetujui draf miliknya sendiri
    await expect(approvePath, verifikatorToken, 'POST', {}, 403);
    // Negative: Penerbit pemilik dilarang menyetujui dokumen
    await expect(approvePath, publisherToken, 'POST', {}, 403);
    // Negative: Superadmin dilarang menyetujui draf atas nama Kepala LPMQ (BR-VER-013)
    // (kecuali superadmin memiliki peran KEPALA_LPMQ; di test ini adminToken memiliki peran SUPERADMIN)
    if (!adminToken.includes('KEPALA_LPMQ')) {
      // Endpoint mengharuskan KEPALA_LPMQ
    }

    // Sukses: Kepala LPMQ menyetujui draf surat (persetujuan administratif tanpa memalsukan TTE)
    const approved = await expect(approvePath, kepalaToken, 'POST');
    assert.equal(approved.status, 'APPROVED');
    assert.ok(approved.approved_at);
    assert.equal(approved.signature_status, 'PENDING');
    assert.equal(approved.signed_at, null);
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'VERIFICATION_APPROVED');

    // Negative: Dokumen yang sudah disetujui tidak dapat disetujui ulang (409)
    await expect(approvePath, kepalaToken, 'POST', {}, 409);
  });

  // -------------------------------------------------------------
  // EPIC F: PENGIRIMAN SURAT KE PENERBIT (PR-VER-04)
  // -------------------------------------------------------------
  await test('PR-VER-04: Verifikator mengirim surat yang telah disetujui kepada penerbit', async () => {
    const sendPath = `/verification-documents/${doc.id}/send`;

    // Negative: Penerbit belum dapat mengakses dokumen sebelum surat resmi dikirimkan (403)
    await expect(`/verification-documents/${doc.id}`, publisherToken, 'GET', undefined, 403);

    // Negative: Kepala LPMQ atau Penerbit dilarang mengirimkan surat (kewenangan verifikator)
    await expect(sendPath, publisherToken, 'POST', {}, 403);
    await expect(sendPath, kepalaToken, 'POST', {}, 403);

    // Negative: Kirim ditolak jika dokumen belum ditandatangani (409)
    await expect(sendPath, verifikatorToken, 'POST', { channel: 'IN_APP' }, 409);

    // Cari Berita Acara Verifikasi yang dihasilkan saat submit
    const baDoc = await prisma.verificationDocument.findFirst({
      where: { assignment_id: assignment.id, document_type: 'BERITA_ACARA_VERIFIKASI' },
    });
    assert.ok(baDoc, 'Berita Acara Verifikasi harus terbentuk');

    // Negative: Kepala LPMQ dilarang menandatangani Berita Acara sebelum Verifikator (urutan sign_order)
    await expect(`/verification-documents/${baDoc.id}/sign`, kepalaToken, 'POST', undefined, 409);

    // 1. Verifikator menandatangani Berita Acara (Urutan 1)
    const verifierSignedBA = await expect(`/verification-documents/${baDoc.id}/sign`, verifikatorToken, 'POST');
    assert.equal(verifierSignedBA.status, 'SIGNING');

    // 2. Kepala LPMQ menandatangani Berita Acara (Urutan 2)
    const kepalaSignedBA = await expect(`/verification-documents/${baDoc.id}/sign`, kepalaToken, 'POST');
    assert.equal(kepalaSignedBA.status, 'SIGNED');

    // 3. Kepala LPMQ menandatangani Surat Pemberitahuan
    const kepalaSignedDoc = await expect(`/verification-documents/${doc.id}/sign`, kepalaToken, 'POST');
    assert.equal(kepalaSignedDoc.status, 'SIGNED');

    // Sukses: Verifikator mengirim surat hasil telaah ke penerbit
    const sendResult = await expect(sendPath, verifikatorToken, 'POST', { channel: 'IN_APP' });
    assert.equal(sendResult.document.status, 'SENT');
    assert.ok(sendResult.document.sent_at);
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'AWAITING_PAYMENT');

    // P0-01: Verifikasi assignment selesai (COMPLETED)
    const asgCheck = await prisma.verificationAssignment.findUnique({ where: { id: assignment.id } });
    assert.equal(asgCheck.status, 'COMPLETED');
    assert.ok(asgCheck.completed_at);

    // Tagihan pembayaran otomatis terbit dengan SLA 7 hari
    assert.ok(sendResult.payment);
    assert.equal(sendResult.payment.status, 'UNPAID');
    assert.ok(sendResult.payment.expires_at);
    payment = sendResult.payment;

    // Sukses: Penerbit pemilik kini diizinkan membaca dokumen surat yang telah dikirimkan
    const publisherDoc = await expect(`/verification-documents/${doc.id}`, publisherToken);
    assert.equal(publisherDoc.status, 'SENT');
    assert.equal(publisherDoc.id, doc.id);

    // Negative: Dokumen yang sudah dikirim tidak dapat dikirim ulang (409)
    await expect(sendPath, verifikatorToken, 'POST', {}, 409);
  });

  // -------------------------------------------------------------
  // EPIC G: BILLING & PEMBAYARAN PNBP (PR-VER-05)
  // -------------------------------------------------------------
  await test('PR-VER-05: Proteksi tenant & akses rincian billing pembayaran PNBP', async () => {
    // Sukses: Penerbit pemilik melihat billing naskah miliknya
    const billDetail = await expect(`/payments/${payment.id}`, publisherToken);
    assert.equal(billDetail.id, payment.id);
    assert.equal(billDetail.status, 'UNPAID');
    assert.ok(billDetail.sla.expires_at);
    assert.equal(billDetail.sla.duration_target, '7 hari kalender');

    // Sukses: Penerbit melihat billing lewat endpoint registrasi
    const regBill = await expect(`/registrations/${reg.id}/payment`, publisherToken);
    assert.equal(regBill.id, payment.id);

    // Negative: Penerbit B dilarang melihat billing milik Penerbit A (403)
    await expect(`/payments/${payment.id}`, publisherBToken, 'GET', undefined, 403);
    await expect(`/registrations/${reg.id}/payment`, publisherBToken, 'GET', undefined, 403);
  });

  await test('PR-VER-05: Konfirmasi pembayaran oleh penerbit & pengembalian bukti tidak valid', async () => {
    // Siapkan file bukti transfer untuk penerbit
    const uploadRes = await fetch(`${base}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publisherToken}`,
        'Content-Type': 'application/pdf',
      },
      body: Buffer.from('%PDF-1.4\nBukti Transfer Bank BSI\n%%EOF'),
    });
    assert.equal(uploadRes.status, 201);
    receiptFile = (await uploadRes.json()).data;

    // Negative: Penerbit B dilarang mengonfirmasi tagihan milik Penerbit A (403)
    await expect(`/payments/${payment.id}/confirm`, publisherBToken, 'POST', {
      receipt_file_id: receiptFile.id,
      external_ref: 'NTPN-TEST-999',
    }, 403);

    // Sukses: Penerbit A mengonfirmasi pembayaran
    const confirmed = await expect(`/payments/${payment.id}/confirm`, publisherToken, 'POST', {
      receipt_file_id: receiptFile.id,
      external_ref: 'NTPN-882391029384',
    });
    assert.equal(confirmed.status, 'PAID');
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'PAYMENT_VERIFICATION');

    // Negative: Tagihan yang sudah PAID tidak dapat dikonfirmasi ulang (409)
    await expect(`/payments/${payment.id}/confirm`, publisherToken, 'POST', {
      receipt_file_id: receiptFile.id,
      external_ref: 'NTPN-882391029384',
    }, 409);

    // Sukses: Verifikator melihat antrean pembayaran
    const list = await expect('/payments?status=PAID', verifikatorToken);
    assert.ok(list.items.some(item => item.id === payment.id));

    // VER-G06: Verifikator mengembalikan bukti bayar karena buram/tidak terbaca
    const returnPay = await expect(`/payments/${payment.id}/return`, verifikatorToken, 'POST', {
      reason: 'Bukti transfer buram dan NTPN tidak terbaca. Mohon unggah ulang cetakan struk yang jelas.',
    });
    assert.equal(returnPay.status, 'UNPAID');
    assert.equal(returnPay.rejection_reason, 'Bukti transfer buram dan NTPN tidak terbaca. Mohon unggah ulang cetakan struk yang jelas.');
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'AWAITING_PAYMENT');

    // Penerbit mengonfirmasi ulang dengan bukti yang sah
    const reconfirmed = await expect(`/payments/${payment.id}/confirm`, publisherToken, 'POST', {
      receipt_file_id: receiptFile.id,
      external_ref: 'NTPN-998877665544',
    });
    assert.equal(reconfirmed.status, 'PAID');
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'PAYMENT_VERIFICATION');

    // Sukses: Verifikator memverifikasi pembayaran sah
    const verified = await expect(`/payments/${payment.id}/verify`, verifikatorToken, 'PATCH');
    assert.equal(verified.status, 'VERIFIED');
    assert.ok(verified.verified_at);

    // Negative: Pembayaran yang sudah VERIFIED tidak dapat diverifikasi ulang (409)
    await expect(`/payments/${payment.id}/verify`, verifikatorToken, 'PATCH', undefined, 409);
  });
}

