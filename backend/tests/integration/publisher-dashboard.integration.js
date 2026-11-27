import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { unlink } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { assertIsolatedTestDatabase } from '../../src/utils/test-database.js';
import { listRegistrations } from '../../src/services/registration.service.js';

assertIsolatedTestDatabase(process.env.DATABASE_URL);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
const uploads = [];
let checks = 0;
const call = async (path, token, method = 'GET', body, status = 200) => {
  const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
  checks += 1;
  return result;
};
try {
  const owner = await prisma.user.findUnique({ where: { email: 'penerbit@mushafnusantara.com' }, include: { publisher: true } });
  const token = (await call('/auth/login', '', 'POST', { email: owner.email, password: 'password123' })).data.token;
  const staffToken = (await call('/auth/login', '', 'POST', { email: 'verifikator@lpmq.kemenag.go.id', password: 'password123' })).data.token;
  const service = await prisma.serviceType.findFirst();
  const foreign = await prisma.publisher.create({ data: { legal_name: 'Foreign dashboard fixture', entity_type: 'PT', address: 'Test', phone: '0800000000' } });
  const prefix = `Publisher dashboard ${Date.now()}`;
  const create = (suffix, status, publisherId = owner.publisher.id, createdAt = new Date()) => prisma.registration.create({ data: { title: `${prefix} ${suffix}`, registration_no: `${prefix}-${suffix}`, service_type_id: service.id, publisher_id: publisherId, status, created_at: createdAt } });
  const draft = await create('draft', 'DRAFT', undefined, new Date('2026-01-01T00:00:00Z'));
  const revision = await create('revision', 'REVISION_REQUIRED', undefined, new Date('2026-01-02T00:00:00Z'));
  const payment = await create('payment', 'AWAITING_PAYMENT', undefined, new Date('2026-01-03T00:00:00Z'));
  await create('processing', 'IN_VERIFICATION');
  const complete = await create('complete', 'COMPLETED');
  const foreignReg = await create('foreign', 'DRAFT', foreign.id);
  const draftDoc = await prisma.officialDocument.create({ data: { registration_id: draft.id, document_type: 'SURAT_TANDA_TASHIH', document_no: `${prefix}-draft-doc` } });
  const issued = await prisma.officialDocument.create({ data: { registration_id: complete.id, document_type: 'SURAT_TANDA_TASHIH', document_no: `${prefix}-issued`, status: 'ISSUED', issued_at: new Date() } });
  const foreignDoc = await prisma.officialDocument.create({ data: { registration_id: foreignReg.id, document_type: 'SURAT_TANDA_TASHIH', document_no: `${prefix}-foreign-doc`, status: 'ISSUED' } });

  const list = await call(`/registrations?search=${encodeURIComponent(prefix)}&limit=1`, token);
  assert.equal(list.data.length, 1);
  assert.equal(list.pagination.total, 5);
  assert.equal(Object.values(list.summary.by_status).reduce((a, b) => a + b, 0), 5);
  assert.equal(list.summary.issued_stt, 1);
  assert.equal(list.data[0].queue_position, null);
  const actions = await call(`/registrations?search=${encodeURIComponent(prefix)}&segment=PUBLISHER_ACTIONS&limit=1`, token);
  assert.equal(actions.pagination.total, 2);
  assert.equal(actions.data.some(item => item.id === draft.id), false, 'Drafts are excluded from publisher actions');
  assert.equal(actions.data[0].id, payment.id, 'Publisher actions use newest-first order, not internal FIFO');
  assert.equal(Object.values(actions.summary.by_status).reduce((a, b) => a + b, 0), 5);
  const filtered = await call(`/registrations?search=${encodeURIComponent(prefix)}&segment=PUBLISHER_PROCESSING`, token);
  assert.equal(filtered.pagination.total, 2);
  assert.ok(filtered.data.some(item => item.id === payment.id), 'Menunggu pembayaran tetap tampil di Lacak Status');
  const documents = await call(`/registrations?search=${encodeURIComponent(prefix)}&segment=PUBLISHER_DOCUMENTS`, token);
  assert.equal(documents.pagination.total, 2);
  assert.deepEqual(documents.data[0].official_documents.map(item => item.id), [issued.id]);
  const drafts = await call(`/registrations?search=${encodeURIComponent(prefix)}&status=DRAFT`, token);
  assert.deepEqual(drafts.data[0].official_documents, []);
  const baseItem = await prisma.jenisNaskahItem.findFirst({ where: { role: 'DASAR', service_kind: 'CETAK', status: 'ACTIVE' } });
  const draftUpdate = {
    title: `${prefix} draft updated`, service_type_id: service.id, registration_type: 'NEW',
    statement_accepted: true,
    mushaf_details: { penanggung_jawab_produk: 'Penanggung Jawab Uji' },
    foreign_metadata: { nama_mushaf: `${prefix} draft updated`, jenis_naskah: [baseItem.name], jenis_mushaf: 'Mushaf Standar Usmani' },
    manuscripts: [{ seq_number: 1, title: `${prefix} draft updated`, items: [baseItem.code], variants: [{ ukuran: '21 x 29', oplah: 100 }] }],
  };
  const updatedDraft = await call(`/registrations/${draft.id}/draft`, token, 'PUT', draftUpdate);
  assert.equal(updatedDraft.data.id, draft.id);
  assert.equal(updatedDraft.data.registration_no, draft.registration_no);
  assert.equal(await prisma.manuscript.count({ where: { registration_id: draft.id } }), 1);
  const secondUpdate = await call(`/registrations/${draft.id}/draft`, token, 'PUT', { ...draftUpdate, title: `${prefix} edited again` });
  assert.equal(secondUpdate.data.id, draft.id);
  assert.equal(await prisma.manuscript.count({ where: { registration_id: draft.id } }), 1, 'Updating a draft replaces, rather than duplicates, its manuscripts');
  await call(`/registrations/${foreignReg.id}/draft`, token, 'PUT', draftUpdate, 403);
  await call(`/registrations/${foreignReg.id}`, token, 'GET', undefined, 403);
  await call(`/registrations/${foreignReg.id}/timeline`, token, 'GET', undefined, 403);
  await call(`/registrations/${foreignReg.id}/payment`, token, 'GET', undefined, 403);
  await assert.rejects(listRegistrations({ user: { roles: ['PENERBIT'] } }), error => error.statusCode === 403);
  await prisma.statusHistory.create({ data: { registration_id: revision.id, from_status: 'IN_VERIFICATION', to_status: 'REVISION_REQUIRED', actor_id: owner.id, notes: 'Perbaiki halaman 3' } });
  const timeline = await call(`/registrations/${revision.id}/timeline`, token);
  assert.equal(timeline.data.is_sanitized, true);
  assert.equal(timeline.data.timeline[0].notes, 'Perbaiki halaman 3');
  assert.equal(timeline.data.timeline[0].actor, undefined);

  const pdf = await PDFDocument.create(); pdf.addPage();
  const bytes = Buffer.from(await pdf.save());
  const uploadResponse = await fetch(`${base}/uploads`, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent('dokumen-uji.pdf'), Authorization: `Bearer ${token}` }, body: bytes });
  assert.equal(uploadResponse.status, 201);
  const file = (await uploadResponse.json()).data;
  uploads.push(file.id);
  assert.equal(file.file_name, 'dokumen-uji.pdf');
  await call(`/registrations/${draft.id}/draft`, token, 'PUT', { ...draftUpdate, cover_file_id: file.id }, 400);
  const coverBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/gWQAAAAASUVORK5CYII=', 'base64');
  const coverUploadResponse = await fetch(`${base}/uploads`, { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-File-Name': encodeURIComponent('cover-uji.png'), Authorization: `Bearer ${token}` }, body: coverBytes });
  assert.equal(coverUploadResponse.status, 201);
  const coverFile = (await coverUploadResponse.json()).data;
  uploads.push(coverFile.id);
  const uploadPayload = { type: 'COVER', file_id: file.id };
  await call(`/registrations/${draft.id}/manuscripts`, token, 'POST', uploadPayload, 201);
  await call(`/registrations/${draft.id}/manuscripts`, token, 'POST', uploadPayload, 201);
  assert.deepEqual((await prisma.manuscriptFile.findMany({ where: { registration_id: draft.id }, orderBy: { version: 'asc' } })).map(item => item.version), [1, 2]);
  await call(`/registrations/${foreignReg.id}/manuscripts`, token, 'POST', uploadPayload, 403);
  await call(`/registrations/${revision.id}/manuscripts`, token, 'POST', { ...uploadPayload, type: 'DUMMY' }, 201);
  const processing = filtered.data[0];
  await call(`/registrations/${processing.id}/manuscripts`, token, 'POST', uploadPayload, 409);

  const submissionPayload = {
    ...draftUpdate,
    foreign_metadata: {
      ...draftUpdate.foreign_metadata,
      penanggung_jawab_produk: 'Penanggung Jawab Uji',
      jenis_mushaf: 'Mushaf Standar Usmani',
      surat_permohonan_file_id: file.id,
      cover_file_id: coverFile.id,
      contoh_halaman_file_id: file.id,
    },
    surat_permohonan_file_id: file.id,
    cover_file_id: coverFile.id,
    contoh_halaman_file_id: file.id,
  };
  await call(`/registrations/${draft.id}/draft`, token, 'PUT', submissionPayload);
  const submitted = await call(`/registrations/${draft.id}/submit`, token, 'POST', {});
  assert.equal(submitted.data.status, 'READY_FOR_VERIFICATION');
  assert.equal(submitted.data.id, draft.id);
  assert.equal(submitted.data.registration_no, draft.registration_no);
  assert.equal(await prisma.registration.count({ where: { registration_no: draft.registration_no } }), 1);
  assert.equal(await prisma.manuscript.count({ where: { registration_id: draft.id } }), 1);
  for (const type of ['SURAT_PERMOHONAN', 'COVER', 'SAMPLE_PAGE_1_5']) {
    assert.equal(await prisma.manuscriptFile.count({ where: { registration_id: draft.id, type } }), 1, `${type} attachment is not duplicated`);
  }
  const resumedDetail = await call(`/registrations/${draft.id}`, token);
  assert.equal(resumedDetail.data.manuscript_files.find(item => item.type === 'SURAT_PERMOHONAN')?.uploaded_file?.file_name, 'dokumen-uji.pdf');
  assert.equal(resumedDetail.data.manuscript_files.find(item => item.type === 'COVER')?.uploaded_file?.file_size, coverBytes.length);
  const draftsAfterSubmit = await call(`/registrations?search=${encodeURIComponent(prefix)}&status=DRAFT`, token);
  assert.equal(draftsAfterSubmit.data.some(item => item.id === draft.id), false);

  const archive = await call(`/registrations/${draft.id}/document-archive`, token);
  // Draf STT belum diparaf TU / disahkan Kepala: tidak tampil di arsip penerbit.
  assert.equal(archive.data.some(item => item.id === draftDoc.id), false);
  await call(`/registrations/${foreignReg.id}/document-archive`, token, 'GET', undefined, 403);
  await call(`/official-documents/${draftDoc.id}/pdf`, token, 'GET', undefined, 409);
  await call(`/official-documents/${foreignDoc.id}/pdf`, token, 'GET', undefined, 403);
  await call(`/official-documents/${issued.id}/pdf`, token, 'GET', undefined, 409);
  await prisma.officialDocument.update({ where: { id: issued.id }, data: { file_id: file.id } });
  const download = await fetch(`${base}/official-documents/${issued.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes, 'Official PDF bytes must remain unchanged');
  await prisma.storedFile.update({ where: { id: file.id }, data: { checksum: '0'.repeat(64) } });
  await call(`/official-documents/${issued.id}/pdf`, token, 'GET', undefined, 409);
  await prisma.storedFile.update({ where: { id: file.id }, data: { checksum: file.checksum } });
  await call(`/official-documents/${issued.id}/pdf`, staffToken, 'GET', undefined, 403);
  await prisma.officialDocument.update({ where: { id: issued.id }, data: { status: 'REVOKED' } });
  await call(`/official-documents/${issued.id}/pdf`, token, 'GET', undefined, 409);
  await prisma.officialDocument.update({ where: { id: issued.id }, data: { status: 'ISSUED', valid_until: new Date('2000-01-01T00:00:00Z') } });
  await call(`/official-documents/${issued.id}/pdf`, token, 'GET', undefined, 409);
  console.log(`Publisher dashboard integration passed: ${checks} HTTP checks plus scoped totals, pagination, versioning and immutable PDF assertions.`);
} finally {
  await new Promise(resolve => server.close(resolve));
  for (const id of uploads) await unlink(new URL(`../../storage/private/${id}`, import.meta.url));
  await prisma.$disconnect();
}
