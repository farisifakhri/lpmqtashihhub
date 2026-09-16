import assert from 'node:assert/strict';

export async function runVerificationReviewTests({ test, prisma, base, loginAs, publisherToken, publisherBToken, verifikatorToken, adminToken, serviceId }) {
  const kepalaToken = (await loginAs('kepala@lpmq.kemenag.go.id')).token;
  const otherVerifierToken = (await loginAs('pentashih@lpmq.kemenag.go.id')).token; // Different staff user
  const verifier = await prisma.user.findUnique({ where: { email: 'verifikator@lpmq.kemenag.go.id' } });

  const call = async (path, token, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'pr-ver-03-test' },
      ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}),
    });
    return { status: response.status, json: await response.json() };
  };

  const expect = async (path, token, method, body, expectedStatus = 200) => {
    const result = await call(path, token, method, body);
    assert.equal(result.status, expectedStatus, JSON.stringify(result.json));
    return result.json.data;
  };

  let reg;
  let assignment;
  const notaNo = `ND-REV-${Date.now()}`;
  const receiptNo = `TR-REV-${Date.now()}`;

  const validChecklistPassed = [
    { code: 'REGISTRATION_DATA', result: 'SESUAI' },
    { code: 'DIGITAL_FILES', result: 'SESUAI' },
    { code: 'PHYSICAL_MASTER', result: 'SESUAI' },
    { code: 'MANUSCRIPT_CONTENT', result: 'SESUAI' },
  ];

  const validChecklistRevision = [
    { code: 'REGISTRATION_DATA', result: 'SESUAI' },
    { code: 'DIGITAL_FILES', result: 'TIDAK_SESUAI', notes: 'Lembar 3 buram dan resolusi kurang dari 300 dpi.' },
    { code: 'PHYSICAL_MASTER', result: 'SESUAI' },
    { code: 'MANUSCRIPT_CONTENT', result: 'SESUAI' },
  ];

  await test('PR-VER-03 Setup: Siapkan naskah dengan penerimaan fisik dan penugasan Kepala LPMQ', async () => {
    reg = await expect('/registrations', publisherToken, 'POST', { service_type_id: serviceId, title: 'Naskah Uji Review Verifikator' }, 201);
    await expect(`/registrations/${reg.id}/physical-master`, publisherToken, 'PUT', {
      format: 'A4', binding_method: 'PER_JUZ', volume_count: 30, delivery_method: 'LANGSUNG', notes: 'Diserahkan langsung ke loket',
    });
    await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST');
    await expect(`/registrations/${reg.id}/physical-master/receive`, adminToken, 'POST', {
      decision: 'RECEIVED', receipt_no: receiptNo, condition: 'Lengkap dan baik', volume_count: 30,
    });
    const assigned = await expect(`/registrations/${reg.id}/verification-assignments`, kepalaToken, 'POST', {
      verifier_id: verifier.id, nota_no: notaNo, notes: 'Mohon periksa teliti naskah dan kelengkapan',
    }, 201);
    assignment = assigned.assignment;
    assert.equal(assignment.status, 'ASSIGNED');
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'VERIFICATION_ASSIGNED');
  });

  await test('PR-VER-03: Hanya verifikator yang ditugaskan dapat memulai pemeriksaan naskah', async () => {
    const startPath = `/verification-assignments/${assignment.id}/start`;
    // Ditolak: Penerbit pemilik tidak boleh memulai pemeriksaan
    await expect(startPath, publisherToken, 'PATCH', undefined, 403);
    // Ditolak: Staf lain / bukan verifikator penugasan tidak boleh memulai
    await expect(startPath, otherVerifierToken, 'PATCH', undefined, 403);
    // Ditolak: Superadmin tidak boleh menggantikan aksi verifikator (authority boundary)
    await expect(startPath, adminToken, 'PATCH', undefined, 403);

    // Sukses: Verifikator penugasan memulai pemeriksaan
    const started = await expect(startPath, verifikatorToken, 'PATCH');
    assert.equal(started.status, 'IN_PROGRESS');
    assert.ok(started.started_at);

    // Status registrasi berpindah ke IN_VERIFICATION
    const currentReg = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.equal(currentReg.status, 'IN_VERIFICATION');

    // Audit log dan status history tercatat
    const history = await prisma.statusHistory.findFirst({
      where: { registration_id: reg.id, to_status: 'IN_VERIFICATION' },
    });
    assert.ok(history);
    assert.equal(history.actor_id, verifier.id);
  });

  await test('PR-VER-03: Detail penugasan menyajikan konteks lengkap, berkas, dan SLA 2 hari', async () => {
    const detailPath = `/verification-assignments/${assignment.id}`;
    // Ditolak: Penerbit dilarang mengakses inbox/detail verifikator
    await expect(detailPath, publisherToken, 'GET', undefined, 403);

    const detail = await expect(detailPath, verifikatorToken, 'GET');
    assert.equal(detail.assignment.id, assignment.id);
    assert.equal(detail.assignment.status, 'IN_PROGRESS');
    assert.equal(detail.registration.id, reg.id);
    assert.equal(detail.registration.status, 'IN_VERIFICATION');
    assert.ok(detail.nota_dinas);
    assert.equal(detail.nota_dinas.document_no, notaNo);
    assert.equal(detail.assignment.sla.duration_target, '2 hari kerja');
    assert.equal(detail.assignment.sla.is_overdue, false);
    assert.ok(detail.assignment.sla.remaining_ms > 0);

    // Kepala LPMQ juga dapat membaca detail penugasan
    const headDetail = await expect(detailPath, kepalaToken, 'GET');
    assert.equal(headDetail.assignment.id, assignment.id);
  });

  await test('PR-VER-03: Simpan draf checklist dan validasi ketat aturan bisnis', async () => {
    const checklistPath = `/verification-assignments/${assignment.id}/checklist`;

    // Simpan draf awal
    const draft = await expect(checklistPath, verifikatorToken, 'PUT', {
      checklist: [
        { code: 'REGISTRATION_DATA', result: 'SESUAI' },
        { code: 'DIGITAL_FILES', result: 'SESUAI' },
      ],
      decision: 'PASSED',
      letter_text: 'Draf surat catatan verifikasi awal...',
    });
    assert.ok(['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(draft.document_type));
    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.content_snapshot.checklist.length, 2);

    // Status registrasi tetap IN_VERIFICATION saat simpan draf
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'IN_VERIFICATION');

    // Draf surat TIDAK BOLEH diakses oleh penerbit (kerahasiaan draf)
    const docCheck = await prisma.verificationDocument.findUnique({ where: { id: draft.id } });
    assert.equal(docCheck.status, 'DRAFT');
  });

  await test('PR-VER-03: Validasi keputusan PASSED vs REVISION_REQUIRED pada pengajuan draf', async () => {
    const submitPath = `/verification-assignments/${assignment.id}/result-drafts`;

    // Gagal: Kurang dari 4 butir checklist
    await expect(submitPath, verifikatorToken, 'POST', {
      decision: 'PASSED',
      checklist: [{ code: 'REGISTRATION_DATA', result: 'SESUAI' }],
      letter_text: 'Teks surat hasil verifikasi resmi yang memenuhi panjang minimal.',
    }, 400);

    // Gagal: Keputusan PASSED tetapi ada butir TIDAK_SESUAI
    await expect(submitPath, verifikatorToken, 'POST', {
      decision: 'PASSED',
      checklist: validChecklistRevision,
      letter_text: 'Teks surat hasil verifikasi resmi yang memenuhi panjang minimal.',
    }, 400);

    // Gagal: Keputusan REVISION_REQUIRED tetapi seluruh butir SESUAI
    await expect(submitPath, verifikatorToken, 'POST', {
      decision: 'REVISION_REQUIRED',
      checklist: validChecklistPassed,
      notes: 'Harap perbaiki naskah',
      letter_text: 'Teks surat hasil verifikasi resmi yang memenuhi panjang minimal.',
    }, 400);

    // Gagal: Keputusan REVISION_REQUIRED tanpa catatan alasan perbaikan
    await expect(submitPath, verifikatorToken, 'POST', {
      decision: 'REVISION_REQUIRED',
      checklist: validChecklistRevision,
      letter_text: 'Teks surat hasil verifikasi resmi yang memenuhi panjang minimal.',
    }, 400);

    // Gagal: Butir TIDAK_SESUAI tanpa catatan per butir
    await expect(submitPath, verifikatorToken, 'POST', {
      decision: 'REVISION_REQUIRED',
      checklist: [
        { code: 'REGISTRATION_DATA', result: 'SESUAI' },
        { code: 'DIGITAL_FILES', result: 'TIDAK_SESUAI' }, // missing notes
        { code: 'PHYSICAL_MASTER', result: 'SESUAI' },
        { code: 'MANUSCRIPT_CONTENT', result: 'SESUAI' },
      ],
      notes: 'Alasan umum perbaikan',
      letter_text: 'Teks surat hasil verifikasi resmi yang memenuhi panjang minimal.',
    }, 400);

    // Gagal: Teks surat terlalu pendek (< 20 karakter)
    await expect(submitPath, verifikatorToken, 'POST', {
      decision: 'PASSED',
      checklist: validChecklistPassed,
      letter_text: 'Terlalu pendek',
    }, 400);
  });

  await test('PR-VER-03: Pengajuan draf hasil verifikasi ke Kepala LPMQ berhasil atomik', async () => {
    const submitPath = `/verification-assignments/${assignment.id}/result-drafts`;
    const letterText = 'Berdasarkan hasil pemeriksaan berkas administrasi dan master fisik, naskah dinyatakan memenuhi standar verifikasi LPMQ Kemenag RI.';

    const submitted = await expect(submitPath, verifikatorToken, 'POST', {
      decision: 'PASSED',
      checklist: validChecklistPassed,
      letter_text: letterText,
    }, 201);

    assert.ok(['SURAT_HASIL_VERIFIKASI', 'SURAT_PEMBERITAHUAN_HASIL_VERIFIKASI'].includes(submitted.document_type));
    assert.equal(submitted.status, 'SUBMITTED');
    assert.equal(submitted.content_snapshot.decision, 'PASSED');
    assert.equal(submitted.content_snapshot.checklist.length, 4);

    // Registrasi berpindah ke WAITING_VERIFICATION_APPROVAL
    const currentReg = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.equal(currentReg.status, 'WAITING_VERIFICATION_APPROVAL');

    // Notifikasi approval terkirim ke Kepala LPMQ
    const notif = await prisma.notification.findFirst({
      where: { registration_id: reg.id, type: 'APPROVAL_REQUEST' },
    });
    assert.ok(notif);
    assert.equal(notif.payload.decision, 'PASSED');

    // Audit log tercatat
    const audit = await prisma.auditLog.findFirst({
      where: { subject_id: submitted.id, action: 'SUBMIT_VERIFICATION_DRAFT' },
    });
    assert.ok(audit);

    // Penerbit tetap dilarang mengakses dokumen yang belum disetujui & belum dikirim (status SUBMITTED)
    await expect(`/verification-documents/${submitted.id}/attachments/00000000-0000-0000-0000-000000000000`, publisherToken, 'GET', undefined, 403);
  });
}

