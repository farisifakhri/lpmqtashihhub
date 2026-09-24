import assert from 'node:assert/strict';

export async function runVerificationIntakeTests({ test, prisma, base, loginAs, publisherToken, publisherBToken, verifikatorToken, adminToken, serviceId }) {
  const kepalaToken = (await loginAs('kepala@lpmq.kemenag.go.id')).token;
  const verifier = await prisma.user.findUnique({ where: { email: 'verifikator@lpmq.kemenag.go.id' } });
  const otherRole = await prisma.user.findUnique({ where: { email: 'dokumentator@lpmq.kemenag.go.id' } });
  const call = async (path, token, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'pr-ver-02-test' },
      ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}),
    });
    return { status: response.status, json: await response.json() };
  };
  const expect = async (path, token, method, body, expectedStatus = 200) => {
    const result = await call(path, token, method, body);
    assert.equal(result.status, expectedStatus, JSON.stringify(result.json));
    return result.json.data;
  };
  const declaration = { format: 'A4', binding_method: 'PER_JUZ', volume_count: 30, delivery_method: 'KURIR', notes: 'Master dijilid per juz' };
  let reg;
  let notaNo;

  await test('PR-VER-02: deklarasi fisik dibatasi pemilik dan bukti pendaftaran aman', async () => {
    reg = await expect('/registrations', publisherToken, 'POST', { service_type_id: serviceId, title: 'Naskah Intake SOP Verifikasi' }, 201);
    await expect(`/registrations/${reg.id}/physical-master`, publisherBToken, 'PUT', declaration, 403);
    await expect(`/registrations/${reg.id}/physical-master`, publisherToken, 'PUT', { ...declaration, format: 'A5' }, 400);
    const intake = await expect(`/registrations/${reg.id}/physical-master`, publisherToken, 'PUT', declaration);
    assert.equal(intake.status, 'PENDING');
    assert.equal((await expect(`/registrations/${reg.id}`, publisherToken)).physical_master_intake.status, 'PENDING');
    await expect(`/registrations/${reg.id}/receipt`, publisherToken, 'GET', undefined, 409);
    await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST');
    await expect(`/registrations/${reg.id}/receipt`, publisherBToken, 'GET', undefined, 403);
    const receipt = await expect(`/registrations/${reg.id}/receipt`, publisherToken);
    assert.equal(receipt.registration_no, reg.registration_no);
    assert.equal(receipt.physical_master.status, 'PENDING');
    assert.equal(JSON.stringify(receipt).includes('file_id'), false);
  });

  await test('PR-VER-02: Admin Internal atau Superadmin dapat menugaskan verifikator aktif', async () => {
    notaNo = `ND-VER-${reg.registration_no}`;
    const assignPath = `/registrations/${reg.id}/verification-assignments`;
    await expect(assignPath, adminToken, 'POST', { verifier_id: verifier.id, nota_no: notaNo }, 409);
    await expect(assignPath, kepalaToken, 'POST', { verifier_id: verifier.id, nota_no: notaNo }, 403);
    await expect(`/registrations/${reg.id}/physical-master/receive`, verifikatorToken, 'POST', { decision: 'RECEIVED', receipt_no: `TR-${reg.registration_no}`, condition: 'Baik', volume_count: 30 }, 403);
    // KB-01: Kepala LPMQ dilarang menerima master fisik
    await expect(`/registrations/${reg.id}/physical-master/receive`, kepalaToken, 'POST', { decision: 'RECEIVED', receipt_no: `TR-${reg.registration_no}`, condition: 'Baik', volume_count: 30 }, 403);
    await expect(`/registrations/${reg.id}/physical-master/receive`, adminToken, 'POST', { decision: 'RECEIVED', receipt_no: `TR-${reg.registration_no}`, condition: 'Baik', volume_count: 29 }, 409);
    const received = await expect(`/registrations/${reg.id}/physical-master/receive`, adminToken, 'POST', { decision: 'RECEIVED', receipt_no: `TR-${reg.registration_no}`, condition: 'Baik', volume_count: 30 });
    assert.equal(received.status, 'RECEIVED');
    assert.equal((await expect(`/registrations/${reg.id}/receipt`, publisherToken)).physical_master.receipt_no, `TR-${reg.registration_no}`);

    // P0-01: Verifikasi antrean kandidat penugasan Admin Internal
    const candidates = await expect('/verification-assignment-candidates', adminToken);
    assert.ok(candidates.items.some(item => item.id === reg.id));
    const candidateItem = candidates.items.find(item => item.id === reg.id);
    assert.equal(candidateItem.operational_state, 'READY_FOR_ASSIGNMENT');
    assert.equal(candidateItem.physical_master.receipt_no, `TR-${reg.registration_no}`);

    // P0-02: Verifikasi direktori verifikator aktif
    const verifiersList = await expect('/verification-verifiers?status=ACTIVE', adminToken);
    assert.ok(Array.isArray(verifiersList));
    assert.ok(verifiersList.some(v => v.id === verifier.id));
    const verifierObj = verifiersList.find(v => v.id === verifier.id);
    assert.equal(typeof verifierObj.active_assignment_count, 'number');

    // P0-03: Notifikasi idempoten ke Admin Internal saat intake RECEIVED
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin.internal@lpmq.kemenag.go.id' } });
    const adminNotif = await prisma.notification.findFirst({
      where: { registration_id: reg.id, user_id: adminUser.id, type: 'VERIFICATION_ASSIGNMENT_REQUIRED' },
    });
    assert.ok(adminNotif);
    assert.equal(adminNotif.payload.receipt_no, `TR-${reg.registration_no}`);

    await expect(assignPath, adminToken, 'POST', { verifier_id: otherRole.id, nota_no: notaNo }, 400);

  });

  let createdNotaNo = null;

  await test('PR-VER-02: assignment paralel menghasilkan satu Nota Dinas, status, audit, dan notifikasi', async () => {
    const path = `/registrations/${reg.id}/verification-assignments`;
    const nota1 = `${notaNo}-01`;
    const nota2 = `${notaNo}-02`;
    const results = await Promise.all([
      call(path, adminToken, 'POST', { verifier_id: verifier.id, nota_no: nota1, notes: 'Periksa naskah dan dokumen penerbit' }),
      call(path, adminToken, 'POST', { verifier_id: verifier.id, nota_no: nota2, notes: 'Periksa naskah dan dokumen penerbit' }),
    ]);
    assert.deepEqual(results.map(item => item.status).sort(), [201, 409]);
    const created = results.find(item => item.status === 201).json.data;
    createdNotaNo = created.nota_dinas.document_no;
    assert.equal(created.assignment.status, 'ASSIGNED');
    assert.ok([nota1, nota2].includes(created.nota_dinas.document_no));
    assert.equal(created.nota_dinas.status, 'ISSUED');
    assert.ok(new Date(created.assignment.due_at).getTime() > new Date(created.assignment.assigned_at).getTime());
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'VERIFICATION_ASSIGNED');
    assert.equal(await prisma.verificationAssignment.count({ where: { registration_id: reg.id } }), 1);
    assert.equal(await prisma.verificationDocument.count({ where: { registration_id: reg.id, document_type: 'NOTA_DINAS_VERIFIKASI' } }), 1);
    assert.equal(await prisma.statusHistory.count({ where: { registration_id: reg.id, to_status: 'VERIFICATION_ASSIGNED' } }), 1);
    assert.equal(await prisma.notification.count({ where: { registration_id: reg.id, user_id: verifier.id, type: 'ASSIGNMENT' } }), 1);
    const audit = await prisma.auditLog.findFirst({ where: { subject_id: created.assignment.id, action: 'CREATE_VERIFICATION_ASSIGNMENT' } });
    assert.equal(audit.user_agent, 'pr-ver-02-test');
    assert.ok(audit.ip_address);
    await expect(`/registrations/${reg.id}/physical-master/receive`, adminToken, 'POST', { decision: 'RECEIVED', receipt_no: `TR-${reg.registration_no}`, condition: 'Baik', volume_count: 30 }, 409);
  });

  await test('PR-VER-02: inbox terfilter dan hanya tersedia bagi petugas berwenang', async () => {
    await expect('/verification-assignments', publisherToken, 'GET', undefined, 403);
    const verifierInbox = await expect('/verification-assignments?my_tasks=true&status=ASSIGNED&limit=2', verifikatorToken);
    assert.ok(verifierInbox.items.some(item => item.registration_id === reg.id && item.documents.some(doc => doc.document_no === createdNotaNo)));
    const headInbox = await expect('/verification-assignments?my_tasks=true&status=ASSIGNED', kepalaToken);
    assert.equal(headInbox.items.some(item => item.registration_id === reg.id), false);
    const adminInbox = await expect('/verification-assignments?status=ASSIGNED', adminToken);
    assert.ok(adminInbox.items.some(item => item.registration_id === reg.id));
    await expect(`/registrations/${reg.id}/verification-assignments`, adminToken, 'POST', { verifier_id: verifier.id, nota_no: 'ND-ADMIN-ALREADY-ASSIGNED' }, 409);
  });

  await test('PR-VER-02: master yang dikembalikan tidak dapat ditugaskan sebelum deklarasi ulang', async () => {
    const another = await expect('/registrations', publisherToken, 'POST', { service_type_id: serviceId, title: 'Naskah Master Dikembalikan' }, 201);
    await expect(`/registrations/${another.id}/physical-master`, publisherToken, 'PUT', declaration);
    await expect(`/registrations/${another.id}/submit`, publisherToken, 'POST');
    await expect(`/registrations/${another.id}/physical-master/receive`, adminToken, 'POST', { decision: 'RETURNED', condition: 'Jilid rusak', volume_count: 30, notes: 'Perbaiki jilid per juz' });
    const path = `/registrations/${another.id}/verification-assignments`;
    await expect(path, adminToken, 'POST', { verifier_id: verifier.id, nota_no: notaNo }, 409);
    const reset = await expect(`/registrations/${another.id}/physical-master`, publisherToken, 'PUT', declaration);
    assert.equal(reset.status, 'PENDING');
    await expect(`/registrations/${another.id}/physical-master/receive`, adminToken, 'POST', { decision: 'RECEIVED', receipt_no: `TR-${reg.registration_no}`, condition: 'Baik', volume_count: 30 }, 409);
    assert.equal((await prisma.physicalMasterIntake.findUnique({ where: { registration_id: another.id } })).status, 'PENDING');
    await expect(`/registrations/${another.id}/physical-master/receive`, adminToken, 'POST', { decision: 'RECEIVED', receipt_no: `TR-${another.registration_no}`, condition: 'Baik', volume_count: 30 });
    await expect(path, adminToken, 'POST', { verifier_id: verifier.id, nota_no: createdNotaNo }, 409);
    assert.equal(await prisma.verificationAssignment.count({ where: { registration_id: another.id } }), 0);
    assert.equal((await prisma.registration.findUnique({ where: { id: another.id } })).status, 'READY_FOR_VERIFICATION');
  });
}
