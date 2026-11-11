import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { prisma } from '../../src/config/database.js';
import {
  CAPTCHA_ALPHABET,
  CAPTCHA_TTL_MS,
  createCaptcha,
  renderCaptchaSvg,
  sealCaptcha,
  verifyCaptcha,
} from '../../src/services/captcha.service.js';
import {
  acceptComplaint,
  adminActionsFor,
  createPrintErrorComplaint,
  createServiceComplaint,
  detectComplaintFileType,
  generateComplaintCode,
  inspectComplaintFile,
  listAdminComplaints,
  maskName,
  rejectComplaint,
  submitFinalReport,
  trackComplaint,
  updateComplaintStatus,
} from '../../src/services/complaint.service.js';
import {
  createPrintErrorComplaintSchema,
  createServiceComplaintSchema,
  finalReportSchema,
  rejectComplaintSchema,
  trackComplaintSchema,
  updateComplaintStatusSchema,
} from '../../src/validators/complaint.validator.js';

/** Ganti delegate Prisma sementara selama `fn` berjalan. */
async function withDelegates(delegates, fn) {
  const originals = Object.fromEntries(Object.keys(delegates).map((key) => [key, Object.getOwnPropertyDescriptor(prisma, key)]));
  try {
    for (const [key, value] of Object.entries(delegates)) Object.defineProperty(prisma, key, { configurable: true, value });
    return await fn();
  } finally {
    for (const [key, original] of Object.entries(originals)) {
      if (original) Object.defineProperty(prisma, key, original);
      else delete prisma[key];
    }
  }
}

const PNG = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C6360000002000105FE02FEA7D5A00000000049454E44AE426082', 'hex');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32), Buffer.from([0xff, 0xd9])]);
const file = (buffer, originalname) => ({ buffer, originalname });

/** Ambil jawaban dari token (hanya dapat dilakukan pemegang JWT_SECRET, mis. pengujian). */
function answerOf(token) {
  const { ENV } = globalThis.__complaintEnv;
  const raw = Buffer.from(token, 'base64url');
  const key = crypto.createHash('sha256').update(`complaint-captcha:${ENV.JWT_SECRET}`).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString()).a;
}
globalThis.__complaintEnv = await import('../../src/config/env.js');

const reporter = {
  nama: 'Ahmad Fauzi',
  jenis_kelamin: 'LAKI_LAKI',
  usia: '34',
  alamat: 'Jl. Merdeka No. 1, RT 01/RW 02',
  provinsi_kode: '32',
  kabupaten_kode: '32.73',
  kecamatan_kode: '32.73.01',
  kode_pos: '40151',
  telepon: '081234567890',
  email: 'Ahmad@Example.com',
  pekerjaan: 'Guru',
};

const serviceBody = () => {
  const captcha = createCaptcha();
  return {
    ...reporter,
    nomor_pendaftaran: 'REG-2026-0001',
    penerbit_pendaftar: 'PT Mushaf Nusantara',
    jenis_pengaduan: 'BIAYA_PNBP',
    deskripsi: 'Biaya PNBP yang ditagihkan tidak sesuai jumlah halaman.',
    captcha_token: captcha.token,
    captcha_jawaban: answerOf(captcha.token).toLowerCase(),
  };
};

// ---------------------------------------------------------------------------
// CAPTCHA
// ---------------------------------------------------------------------------

test('CAPTCHA: jawaban benar diterima sekali, tidak peka huruf besar/kecil', () => {
  const token = sealCaptcha('AB3CD');
  assert.equal(verifyCaptcha(token, ' ab3cd '), true);
  assert.throws(() => verifyCaptcha(token, 'AB3CD'), (err) => err.statusCode === 400 && /sudah dipakai/.test(err.message));
});

test('CAPTCHA: jawaban salah menghanguskan token', () => {
  const token = sealCaptcha('AB3CD');
  assert.throws(() => verifyCaptcha(token, 'XXXXX'), (err) => err.code === 'CAPTCHA_INVALID' && err.errors[0].field === 'captcha_jawaban');
  assert.throws(() => verifyCaptcha(token, 'AB3CD'), /sudah dipakai/);
});

