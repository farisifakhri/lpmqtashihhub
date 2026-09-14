import assert from 'node:assert/strict';
import { markOverdue, jakartaDate } from '../src/services/sla.service.js';

export async function runWorkflowTests({ test, prisma, base, loginAs, publisherToken, publisherBToken, verifikatorToken, dokumentatorToken, adminToken, serviceId }) {
  const call = async (path, token, method = 'GET', body) => {
    const res = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}) });
    return { status: res.status, json: await res.json() };
  };
  const expect = async (path, token, method, body, status = 200) => {
    const result = await call(path, token, method, body);
    assert.equal(result.status, status, JSON.stringify(result.json));
    return result.json.data;
  };
  const upload = async () => {
    const response = await fetch(`${base}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${publisherToken}`, 'Content-Type': 'application/pdf' }, body: Buffer.from('%PDF-1.4\n%%EOF') });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  };
  let reg, file, payment, assignments;
  const distributor = (await loginAs('distributor@lpmq.kemenag.go.id')).token;
  const pentashih = (await loginAs('pentashih@lpmq.kemenag.go.id')).token;
  const kepala = (await loginAs('kepala@lpmq.kemenag.go.id')).token;
  const assignee = await prisma.user.findUnique({ where: { email: 'pentashih@lpmq.kemenag.go.id' } });
  const team = await prisma.distributionTeam.findFirst({ where: { members: { some: { user_id: assignee.id } }, status: 'ACTIVE' } });

  await test('Workflow: unggahan server, isolasi berkas, dan pembatasan metadata naskah', async () => {
    reg = await expect('/registrations', publisherToken, 'POST', { service_type_id: serviceId, title: 'Pengujian Alur Pembayaran dan Sidang' }, 201);
    file = await upload();
    assert.equal(file.checksum.length, 64);
    await expect(`/registrations/${reg.id}/manuscripts`, publisherToken, 'POST', { type: 'COVER', file_id: file.id }, 201);
    await expect(`/registrations/${reg.id}/manuscripts`, publisherToken, 'POST', { type: 'COVER', file_id: 'arbitrary/path.pdf' }, 400);
    await expect(`/registrations/${reg.id}/manuscripts`, dokumentatorToken, 'GET', undefined, 403);
    await expect(`/uploads/${file.id}`, publisherBToken, 'GET', undefined, 403);
    const detail = await expect(`/registrations/${reg.id}`, dokumentatorToken);
    assert.deepEqual(detail.manuscript_files, []);
    await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST');
    await expect(`/registrations/${reg.id}/status`, verifikatorToken, 'PATCH', { to_status: 'IN_VERIFICATION' });
    const read = await fetch(`${base}/uploads/${file.id}`, { headers: { Authorization: `Bearer ${verifikatorToken}` } });
    assert.equal(read.status, 200);
    await expect(`/registrations/${reg.id}/status`, verifikatorToken, 'PATCH', { to_status: 'WAITING_VERIFICATION_APPROVAL' });
  });

  await test('SOP: persetujuan Kepala dan pengembalian draf tetap menjadi tugas verifikator', async () => {
    const path = `/registrations/${reg.id}/status`;
    const before = await prisma.verificationAssignment.findMany({ where: { registration_id: reg.id } });
    await expect(path, verifikatorToken, 'PATCH', { to_status: 'AWAITING_PAYMENT' }, 403);
    await expect(path, adminToken, 'PATCH', { to_status: 'AWAITING_PAYMENT' }, 403);
    await expect(path, verifikatorToken, 'PATCH', { to_status: 'IN_VERIFICATION', notes: 'Ditolak sendiri' }, 403);
    await expect(path, kepala, 'PATCH', { to_status: 'REVISION_REQUIRED', notes: 'Salah tujuan revisi' }, 400);
    await expect(path, kepala, 'PATCH', { to_status: 'IN_VERIFICATION' }, 400);
    await expect(path, kepala, 'PATCH', { to_status: 'IN_VERIFICATION', notes: 'Perbaiki draf surat pemberitahuan' });
    const after = await prisma.verificationAssignment.findMany({ where: { registration_id: reg.id } });
    assert.deepEqual(after, before, 'Kepala tidak menjadi verifikator baru dan penugasan semula dipertahankan');
    await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST', {}, 400);
    await expect(`/registrations/${reg.id}/manuscripts`, verifikatorToken);
    await expect(path, verifikatorToken, 'PATCH', { to_status: 'WAITING_VERIFICATION_APPROVAL' });
    await expect(path, kepala, 'PATCH', { to_status: 'AWAITING_PAYMENT' });
    const history = await prisma.statusHistory.findFirst({ where: { registration_id: reg.id, from_status: 'WAITING_VERIFICATION_APPROVAL', to_status: 'IN_VERIFICATION' } });
    assert.equal(history.notes, 'Perbaiki draf surat pemberitahuan');
  });

  await test('Workflow: billing concurrent menghasilkan tepat satu tagihan dan nominal snapshot', async () => {
    await expect(`/registrations/${reg.id}/payments`, publisherToken, 'POST', {}, 403);
    const results = await Promise.all([call(`/registrations/${reg.id}/payments`, verifikatorToken, 'POST'), call(`/registrations/${reg.id}/payments`, verifikatorToken, 'POST')]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    payment = results.find(result => result.status === 201).json.data;
    const stored = await prisma.registration.findUnique({ where: { id: reg.id } });
    assert.equal(Number(payment.amount), stored.fee_sla_snapshot.total_fee);
    await expect(`/payments/${payment.id}/verify`, verifikatorToken, 'PATCH', {}, 409);
    await expect(`/payments/${payment.id}/confirm`, publisherBToken, 'POST', { receipt_file_id: file.id }, 403);
    await expect(`/registrations/${reg.id}/status`, adminToken, 'PATCH', { to_status: 'PAYMENT_VERIFICATION' }, 400);
    await expect(`/payments/${payment.id}/confirm`, publisherToken, 'POST', { receipt_file_id: file.id });
    const results2 = await Promise.all([call(`/payments/${payment.id}/verify`, verifikatorToken, 'PATCH'), call(`/payments/${payment.id}/verify`, verifikatorToken, 'PATCH')]);
    assert.deepEqual(results2.map(result => result.status).sort(), [200, 409]);
    assert.equal(await prisma.notification.count({ where: { registration_id: reg.id, type: 'PAYMENT_CONFIRMED' } }), 1);
  });

  await test('Workflow: distribusi tervalidasi, SLA aktif, dan hasil sidang tidak bisa dilewati', async () => {
    // Synthetic test calendar: never a source of production holiday policy.
    const start = new Date(`${jakartaDate(new Date())}T00:00:00Z`);
    const calendar = Array.from({ length: 90 }, (_, index) => ({ date: new Date(start.getTime() + (index + 1) * 86400000), is_working_day: true, source: `TEST-${reg.id}` }));
    await prisma.workingDay.createMany({ data: calendar, skipDuplicates: true });
    await expect(`/registrations/${reg.id}/assignments`, publisherToken, 'POST', { team_id: team.id, assignee_ids: [assignee.id], stage: 'INITIAL' }, 403);
    assignments = await expect(`/registrations/${reg.id}/assignments`, distributor, 'POST', { team_id: team.id, assignee_ids: [assignee.id], stage: 'INITIAL' }, 201);
    assert.equal(assignments.length, 1);
    assert.ok(assignments[0].due_at);
    await expect(`/registrations/${reg.id}/distribution-review`, distributor, 'POST', { result: 'PASSED', notes: 'Belum ada hasil' }, 409);
    await expect(`/assignments/${assignments[0].id}/review`, distributor, 'POST', { result: 'PASSED', notes: 'Tidak berwenang' }, 403);
    const overdueDate = new Date(Date.now() - 86400000);
    await prisma.assignment.update({ where: { id: assignments[0].id }, data: { due_at: overdueDate } });
    await markOverdue();
    assert.equal((await prisma.assignment.findUnique({ where: { id: assignments[0].id } })).status, 'OVERDUE');
    const load = await expect(`/distribution-teams/${team.id}/workload`, distributor);
    assert.ok(load.some(item => item.assignee_id === assignee.id && item.status === 'OVERDUE'));
    await expect(`/registrations/${reg.id}/manuscripts`, pentashih);
    await expect(`/assignments/${assignments[0].id}/review`, pentashih, 'POST', { result: 'REVISION_REQUIRED', notes: 'Perbaiki naskah' }, 201);
    await expect(`/assignments/${assignments[0].id}/review`, pentashih, 'POST', { result: 'PASSED', notes: 'Duplikat' }, 409);
    await expect(`/registrations/${reg.id}/distribution-review`, distributor, 'POST', { result: 'PASSED', notes: 'Hasil belum lulus' }, 409);
    await expect(`/registrations/${reg.id}/distribution-review`, distributor, 'POST', { result: 'REVISION_REQUIRED', notes: 'Perbaikan oleh penerbit' });
  });

  await test('Workflow: revisi mempertahankan tarif, pembayaran, dan riwayat iterasi', async () => {
    const before = await prisma.registration.findUnique({ where: { id: reg.id } });
    await expect(`/registrations/${reg.id}/manuscripts`, publisherToken, 'POST', { type: 'COVER', file_id: file.id }, 201);
    const submitted = await expect(`/registrations/${reg.id}/submit`, publisherToken, 'POST');
    assert.equal(submitted.status, 'WAITING_DISTRIBUTION');
    assert.deepEqual(submitted.fee_sla_snapshot, before.fee_sla_snapshot);
    const next = await expect(`/registrations/${reg.id}/assignments`, distributor, 'POST', { team_id: team.id, assignee_ids: [assignee.id], stage: 'REVISION' }, 201);
    assert.equal(next[0].iteration, 2);
    assert.equal(await prisma.paymentRecord.count({ where: { registration_id: reg.id } }), 1);
    assert.equal(await prisma.tashihReview.count({ where: { assignment_id: assignments[0].id } }), 1);
    await expect(`/assignments/${next[0].id}/review`, pentashih, 'POST', { result: 'PASSED', notes: 'Perbaikan sesuai' }, 201);
    await expect(`/registrations/${reg.id}/distribution-review`, distributor, 'POST', { result: 'PASSED', notes: 'Rekomendasi STT disetujui' });
    assert.equal((await prisma.registration.findUnique({ where: { id: reg.id } })).status, 'READY_FOR_STT');
  });

  await test('Workflow: versi draf dokumen, PDF privat, dan larangan penetapan tanpa SOP', async () => {
    const doc = await expect(`/registrations/${reg.id}/official-documents`, dokumentatorToken, 'POST', { document_type: 'BERITA_ACARA_TASHIH' }, 201);
    const next = await expect(`/registrations/${reg.id}/official-documents`, dokumentatorToken, 'POST', { document_type: 'BERITA_ACARA_TASHIH' }, 201);
    assert.equal(next.version, doc.version + 1);
    const pdf = await fetch(`${base}/official-documents/${doc.id}/pdf`, { headers: { Authorization: `Bearer ${dokumentatorToken}` } });
    assert.equal(pdf.status, 200);
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    await expect(`/official-documents/${doc.id}/pdf`, publisherToken, 'GET', undefined, 403);
    await expect(`/official-documents/${doc.id}/sign`, adminToken, 'POST', {}, 403);
    await expect(`/official-documents/${doc.id}/sign`, kepala, 'POST', {}, 409);
    assert.equal((await fetch(`${base}/public/verify-document/${doc.qr_token}`)).status, 404);
    assert.deepEqual((await expect(`/registrations/${reg.id}`, publisherToken)).official_documents, []);
  });

  await test('Workflow: notifikasi hanya dapat dibaca oleh penerima', async () => {
    const notifications = await expect('/notifications', publisherToken);
    const notification = notifications.find(item => item.registration_id === reg.id);
    assert.ok(notification);
    await expect(`/notifications/${notification.id}/read`, publisherBToken, 'PATCH', {}, 404);
    assert.ok((await expect(`/notifications/${notification.id}/read`, publisherToken, 'PATCH')).read_at);
  });
  await test('Workflow: kalender menolak tanggal palsu dan akses penerbit', async () => {
    await expect('/master/working-days', publisherToken, 'PUT', { days: [] }, 403);
    await expect('/master/working-days', adminToken, 'PUT', { days: [{ date: '2026-02-30', source: 'TEST', is_working_day: true }] }, 400);
  });
  if (reg) await prisma.workingDay.deleteMany({ where: { source: `TEST-${reg.id}` } });
}
