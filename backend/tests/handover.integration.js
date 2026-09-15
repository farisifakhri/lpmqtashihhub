import assert from 'node:assert/strict';

export async function runHandoverTests({
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
  const distributorToken = (await loginAs('distributor@lpmq.kemenag.go.id')).token;
  const distributorUser = await prisma.user.findUnique({ where: { email: 'distributor@lpmq.kemenag.go.id' } });
  const verifierUser = await prisma.user.findUnique({ where: { email: 'verifikator@lpmq.kemenag.go.id' } });

  const call = async (path, token, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'pr-ver-06-test',
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
  let handover;

  const validChecklistPassed = [
    { code: 'REGISTRATION_DATA', result: 'SESUAI' },
    { code: 'DIGITAL_FILES', result: 'SESUAI' },
    { code: 'PHYSICAL_MASTER', result: 'SESUAI' },
    { code: 'MANUSCRIPT_CONTENT', result: 'SESUAI' },
  ];

  // -------------------------------------------------------------
  // SETUP: REGISTRASI SAMPAI PEMBAYARAN VERIFIED
  // -------------------------------------------------------------
  await test('PR-VER-06 Setup: Registrasi, verifikasi, surat disetujui, dan pembayaran lunas', async () => {
    reg = await expect(
      '/registrations',
      publisherToken,
      'POST',
      { service_type_id: serviceId, title: 'Mushaf Standar Uji Serah Terima Master Fisik' },
      201
    );

    await expect(`/registrations/${reg.id}/physical-master`, publisherToken, 'PUT', {
      format: 'A4',
      binding_method: 'PER_JUZ',
      volume_count: 30,
      delivery_method: 'LANGSUNG',
      notes: 'Master 30 juz diserahkan langsung',
    });

    await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST');

    await expect(`/registrations/${reg.id}/physical-master/receive`, kepalaToken, 'POST', {
      decision: 'RECEIVED',
      condition: 'BAIK',
      receipt_no: `TT-MASTER-${Date.now()}`,
      volume_count: 30,
    });

    const assigned = await expect(
      `/registrations/${reg.id}/verification-assignments`,
      kepalaToken,
      'POST',
      {
        verifier_id: verifierUser.id,
        nota_no: `ND-HO-${Date.now()}`,
        notes: 'Penugasan verifikator uji serah terima',
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
        notes: 'Semua butir sesuai kriteria',
        letter_text: 'Naskah dinyatakan lolos verifikasi administrasi dan format.',
      },
      201
    );

    // Kepala LPMQ setujui
    await expect(`/verification-documents/${doc.id}/approve`, kepalaToken, 'POST');

    // Verifikator kirim surat resmi -> AWAITING_PAYMENT & Payment terbit
    const sent = await expect(`/verification-documents/${doc.id}/send`, verifikatorToken, 'POST', { channel: 'IN_APP' });
    payment = sent.payment;

    // Siapkan upload bukti bayar
    const uploadRes = await fetch(`${base}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publisherToken}`,
        'Content-Type': 'application/pdf',
      },
      body: Buffer.from('%PDF-1.4\nBukti Bayar Resmi BSI\n%%EOF'),
    });
    receiptFile = (await uploadRes.json()).data;
  });

  // -------------------------------------------------------------
  // EPIC H: PENYERAHAN MASTER FISIK KE DISTRIBUTOR
  // -------------------------------------------------------------
  await test('PR-VER-06: Penyerahan master fisik dicegah sebelum pembayaran PNBP diverifikasi sah (LUNAS)', async () => {
    const handoverPath = `/registrations/${reg.id}/physical-master/handovers`;

    // Negative: Status registrasi masih AWAITING_PAYMENT (belum konfirmasi bayar) -> 409
    await expect(handoverPath, verifikatorToken, 'POST', {
      to_user_id: distributorUser.id,
      condition: 'BAIK',
      volume_count: 30,
    }, 409);

    // Penerbit konfirmasi bayar -> status registrasi jadi PAYMENT_VERIFICATION, payment jadi PAID
    await expect(`/payments/${payment.id}/confirm`, publisherToken, 'POST', {
      receipt_file_id: receiptFile.id,
      external_ref: 'NTPN-TEST-HANDOVER-01',
    });

    // Negative: Pembayaran baru berstatus PAID, belum diverifikasi sah (VERIFIED) oleh verifikator -> 409
    await expect(handoverPath, verifikatorToken, 'POST', {
      to_user_id: distributorUser.id,
      condition: 'BAIK',
      volume_count: 30,
    }, 409);
  });

  await test('PR-VER-06: Verifikator mengesahkan pembayaran lalu menyerahkan master fisik ke Distributor', async () => {
    // 1. Verifikator mengesahkan pembayaran PNBP
    await expect(`/payments/${payment.id}/verify`, verifikatorToken, 'PATCH');

    // 2. Mengambil daftar distributor aktif
    const distributors = await expect('/master/distributors', verifikatorToken);
    assert.ok(Array.isArray(distributors));
    assert.ok(distributors.some((d) => d.id === distributorUser.id));

    // 3. Negative: Penerbit dan distributor dilarang menyerahkan master fisik (hanya verifikator)
    const handoverPath = `/registrations/${reg.id}/physical-master/handovers`;
    await expect(handoverPath, publisherToken, 'POST', { to_user_id: distributorUser.id }, 403);
    await expect(handoverPath, distributorToken, 'POST', { to_user_id: distributorUser.id }, 403);

    // 4. Negative: Memilih user penerima yang bukan distributor
    await expect(handoverPath, verifikatorToken, 'POST', { to_user_id: verifierUser.id }, 400);

    // 5. Sukses: Verifikator menyerahkan master fisik ke Distributor
    const created = await expect(handoverPath, verifikatorToken, 'POST', {
      to_user_id: distributorUser.id,
      condition: 'LENGKAP_30_JUZ',
      volume_count: 30,
      notes: 'Master fisik ukuran A4 rapi dalam box naskah.',
    }, 201);

    assert.ok(created.handover);
    assert.equal(created.handover.status, 'PENDING');
    assert.equal(created.handover.to_user_id, distributorUser.id);
    assert.equal(created.handover.volume_count, 30);
    assert.ok(created.handover.receipt_no.startsWith('BAST-VER-DIST-'));
    handover = created.handover;

    // Status registrasi berpindah ke WAITING_DISTRIBUTOR_RECEIPT
    const regCheck = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.equal(regCheck.status, 'WAITING_DISTRIBUTOR_RECEIPT');

    // 6. Negative: Penyerahan ganda saat masih PENDING ditolak (409)
    await expect(handoverPath, verifikatorToken, 'POST', {
      to_user_id: distributorUser.id,
      volume_count: 30,
    }, 409);
  });

  await test('PR-VER-06: Query daftar dan rincian serah-terima fisik', async () => {
    // 1. Antrean serah-terima fisik
    const list = await expect('/physical-master/handovers', distributorToken);
    assert.ok(Array.isArray(list.items));
    assert.ok(list.items.some((h) => h.id === handover.id));

    // 2. Detail satu serah-terima
    const detail = await expect(`/physical-master/handovers/${handover.id}`, distributorToken);
    assert.equal(detail.id, handover.id);
    assert.equal(detail.status, 'PENDING');
    assert.equal(detail.to_user.id, distributorUser.id);

    // 3. Riwayat serah-terima per registrasi
    const regHandovers = await expect(`/registrations/${reg.id}/physical-master/handovers`, verifikatorToken);
    assert.ok(Array.isArray(regHandovers));
    assert.equal(regHandovers.length, 1);
  });

  await test('PR-VER-06: Distributor mengonfirmasi penerimaan master fisik & menetapkan tenggat pentashihan', async () => {
    const receivePath = `/physical-master/handovers/${handover.id}/receive`;

    // 1. Negative: Verifikator dan Penerbit dilarang mengonfirmasi penerimaan atas nama Distributor (BR-VER-013)
    await expect(receivePath, verifikatorToken, 'POST', {}, 403);
    await expect(receivePath, publisherToken, 'POST', {}, 403);

    // 2. Sukses: Distributor mengonfirmasi penerimaan fisik dan menetapkan deadline
    const dueTarget = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
    const received = await expect(receivePath, distributorToken, 'POST', {
      condition: 'BAIK_SESUAI_LOKET',
      volume_count: 30,
      tashih_due_at: dueTarget,
      notes: 'Fisik master diterima lengkap 30 juz di loket pentashihan.',
    });

    assert.equal(received.handover.status, 'RECEIVED');
    assert.ok(received.handover.received_at);
    assert.equal(received.handover.condition, 'BAIK_SESUAI_LOKET');
    assert.ok(received.handover.tashih_due_at);

    // 3. Status registrasi resmi berpindah ke WAITING_DISTRIBUTION (Modul Verifikasi Selesai)
    const regFinal = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.equal(regFinal.status, 'WAITING_DISTRIBUTION');

    // 4. Negative: Serah terima yang sudah diterima tidak dapat diproses ulang (409)
    await expect(receivePath, distributorToken, 'POST', {}, 409);
  });

  await test('PR-VER-06: Skenario alternatif penolakan/pengembalian master fisik cacat oleh Distributor', async () => {
    // Buat registrasi kedua untuk menguji alur return fisik
    const reg2 = await expect(
      '/registrations',
      publisherToken,
      'POST',
      { service_type_id: serviceId, title: 'Mushaf Uji Pengembalian Fisik' },
      201
    );
    await expect(`/registrations/${reg2.id}/physical-master`, publisherToken, 'PUT', {
      format: 'A4', binding_method: 'PER_JUZ', volume_count: 30, delivery_method: 'LANGSUNG',
    });
    await expect(`/registrations/${reg2.id}/submit`, publisherToken, 'POST');
    await expect(`/registrations/${reg2.id}/physical-master/receive`, kepalaToken, 'POST', {
      decision: 'RECEIVED',
      receipt_no: `TT-M2-${Date.now()}`,
      condition: 'BAIK',
      volume_count: 30,
    });
    const asg2 = (await expect(`/registrations/${reg2.id}/verification-assignments`, kepalaToken, 'POST', {
      verifier_id: verifierUser.id,
      nota_no: `ND-HO2-${Date.now()}`,
      notes: 'Penugasan reg 2',
    }, 201)).assignment;
    await expect(`/verification-assignments/${asg2.id}/start`, verifikatorToken, 'PATCH');
    const doc2 = await expect(`/verification-assignments/${asg2.id}/result-drafts`, verifikatorToken, 'POST', {
      decision: 'PASSED', checklist: validChecklistPassed, letter_text: 'Naskah dinyatakan memenuhi syarat verifikasi administrasi dan format.',
    }, 201);
    await expect(`/verification-documents/${doc2.id}/approve`, kepalaToken, 'POST');
    const sent2 = await expect(`/verification-documents/${doc2.id}/send`, verifikatorToken, 'POST', { channel: 'IN_APP' });
    await expect(`/payments/${sent2.payment.id}/confirm`, publisherToken, 'POST', {
      receipt_file_id: receiptFile.id, external_ref: 'NTPN-REG2',
    });
    await expect(`/payments/${sent2.payment.id}/verify`, verifikatorToken, 'PATCH');

    // Verifikator serahkan master
    const ho2 = (await expect(`/registrations/${reg2.id}/physical-master/handovers`, verifikatorToken, 'POST', {
      to_user_id: distributorUser.id, volume_count: 30,
    }, 201)).handover;

    const returnPath = `/physical-master/handovers/${ho2.id}/return`;

    // Negative: Alasan pengembalian wajib min 5 char
    await expect(returnPath, distributorToken, 'POST', { reason: 'abc' }, 400);

    // Negative: Verifikator dilarang menolak atas nama Distributor
    await expect(returnPath, verifikatorToken, 'POST', { reason: 'Juz 15 halaman terbalik' }, 403);

    // Sukses: Distributor mengembalikan fisik cacat
    const returned = await expect(returnPath, distributorToken, 'POST', {
      reason: 'Ditemukan halaman terbalik dan jilid juz 15 cacat cetak saat pemeriksaan meja.',
    });

    assert.equal(returned.handover.status, 'RETURNED');
    const reg2Check = await prisma.registration.findUnique({ where: { id: reg2.id } });
    assert.equal(reg2Check.status, 'REVISION_REQUIRED');
  });
}