test('CAPTCHA: token kedaluwarsa atau dipalsukan ditolak', () => {
  const old = sealCaptcha('AB3CD', Date.now() - CAPTCHA_TTL_MS - 1000);
  assert.throws(() => verifyCaptcha(old, 'AB3CD'), /kedaluwarsa/);
  const forged = Buffer.from(sealCaptcha('AB3CD'), 'base64url');
  forged[forged.length - 1] ^= 0xff;
  assert.throws(() => verifyCaptcha(forged.toString('base64url'), 'AB3CD'), /tidak valid/);
  assert.throws(() => verifyCaptcha('bukan-token', 'AB3CD'), /tidak valid/);
});

test('CAPTCHA: gambar SVG tidak memuat jawaban sebagai teks dan token tidak membocorkan jawaban', () => {
  const svg = renderCaptchaSvg('AC3EF');
  assert.match(svg, /^<svg /);
  assert.doesNotMatch(svg, /<text|AC3EF/);
  const captcha = createCaptcha();
  const answer = answerOf(captcha.token);
  assert.equal(answer.length, 5);
  assert.ok([...answer].every((char) => CAPTCHA_ALPHABET.includes(char)));
  assert.ok(!Buffer.from(captcha.token, 'base64url').toString('latin1').includes(answer));
  assert.match(captcha.image, /^data:image\/svg\+xml;base64,/);
});

// ---------------------------------------------------------------------------
// Kode, privasi, berkas
// ---------------------------------------------------------------------------

test('kode pengaduan unik per jenis dan sulit ditebak', () => {
  const date = new Date('2026-11-11T03:00:00Z');
  assert.match(generateComplaintCode('KESALAHAN_CETAK', date), /^ADU-KC-20261111-[A-Z2-9]{8}$/);
  assert.match(generateComplaintCode('PELAYANAN', date), /^ADU-PL-20261111-[A-Z2-9]{8}$/);
  const codes = new Set(Array.from({ length: 500 }, () => generateComplaintCode('PELAYANAN', date)));
  assert.equal(codes.size, 500);
});

test('nama pengadu disamarkan untuk pelacakan publik', () => {
  assert.equal(maskName('Ahmad Fauzi'), 'Ah*** Fa***');
  assert.equal(maskName('Al'), 'A***');
  assert.equal(maskName('  Siti  '), 'Si***');
});

test('jenis berkas dikenali dari isinya, bukan dari nama', async () => {
  assert.equal(detectComplaintFileType(PNG), 'image/png');
  assert.equal(detectComplaintFileType(JPG), 'image/jpeg');
  assert.equal(detectComplaintFileType(Buffer.from('%PDF-1.4\n%%EOF')), 'application/pdf');
  assert.equal(detectComplaintFileType(Buffer.from('<html><script>alert(1)</script></html>')), null);

  await assert.rejects(inspectComplaintFile(file(Buffer.from('<svg onload=alert(1)>xxxxxxxx'), 'gambar.png'), 'Cover', 'gambar_cover'),
    (err) => err.statusCode === 400 && /JPG, JPEG, PNG, atau PDF/.test(err.message));
  await assert.rejects(inspectComplaintFile(file(PNG, 'gambar.pdf'), 'Cover', 'gambar_cover'), /ekstensi berkas tidak sesuai/);
  await assert.rejects(inspectComplaintFile(file(Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]), 'besar.png'), 'Cover', 'gambar_cover'), /melebihi 2 MB/);
  await assert.rejects(inspectComplaintFile(file(Buffer.alloc(0), 'kosong.png'), 'Cover', 'gambar_cover'), /wajib diunggah/);
  const ok = await inspectComplaintFile(file(JPG, 'foto.JPEG'), 'Cover', 'gambar_cover');
  assert.equal(ok.mimeType, 'image/jpeg');
  assert.match(ok.fileHash, /^[a-f0-9]{64}$/);
});

// ---------------------------------------------------------------------------
// Validasi
// ---------------------------------------------------------------------------

