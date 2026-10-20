import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import crypto from 'node:crypto';
import app from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { assertIsolatedTestDatabase } from '../src/utils/test-database.js';

assertIsolatedTestDatabase(process.env.DATABASE_URL);

// Buat buffer PDF valid minimal untuk pengetesan (%PDF- ... %%EOF)
function createValidDummyPdf(extraText = '') {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n${extraText}\ntrailer\n<< /Root 1 0 R >>\n%%EOF`);
}

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/api/v1`;

let assertions = 0;

const callJson = async (path, token, method = 'GET', body, expected = 200) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === 'GET' || body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
  assertions += 1;
  return result;
};

const callMultipart = async (path, token, method = 'POST', formData, expected = 200) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
  assertions += 1;
  return result;
};

try {
  console.log('--- Memulai Pengujian Integrasi Pendaftaran Penerbit (T-F06) ---');

  // Ambil token ADMIN_INTERNAL dan SUPERADMIN
  const adminLogin = await callJson('/auth/login', null, 'POST', {
    email: 'admin.internal@lpmq.kemenag.go.id',
    password: 'password123',
  });
  const adminToken = adminLogin.data.token;

  const superadminLogin = await callJson('/auth/login', null, 'POST', {
    email: 'admin@lpmq.kemenag.go.id',
    password: 'password123',
  });
  const superadminToken = superadminLogin.data.token;

  const penerbitLogin = await callJson('/auth/login', null, 'POST', {
    email: 'penerbit@mushafnusantara.com',
    password: 'password123',
  });
  const penerbitToken = penerbitLogin.data.token;

  const testEmail1 = `pt.uji.${Date.now()}@pustakacahaya.co.id`;
  const testNpwp1 = '01.234.567.8-999.000';
  const testNib1 = '9120001234999';
  const testPassword = 'PasswordRahasia123';

  // Bersihkan data uji sebelumnya jika ada
  await prisma.publisherRegistration.deleteMany({
    where: { email: { in: [testEmail1] } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail1] } },
  });

  // -------------------------------------------------------------------------
  // Skenario 1: Penolakan jika dokumen wajib belum lengkap (DOCUMENT_REQUIRED)
  // -------------------------------------------------------------------------
  console.log('1. Menguji penolakan pendaftaran jika dokumen wajib tidak ada...');
  const incompleteForm = new FormData();
  incompleteForm.append('nama_penerbit', 'PT Cahaya Uji Coba');
  incompleteForm.append('jenis_penerbit', 'PERUSAHAAN');
  incompleteForm.append('alamat_lengkap', 'Jl. Percetakan Mushaf No. 99 Jakarta');
  incompleteForm.append('nama_penanggung_jawab', 'Budi Santoso');
  incompleteForm.append('telepon_penanggung_jawab', '081234567899');
  incompleteForm.append('email', testEmail1);
  incompleteForm.append('password', testPassword);
  incompleteForm.append('npwp', testNpwp1);
  incompleteForm.append('nib', testNib1);
  // Lampirkan hanya 1 file (kurang)
  incompleteForm.append('dokumen_surat_pendaftaran', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'surat.pdf');

  const incompleteRes = await callMultipart('/publisher-registrations', null, 'POST', incompleteForm, 400);
  assert.equal(incompleteRes.code, 'DOCUMENT_REQUIRED');
  assert.equal(incompleteRes.success, false);
  console.log('   ✓ Penolakan dokumen tidak lengkap berhasil diverifikasi (400 DOCUMENT_REQUIRED)');

  // -------------------------------------------------------------------------
  // Skenario 2: Pendaftaran baru berhasil dengan 6 dokumen lengkap (201 Created)
  // -------------------------------------------------------------------------
  console.log('2. Menguji pendaftaran publik penerbit PERUSAHAAN lengkap...');
  const validForm = new FormData();
  validForm.append('nama_penerbit', 'PT Pustaka Cahaya Mandiri');
  validForm.append('jenis_penerbit', 'PERUSAHAAN');
  validForm.append('alamat_lengkap', 'Jl. Percetakan Mushaf No. 12, Jakarta Timur');
  validForm.append('nama_penanggung_jawab', 'Ahmad Subagio');
  validForm.append('telepon_penanggung_jawab', '081234567890');
  validForm.append('email', testEmail1);
  validForm.append('password', testPassword);
  validForm.append('npwp', testNpwp1);
  validForm.append('nib', testNib1);

  validForm.append('dokumen_surat_pendaftaran', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'surat-pendaftaran.pdf');
  validForm.append('dokumen_akta_notaris', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'akta-notaris.pdf');
  validForm.append('dokumen_profil', new Blob([createValidDummyPdf('https://pustakacahaya.co.id')], { type: 'application/pdf' }), 'profil-perusahaan.pdf');
  validForm.append('dokumen_npwp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'npwp-badan.pdf');
  validForm.append('dokumen_nib', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'nib-oss.pdf');
  validForm.append('dokumen_ktp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'ktp-penanggung-jawab.pdf');

  const regRes = await callMultipart('/publisher-registrations', null, 'POST', validForm, 201);
  assert.equal(regRes.success, true);
  assert.ok(regRes.data.kode_pendaftaran.startsWith('REG-PUB-'));
  assert.equal(regRes.data.status, 'DIAJUKAN');
  const kodePendaftaran1 = regRes.data.kode_pendaftaran;
  console.log(`   ✓ Pendaftaran berhasil dibuat dengan kode: ${kodePendaftaran1}`);

  // Verifikasi akun User berstatus INACTIVE
  const registeredUser = await prisma.user.findUnique({
    where: { email: testEmail1 },
  });
  assert.ok(registeredUser, 'Akun User harus terbentuk');
  assert.equal(registeredUser.status, 'INACTIVE', 'Status akun User sebelum disetujui harus INACTIVE');

  // -------------------------------------------------------------------------
  // Skenario 3: Penghalang Login (Login Barrier) mengembalikan 403 PUBLISHER_NOT_APPROVED
  // -------------------------------------------------------------------------
  console.log('3. Menguji login barrier akun penerbit yang belum disetujui...');
  const loginBlockedRes = await callJson('/auth/login', null, 'POST', {
    email: testEmail1,
    password: testPassword,
  }, 403);
  assert.equal(loginBlockedRes.code, 'PUBLISHER_NOT_APPROVED');
  assert.equal(loginBlockedRes.data.status_pendaftaran, 'DIAJUKAN');
  console.log('   ✓ Login barrier berhasil menolak akun belum disetujui (403 PUBLISHER_NOT_APPROVED)');

  // Kredensial salah tetap kembalikan 401
  const badLoginRes = await callJson('/auth/login', null, 'POST', {
    email: testEmail1,
    password: 'PasswordSalah999',
  }, 401);
  assert.equal(badLoginRes.success, false);
  console.log('   ✓ Password salah tetap menghasilkan 401 generik tanpa membocorkan status pendaftaran');

  // -------------------------------------------------------------------------
  // Skenario 4: Cek status publik
  // -------------------------------------------------------------------------
  console.log('4. Menguji pengecekan status pendaftaran via POST...');
  const statusRes = await callJson('/publisher-registrations/check-status', null, 'POST', {
    kode_pendaftaran: kodePendaftaran1,
  }, 200);
  assert.equal(statusRes.success, true);
  assert.equal(statusRes.data.status, 'DIAJUKAN');
  assert.equal(statusRes.data.status_label, 'Menunggu Verifikasi Petugas');
  console.log('   ✓ Cek status publik berhasil mengembalikan status DIAJUKAN');

  // Cek status dengan kode tidak ada -> 404 REGISTRATION_NOT_FOUND
  const statusNotFound = await callJson('/publisher-registrations/check-status', null, 'POST', {
    kode_pendaftaran: 'REG-PUB-NONEXIST',
  }, 404);
  assert.equal(statusNotFound.code, 'REGISTRATION_NOT_FOUND');
  console.log('   ✓ Kode pendaftaran tidak valid menghasilkan 404 REGISTRATION_NOT_FOUND');

  // -------------------------------------------------------------------------
  // Skenario 5: Penolakan Duplikasi Registrasi Aktif (409 DUPLICATE_ACTIVE_REGISTRATION)
  // -------------------------------------------------------------------------
  console.log('5. Menguji pencegahan pendaftaran duplikat NPWP/NIB/Email aktif...');
  const duplicateForm = new FormData();
  duplicateForm.append('nama_penerbit', 'PT Penerbit Duplikat');
  duplicateForm.append('jenis_penerbit', 'PERUSAHAAN');
  duplicateForm.append('alamat_lengkap', 'Jl. Percetakan Mushaf No. 12, Jakarta Timur');
  duplicateForm.append('nama_penanggung_jawab', 'Ahmad Subagio');
  duplicateForm.append('telepon_penanggung_jawab', '081234567890');
  duplicateForm.append('email', `diff.${Date.now()}@pustaka.com`);
  duplicateForm.append('password', testPassword);
  duplicateForm.append('npwp', testNpwp1); // NPWP sama
  duplicateForm.append('nib', '9120009999999');

  duplicateForm.append('dokumen_surat_pendaftaran', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'surat.pdf');
  duplicateForm.append('dokumen_akta_notaris', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'akta.pdf');
  duplicateForm.append('dokumen_profil', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'profil.pdf');
  duplicateForm.append('dokumen_npwp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'npwp.pdf');
  duplicateForm.append('dokumen_nib', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'nib.pdf');
  duplicateForm.append('dokumen_ktp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'ktp.pdf');

  const dupRes = await callMultipart('/publisher-registrations', null, 'POST', duplicateForm, 409);
  assert.equal(dupRes.code, 'DUPLICATE_ACTIVE_REGISTRATION');
  console.log('   ✓ Pendaftaran duplikat NPWP aktif berhasil ditolak (409 DUPLICATE_ACTIVE_REGISTRATION)');

  // -------------------------------------------------------------------------
  // Skenario 6: Akses Admin & RBAC
  // -------------------------------------------------------------------------
  console.log('6. Menguji otorisasi admin untuk antrean pendaftaran...');
  // Tanpa token -> 401
  await callJson('/admin/publisher-registrations', null, 'GET', undefined, 401);
  // Role PENERBIT -> 403
  await callJson('/admin/publisher-registrations', penerbitToken, 'GET', undefined, 403);

  // ADMIN_INTERNAL -> 200
  const adminList = await callJson('/admin/publisher-registrations?search=' + kodePendaftaran1, adminToken, 'GET', undefined, 200);
  assert.equal(adminList.success, true);
  assert.ok(adminList.data.length >= 1);
  const foundReg = adminList.data.find(r => r.kode_pendaftaran === kodePendaftaran1);
  assert.ok(foundReg, 'Pendaftaran harus ditemukan di daftar admin');
  assert.equal(foundReg.status, 'DIAJUKAN');
  const regId = foundReg.id;

  // Detail pendaftaran
  const regDetail = await callJson(`/admin/publisher-registrations/${regId}`, adminToken, 'GET', undefined, 200);
  assert.equal(regDetail.data.id, regId);
  assert.equal(regDetail.data.dokumen.length, 6);
  console.log('   ✓ Admin berhasil mengakses daftar dan rincian pendaftaran');

  // Unduh dokumen dan periksa audit log akses KTP sensitif
  const ktpDoc = regDetail.data.dokumen.find(d => d.tipe === 'KTP_PENANGGUNG_JAWAB');
  assert.ok(ktpDoc, 'Dokumen KTP harus ditemukan');

  const ktpRes = await fetch(`${base}/admin/publisher-registrations/${regId}/documents/${ktpDoc.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(ktpRes.status, 200);
  const ktpBytes = await ktpRes.arrayBuffer();
  assert.ok(ktpBytes.byteLength > 0);

  // Verifikasi pencatatan audit log sensitif
  const ktpAudit = await prisma.auditLog.findFirst({
    where: {
      action: 'VIEW_SENSITIVE_KTP',
      subject_id: ktpDoc.id,
    },
  });
  assert.ok(ktpAudit, 'Pencatatan VIEW_SENSITIVE_KTP harus ada di audit_logs');
  console.log('   ✓ Unduh berkas sensitif KTP berhasil dan tercatat di audit log');

  // -------------------------------------------------------------------------
  // Skenario 7: Keputusan Admin - PERLU_PERBAIKAN & Tautan Sekali Pakai
  // -------------------------------------------------------------------------
  console.log('7. Menguji keputusan PERLU_PERBAIKAN dan pembuatan token revisi...');
  const revisionReason = 'Akta Notaris buram pada lembar pengesahan. Harap lampirkan pindaian yang lebih jelas.';
  const needRevisionRes = await callJson(`/admin/publisher-registrations/${regId}/decision`, adminToken, 'POST', {
    keputusan: 'PERLU_PERBAIKAN',
    alasan: revisionReason,
    versi: regDetail.data.versi,
  }, 200);

  assert.equal(needRevisionRes.data.status, 'PERLU_PERBAIKAN');
  assert.equal(needRevisionRes.data.versi, 2);

  // Ambil token perbaikan mentah dari DB (karena di email dikirim lewat mock)
  const tokenRecord = await prisma.publisherRevisionToken.findFirst({
    where: { registration_id: regId, used_at: null },
  });
  assert.ok(tokenRecord, 'Record PublisherRevisionToken harus terbentuk');

  // Ambil token mentah dari simulasi: cari hash-nya
  // Kita tes endpoint getRevision dengan token palsu -> 410
  await callJson('/publisher-registrations/revision/tokentidakvalid123', null, 'GET', undefined, 410);

  // Buat token perbaikan yang hash-nya cocok dengan tokenRecord
  const knownRawToken = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const knownHash = crypto.createHash('sha256').update(knownRawToken).digest('hex');
  await prisma.publisherRevisionToken.update({
    where: { id: tokenRecord.id },
    data: { token_hash: knownHash },
  });

  // Akses GET form revisi dengan token
  const revisionData = await callJson(`/publisher-registrations/revision/${knownRawToken}`, null, 'GET', undefined, 200);
  assert.equal(revisionData.data.kode_pendaftaran, kodePendaftaran1);
  assert.equal(revisionData.data.alasan_perbaikan, revisionReason);
  assert.equal(revisionData.data.dokumen_terunggah.length, 6);
  console.log('   ✓ Akses data perbaikan dengan token valid berhasil');

  // -------------------------------------------------------------------------
  // Skenario 8: Submit Revisi (Token Burned & Status kembali DIAJUKAN)
  // -------------------------------------------------------------------------
  console.log('8. Menguji pengiriman revisi dokumen (PUT revision)...');
  const revisionSubmitForm = new FormData();
  revisionSubmitForm.append('telepon_penanggung_jawab', '081299998888');
  revisionSubmitForm.append('dokumen_akta_notaris', new Blob([createValidDummyPdf('AKTA_NOTARIS_REVISI')], { type: 'application/pdf' }), 'akta-notaris-revisi.pdf');

  const submitRevRes = await callMultipart(`/publisher-registrations/revision/${knownRawToken}`, null, 'PUT', revisionSubmitForm, 200);
  assert.equal(submitRevRes.data.status, 'DIAJUKAN');

  // Verifikasi token hangus (single-use)
  const burnedCheck = await callJson(`/publisher-registrations/revision/${knownRawToken}`, null, 'GET', undefined, 410);
  assert.equal(burnedCheck.code, 'TOKEN_INVALID_OR_EXPIRED');
  console.log('   ✓ Token perbaikan langsung hangus setelah form revisi dikirim');

  // -------------------------------------------------------------------------
  // Skenario 9: Konkurensi Optimistik (409 VERSION_CONFLICT)
  // -------------------------------------------------------------------------
  console.log('9. Menguji proteksi konkurensi optimistik (VERSION_CONFLICT)...');
  const staleDecisionRes = await callJson(`/admin/publisher-registrations/${regId}/decision`, adminToken, 'POST', {
    keputusan: 'SETUJUI',
    versi: 1, // Versi kedaluwarsa (DB sekarang versi 3)
  }, 409);
  assert.equal(staleDecisionRes.code, 'VERSION_CONFLICT');
  console.log('   ✓ Percobaan keputusan dengan versi basi berhasil ditolak (409 VERSION_CONFLICT)');

  // -------------------------------------------------------------------------
  // Skenario 10: Persetujuan Pendaftaran (SETUJUI) & Pengaktifan Login
  // -------------------------------------------------------------------------
  console.log('10. Menguji persetujuan pendaftaran (SETUJUI)...');
  const latestDetail = await callJson(`/admin/publisher-registrations/${regId}`, adminToken, 'GET', undefined, 200);
  const approveRes = await callJson(`/admin/publisher-registrations/${regId}/decision`, adminToken, 'POST', {
    keputusan: 'SETUJUI',
    versi: latestDetail.data.versi,
  }, 200);
  assert.equal(approveRes.data.status, 'DISETUJUI');

  // Verifikasi akun User aktif & profil Publisher terbuat
  const approvedUser = await prisma.user.findUnique({
    where: { email: testEmail1 },
    include: { publisher: true },
  });
  assert.equal(approvedUser.status, 'ACTIVE');
  assert.ok(approvedUser.publisher, 'Profil Publisher harus otomatis dibuat');
  assert.equal(approvedUser.publisher.verification_status, 'VERIFIED');

  // Login penerbit sekarang harus BERHASIL dan mendapatkan JWT
  const loginSuccessRes = await callJson('/auth/login', null, 'POST', {
    email: testEmail1,
    password: testPassword,
  }, 200);
  assert.equal(loginSuccessRes.success, true);
  assert.ok(loginSuccessRes.data.token, 'Token JWT harus dikembalikan setelah disetujui');
  console.log('   ✓ Login penerbit berhasil setelah pendaftaran disetujui admin');

  // -------------------------------------------------------------------------
  // Skenario 11: Penolakan Pendaftaran (TOLAK) & Pembebasan NPWP/NIB
  // -------------------------------------------------------------------------
  console.log('11. Menguji penolakan pendaftaran dan pembebasan NPWP/NIB untuk daftar ulang...');
  const testEmail2 = `pt.tolak.${Date.now()}@pustakacahaya.co.id`;
  const testNpwp2 = '01.234.567.8-888.000';
  const testNib2 = '9120001234888';

  const formToReject = new FormData();
  formToReject.append('nama_penerbit', 'PT Calon Ditolak');
  formToReject.append('jenis_penerbit', 'PERUSAHAAN');
  formToReject.append('alamat_lengkap', 'Jl. Percetakan Mushaf No. 55 Jakarta');
  formToReject.append('nama_penanggung_jawab', 'Bambang');
  formToReject.append('telepon_penanggung_jawab', '081234567888');
  formToReject.append('email', testEmail2);
  formToReject.append('password', testPassword);
  formToReject.append('npwp', testNpwp2);
  formToReject.append('nib', testNib2);

  formToReject.append('dokumen_surat_pendaftaran', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'surat.pdf');
  formToReject.append('dokumen_akta_notaris', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'akta.pdf');
  formToReject.append('dokumen_profil', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'profil.pdf');
  formToReject.append('dokumen_npwp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'npwp.pdf');
  formToReject.append('dokumen_nib', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'nib.pdf');
  formToReject.append('dokumen_ktp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'ktp.pdf');

  const reg2 = await callMultipart('/publisher-registrations', null, 'POST', formToReject, 201);
  const regId2 = (await prisma.publisherRegistration.findUnique({ where: { registration_code: reg2.data.kode_pendaftaran } })).id;

  // Tolak pendaftaran
  const rejectRes = await callJson(`/admin/publisher-registrations/${regId2}/decision`, adminToken, 'POST', {
    keputusan: 'TOLAK',
    alasan: 'Badan hukum tidak terdaftar di Kemenkumham.',
    versi: 1,
  }, 200);
  assert.equal(rejectRes.data.status, 'DITOLAK');

  // Verifikasi active_npwp dan active_nib menjadi null
  const rejectedRecord = await prisma.publisherRegistration.findUnique({
    where: { id: regId2 },
  });
  assert.equal(rejectedRecord.active_npwp, null);
  assert.equal(rejectedRecord.active_nib, null);

  // Daftarkan ulang dengan NPWP & NIB yang sama (harus berhasil!)
  const testEmail3 = `pt.reapply.${Date.now()}@pustakacahaya.co.id`;
  const formReapply = new FormData();
  formReapply.append('nama_penerbit', 'PT Calon Ditolak Reapply');
  formReapply.append('jenis_penerbit', 'PERUSAHAAN');
  formReapply.append('alamat_lengkap', 'Jl. Percetakan Mushaf No. 55 Jakarta');
  formReapply.append('nama_penanggung_jawab', 'Bambang');
  formReapply.append('telepon_penanggung_jawab', '081234567888');
  formReapply.append('email', testEmail3);
  formReapply.append('password', testPassword);
  formReapply.append('npwp', testNpwp2); // NPWP sama dengan yang ditolak
  formReapply.append('nib', testNib2);   // NIB sama dengan yang ditolak

  formReapply.append('dokumen_surat_pendaftaran', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'surat.pdf');
  formReapply.append('dokumen_akta_notaris', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'akta.pdf');
  formReapply.append('dokumen_profil', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'profil.pdf');
  formReapply.append('dokumen_npwp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'npwp.pdf');
  formReapply.append('dokumen_nib', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'nib.pdf');
  formReapply.append('dokumen_ktp', new Blob([createValidDummyPdf()], { type: 'application/pdf' }), 'ktp.pdf');

  const reapplyRes = await callMultipart('/publisher-registrations', null, 'POST', formReapply, 201);
  assert.equal(reapplyRes.success, true);
  console.log('   ✓ Pendaftaran ulang dengan NPWP/NIB dari pendaftaran yang DITOLAK berhasil (201 Created)');

  console.log(`\n======================================================`);
  console.log(`SEMUA ${assertions} PENGUJIAN INTEGRASI T-F06 BERHASIL MEMENUHI KONTRAK API v1.0!`);
  console.log(`======================================================\n`);
} finally {
  server.close();
}