test('validasi formulir kesalahan cetak: minimal satu kesalahan, jenis kesalahan dari daftar', () => {
  const base = {
    ...reporter,
    nama_penerbit: 'PT Mushaf',
    nama_mushaf: 'Mushaf 30 Juz',
    nomor_surat_tashih: 'STT-1/2025',
    captcha_token: 'x'.repeat(20),
    captcha_jawaban: 'AB3CD',
  };
  const parsed = createPrintErrorComplaintSchema.body.parse({
    ...base,
    kesalahan: JSON.stringify([{ surah_ayat: 'Al-Fatihah: 1', jenis_kesalahan: 'Kesalahan huruf', deskripsi: 'Huruf ba tertulis ta.' }]),
  });
  assert.equal(parsed.kesalahan.length, 1);
  assert.equal(parsed.usia, 34);
  assert.equal(parsed.email, 'ahmad@example.com');
  assert.throws(() => createPrintErrorComplaintSchema.body.parse({ ...base, kesalahan: '[]' }), /Minimal satu informasi kesalahan/);
  assert.throws(() => createPrintErrorComplaintSchema.body.parse({
    ...base, kesalahan: JSON.stringify([{ surah_ayat: 'X1', jenis_kesalahan: 'Bebas', deskripsi: 'Deskripsi panjang.' }]),
  }), /Jenis kesalahan wajib dipilih/);
  // Honeypot terisi -> ditolak
  assert.throws(() => createPrintErrorComplaintSchema.body.parse({ ...base, website: 'http://spam', kesalahan: '[]' }));
});

test('validasi formulir pelayanan, pelacakan, keputusan, dan laporan akhir', () => {
  const body = serviceBody();
  assert.equal(createServiceComplaintSchema.body.parse(body).jenis_pengaduan, 'BIAYA_PNBP');
  assert.throws(() => createServiceComplaintSchema.body.parse({ ...body, jenis_pengaduan: 'LAIN' }), /Jenis pengaduan wajib dipilih/);
  assert.throws(() => createServiceComplaintSchema.body.parse({ ...body, usia: '5' }), /minimal 10 tahun/);
  assert.equal(trackComplaintSchema.body.parse({ kode: ' adu-pl-1 ' }).kode, 'ADU-PL-1');
  assert.throws(() => rejectComplaintSchema.body.parse({ alasan: 'pendek' }), /minimal 10 karakter/);
  assert.throws(() => updateComplaintStatusSchema.body.parse({ status: 'SELESAI', keterangan: 'langsung selesai' }), /Status tujuan tidak valid/);
  assert.throws(() => finalReportSchema.body.parse({ hasil: 'Selesai', keterangan: 'Sudah ditangani.', tanggal_selesai: '11/11/2026' }), /format YYYY-MM-DD/);
});

// ---------------------------------------------------------------------------
// Pengiriman pengaduan
// ---------------------------------------------------------------------------

test('pengaduan pelayanan tersimpan dengan kode unik, status awal, dan riwayat pertama', async () => {
  let saved;
  const sent = [];
  const { emailProvider } = await import('../../src/services/email-provider.service.js');
  const originalSend = emailProvider.sendEmail;
  emailProvider.sendEmail = async (mail) => { sent.push(mail); return { messageId: 'm-1' }; };
  try {
    await withDelegates({
      complaint: {
        create: async ({ data }) => {
          saved = data;
          return { ...data, id: 'c-1', status: 'MENUNGGU_VERIFIKASI', created_at: new Date('2026-11-11T03:00:00Z') };
        },
      },
    }, async () => {
      const result = await createServiceComplaint(serviceBody());
      assert.match(result.kode_pengaduan, /^ADU-PL-\d{8}-[A-Z2-9]{8}$/);
      assert.equal(result.status, 'MENUNGGU_VERIFIKASI');
      assert.equal(result.jenis_pengaduan_label, 'Pengaduan Pelayanan Surat Tanda Tashih/Izin Edar');
    });
  } finally {
    emailProvider.sendEmail = originalSend;
  }
  assert.equal(saved.type, 'PELAYANAN');
  assert.equal(saved.regency_name, 'Kota Bandung');
  assert.equal(saved.email, 'ahmad@example.com');
  assert.equal(saved.histories.create.status, 'MENUNGGU_VERIFIKASI');
  assert.equal(sent[0].to, 'ahmad@example.com');
  assert.match(sent[0].payload.message, new RegExp(saved.complaint_code));
});

test('CAPTCHA salah: pengaduan tidak disimpan', async () => {
  let called = false;
  await withDelegates({ complaint: { create: async () => { called = true; } } }, async () => {
    await assert.rejects(createServiceComplaint({ ...serviceBody(), captcha_jawaban: 'ZZZZZ' }), (err) => err.code === 'CAPTCHA_INVALID');
  });
  assert.equal(called, false);
});

test('pengaduan kesalahan cetak: setiap kesalahan wajib bergambar; berkas dibersihkan bila penyimpanan gagal', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lpmq-complaints-'));
  process.env.COMPLAINT_FILES_DIR = dir;
  const captcha = createCaptcha();
  const body = {
    ...reporter,
    nama_penerbit: 'PT Mushaf',
    nama_mushaf: 'Mushaf 30 Juz',
    nomor_surat_tashih: 'STT-1/2025',
    kesalahan: JSON.stringify([
      { surah_ayat: 'Al-Fatihah: 1', jenis_kesalahan: 'Kesalahan huruf', deskripsi: 'Huruf ba tertulis ta.' },
      { surah_ayat: 'Yasin: 3', jenis_kesalahan: 'Kata atau ayat hilang', deskripsi: 'Ayat ketiga tidak tercetak.' },
    ]),
    captcha_token: captcha.token,
    captcha_jawaban: answerOf(captcha.token),
  };
  const files = {
    gambar_surat_tashih: [file(PNG, 'stt.png')],
    gambar_cover: [file(JPG, 'cover.jpg')],
    gambar_kesalahan: [file(PNG, 'hal1.png')],
  };
  try {
    await assert.rejects(createPrintErrorComplaint(body, files), /setiap informasi kesalahan wajib dilampiri gambar/);

    const captcha2 = createCaptcha();
    const body2 = { ...body, captcha_token: captcha2.token, captcha_jawaban: answerOf(captcha2.token) };
    files.gambar_kesalahan.push(file(PNG, 'hal2.png'));
    await withDelegates({
      $transaction: async () => { throw Object.assign(new Error('DB down'), { statusCode: 503 }); },
    }, () => assert.rejects(createPrintErrorComplaint(body2, files), /DB down/));
    assert.deepEqual(await readdir(dir), []);

    // Berhasil: lampiran sampul + STT di tingkat pengaduan, gambar halaman salah di tiap item
    const captcha3 = createCaptcha();
    const body3 = { ...body, captcha_token: captcha3.token, captcha_jawaban: answerOf(captcha3.token) };
    const created = { complaint: null, items: [] };
    const tx = {
      complaint: { create: async ({ data }) => { created.complaint = data; return { ...data, id: 'c-1', status: 'MENUNGGU_VERIFIKASI', created_at: new Date() }; } },
      complaintErrorItem: { create: async ({ data }) => { created.items.push(data); return data; } },
    };
    const result = await withDelegates({ $transaction: async (fn) => fn(tx) }, () => createPrintErrorComplaint(body3, files));
    assert.match(result.kode_pengaduan, /^ADU-KC-/);
    assert.deepEqual(created.complaint.attachments.create.map((a) => [a.attachment_type, a.mime_type]), [
      ['SURAT_TANDA_TASHIH', 'image/png'], ['COVER_MUSHAF', 'image/jpeg'],
    ]);
    assert.deepEqual(created.items.map((item) => [item.position, item.error_type, item.attachments.create.attachment_type]), [
      [1, 'Kesalahan huruf', 'HALAMAN_SALAH'], [2, 'Kata atau ayat hilang', 'HALAMAN_SALAH'],
    ]);
    // Nama berkas di disk acak (bukan nama asli pengguna)
    const stored = await readdir(dir);
    assert.equal(stored.length, 4);
    assert.ok(stored.every((name) => /^[0-9a-f-]{36}\.(png|jpg)$/.test(name)));
  } finally {
    delete process.env.COMPLAINT_FILES_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Pelacakan publik
// ---------------------------------------------------------------------------

test('pelacakan tidak membocorkan data pribadi dan hanya menampilkan hasil sesuai status', async () => {
  let query;
  const row = {
    complaint_code: 'ADU-KC-20261111-ABCD2345',
    type: 'KESALAHAN_CETAK',
    status: 'DITOLAK',
    reporter_name: 'Ahmad Fauzi',
    created_at: new Date('2026-11-11T03:00:00Z'),
    rejection_reason: 'Mushaf bukan terbitan penerbit terdaftar.',
    final_result: null,
    final_explanation: null,
    resolved_on: null,
    histories: [{ status: 'MENUNGGU_VERIFIKASI', note: 'Dikirim', created_at: new Date('2026-11-11T03:00:00Z') }],
  };
  await withDelegates({ complaint: { findUnique: async (args) => { query = args; return row; } } }, async () => {
    const result = await trackComplaint('adu-kc-20261111-abcd2345');
    assert.equal(query.where.complaint_code, 'ADU-KC-20261111-ABCD2345');
    assert.equal(result.nama_pengadu, 'Ah*** Fa***');
    assert.equal(result.alasan_penolakan, row.rejection_reason);
    assert.equal(result.hasil_penanganan, null);
    const json = JSON.stringify(result);
    for (const secret of ['Ahmad Fauzi', 'email', 'phone', 'address', 'changed_by']) assert.ok(!json.includes(secret), secret);
  });
  // Kolom pribadi tidak pernah diambil dari database
  for (const field of ['email', 'phone', 'address', 'attachments', 'decided_by']) assert.equal(query.select[field], undefined);
  assert.deepEqual(Object.keys(query.select.histories.select), ['status', 'note', 'created_at']);

  await withDelegates({ complaint: { findUnique: async () => null } }, () =>
    assert.rejects(trackComplaint('ADU-XX'), (err) => err.statusCode === 404 && err.message === 'Kode pengaduan tidak ditemukan. Silakan periksa kembali kode yang Anda masukkan.'));
});

// ---------------------------------------------------------------------------
// Admin: alur status
// ---------------------------------------------------------------------------

test('aksi admin mengikuti alur status pengaduan', () => {
  assert.deepEqual(adminActionsFor('MENUNGGU_VERIFIKASI'), ['TERIMA', 'TOLAK']);
  assert.deepEqual(adminActionsFor('DITERIMA'), ['DALAM_PROSES']);
  assert.deepEqual(adminActionsFor('DALAM_PROSES'), ['MENUNGGU_TINDAK_LANJUT', 'LAPORAN_AKHIR']);
  assert.deepEqual(adminActionsFor('MENUNGGU_TINDAK_LANJUT'), ['DALAM_PROSES', 'LAPORAN_AKHIR']);
  assert.deepEqual(adminActionsFor('DITOLAK'), []);
  assert.deepEqual(adminActionsFor('SELESAI'), []);
});

/** Delegate Prisma tiruan untuk satu pengaduan yang statusnya bisa berubah. */
function fakeStore(initial) {
  const state = { row: { ...initial }, histories: [], audits: [] };
  const complaint = {
    findUnique: async () => ({ ...state.row, attachments: [], error_items: [], histories: state.histories }),
    updateMany: async ({ where, data }) => {
      if (!where.status.in.includes(state.row.status)) return { count: 0 };
      Object.assign(state.row, data);
      return { count: 1 };
    },
  };
  const tx = {
    complaint,
    complaintStatusHistory: { create: async ({ data }) => state.histories.push(data) },
    auditLog: { create: async ({ data }) => state.audits.push(data) },
  };
  return { state, delegates: { complaint, $transaction: async (fn) => fn(tx) } };
}

const admin = { id: 'admin-1', roles: ['ADMIN_INTERNAL'] };
const pending = {
  id: 'c-1',
  complaint_code: 'ADU-PL-20261111-ABCD2345',
  type: 'PELAYANAN',
  status: 'MENUNGGU_VERIFIKASI',
  reporter_name: 'Ahmad',
  email: 'ahmad@example.com',
  created_at: new Date('2026-11-01T03:00:00Z'),
};

test('alur lengkap: terima -> dalam proses -> tindak lanjut -> laporan akhir (selesai)', async () => {
  const { state, delegates } = fakeStore(pending);
  await withDelegates(delegates, async () => {
    // Belum boleh diproses atau diselesaikan sebelum diterima
    await assert.rejects(updateComplaintStatus('c-1', { status: 'DALAM_PROSES', keterangan: 'Mulai diproses' }, admin), (err) => err.statusCode === 409);
    await assert.rejects(submitFinalReport('c-1', { hasil: 'Selesai', keterangan: 'Sudah ditangani.', tanggal_selesai: '2026-11-05' }, admin), (err) => err.statusCode === 409);

    const accepted = await acceptComplaint('c-1', { catatan: '' }, admin);
    assert.equal(accepted.status, 'DITERIMA');
    assert.equal(state.row.decided_by_id, 'admin-1');
    assert.ok(state.row.decided_at instanceof Date);
    assert.deepEqual(accepted.allowed_actions, ['DALAM_PROSES']);
    await assert.rejects(rejectComplaint('c-1', { alasan: 'Sudah terlanjur diterima' }, admin), (err) => err.statusCode === 409);

    await updateComplaintStatus('c-1', { status: 'DALAM_PROSES', keterangan: 'Penerbit dipanggil untuk klarifikasi.' }, admin);
    await updateComplaintStatus('c-1', { status: 'MENUNGGU_TINDAK_LANJUT', keterangan: 'Menunggu penarikan mushaf.' }, admin);

    await assert.rejects(submitFinalReport('c-1', { hasil: 'Selesai', keterangan: 'Sudah ditangani.', tanggal_selesai: '2099-01-01' }, admin), /melewati hari ini/);
    await assert.rejects(submitFinalReport('c-1', { hasil: 'Selesai', keterangan: 'Sudah ditangani.', tanggal_selesai: '2026-10-01' }, admin), /sebelum tanggal pengaduan/);
    const done = await submitFinalReport('c-1', { hasil: 'Mushaf ditarik', keterangan: 'Penerbit menarik seluruh cetakan.', tanggal_selesai: '2026-11-05' }, admin);
    assert.equal(done.status, 'SELESAI');
    assert.equal(state.row.final_result, 'Mushaf ditarik');
    assert.equal(state.row.resolved_on.toISOString(), '2026-11-05T00:00:00.000Z');
    assert.equal(state.row.final_report_by_id, 'admin-1');
    await assert.rejects(updateComplaintStatus('c-1', { status: 'DALAM_PROSES', keterangan: 'Buka lagi' }, admin), (err) => err.statusCode === 409);
  });
  assert.deepEqual(state.histories.map((h) => h.status), ['DITERIMA', 'DALAM_PROSES', 'MENUNGGU_TINDAK_LANJUT', 'SELESAI']);
  assert.ok(state.histories.every((h) => h.changed_by_id === 'admin-1' && h.note));
  assert.deepEqual(state.audits.map((a) => a.action), [
    'COMPLAINT_ACCEPTED', 'COMPLAINT_STATUS_CHANGED', 'COMPLAINT_STATUS_CHANGED', 'COMPLAINT_FINAL_REPORT_SUBMITTED',
  ]);
});

test('penolakan menyimpan alasan, admin, waktu, dan riwayat', async () => {
  const { state, delegates } = fakeStore(pending);
  await withDelegates(delegates, async () => {
    const rejected = await rejectComplaint('c-1', { alasan: 'Nomor pendaftaran tidak ditemukan.' }, admin);
    assert.equal(rejected.status, 'DITOLAK');
    assert.deepEqual(rejected.allowed_actions, []);
    await assert.rejects(acceptComplaint('c-1', {}, admin), (err) => err.statusCode === 409);
  });
  assert.equal(state.row.rejection_reason, 'Nomor pendaftaran tidak ditemukan.');
  assert.equal(state.row.decided_by_id, 'admin-1');
  assert.deepEqual(state.histories, [{ complaint_id: 'c-1', status: 'DITOLAK', note: 'Nomor pendaftaran tidak ditemukan.', changed_by_id: 'admin-1' }]);
});

test('daftar admin difilter per jenis dan menghitung jumlah per status', async () => {
  await withDelegates({
    complaint: {
      count: async ({ where }) => {
        assert.equal(where.type, 'KESALAHAN_CETAK');
        assert.equal(where.status, 'DITERIMA');
        assert.ok(where.OR.some((clause) => clause.mushaf_name));
        return 1;
      },
      findMany: async ({ skip, take }) => {
        assert.equal(skip, 25);
        assert.equal(take, 25);
        return [{ id: 'c-1', status: 'DITERIMA' }];
      },
      groupBy: async ({ where }) => {
        assert.deepEqual(where, { type: 'KESALAHAN_CETAK' });
        return [{ status: 'MENUNGGU_VERIFIKASI', _count: { _all: 4 } }, { status: 'DITERIMA', _count: { _all: 1 } }];
      },
    },
  }, async () => {
    const result = await listAdminComplaints({ type: 'KESALAHAN_CETAK', page: 2, limit: 25, status: 'DITERIMA', search: 'Mushaf' });
    assert.equal(result.counts.MENUNGGU_VERIFIKASI, 4);
    assert.equal(result.counts.SELESAI, 0);
    assert.deepEqual(result.data[0].allowed_actions, ['DALAM_PROSES']);
    assert.deepEqual(result.pagination, { page: 2, limit: 25, total: 1, totalPages: 1 });
  });
});
