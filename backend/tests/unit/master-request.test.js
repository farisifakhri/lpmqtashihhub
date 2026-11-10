import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../../src/config/database.js';
import {
  adminActionsFor,
  computeLetterHash,
  createMasterRequest,
  generateRequestCode,
  getPublisherLetterPdf,
  getPublisherMasterRequest,
  listAdminMasterRequests,
  rejectMasterRequest,
  requireVerifiedPublisher,
  sendLetterToPublisher,
  signMasterLetter,
  submitLetterForSignature,
  validateMasterRequestFiles,
} from '../../src/services/master-request.service.js';
import { renderMasterLetterPdf, wrapText } from '../../src/services/master-letter-pdf.service.js';
import { listDistricts, listProvinces, listRegencies, resolveRegion } from '../../src/services/region.service.js';
import {
  createMasterRequestSchema,
  listMasterRequestsSchema,
  MASTER_MUSHAF_TYPES,
  masterLetterSchema,
  rejectMasterRequestSchema,
} from '../../src/validators/master-request.validator.js';

const validBody = {
  nama_pemohon: 'Budi Santoso',
  alamat: 'Jl. Merdeka No. 1, RT 01/RW 02',
  provinsi_kode: '32',
  kabupaten_kode: '32.73',
  kecamatan_kode: '32.73.01',
  kode_pos: '40111',
  telepon: '081234567890',
  email: 'Budi@Example.com',
  lembaga: 'Yayasan Rumah Tahfiz',
  jenis_mushaf: 'YASIN_TAHLIL',
  penggunaan: 'Dicetak untuk dibagikan gratis kepada jamaah majelis taklim.',
  pernyataan: 'true',
};

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

const penerbit = {
  id: 'user-pen-1',
  roles: ['PENERBIT'],
  publisherId: 'pub-1',
  publisher: { id: 'pub-1', verification_status: 'VERIFIED' },
};

async function samplePdf() {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

test('daftar jenis mushaf berisi 13 pilihan dengan kode unik', () => {
  assert.equal(MASTER_MUSHAF_TYPES.length, 13);
  assert.equal(new Set(MASTER_MUSHAF_TYPES.map((t) => t.kode)).size, 13);
});

test('skema permohonan menerima isian lengkap dan menormalkan email', () => {
  const parsed = createMasterRequestSchema.body.parse(validBody);
  assert.equal(parsed.email, 'budi@example.com');
  assert.equal(parsed.pernyataan, true);
});

test('skema permohonan menolak isian kosong, kode pos/telepon salah, dan pernyataan tidak dicentang', () => {
  const empty = createMasterRequestSchema.body.safeParse({});
  assert.equal(empty.success, false);
  const fields = new Set(empty.error.issues.map((issue) => issue.path[0]));
  for (const field of ['nama_pemohon', 'alamat', 'provinsi_kode', 'kabupaten_kode', 'kecamatan_kode', 'kode_pos', 'telepon', 'email', 'lembaga', 'jenis_mushaf', 'penggunaan', 'pernyataan']) {
    assert.ok(fields.has(field), `${field} harus divalidasi`);
  }
  assert.equal(createMasterRequestSchema.body.safeParse({ ...validBody, kode_pos: '4011' }).success, false);
  assert.equal(createMasterRequestSchema.body.safeParse({ ...validBody, telepon: '12345' }).success, false);
  assert.equal(createMasterRequestSchema.body.safeParse({ ...validBody, jenis_mushaf: 'LAINNYA' }).success, false);
  assert.equal(createMasterRequestSchema.body.safeParse({ ...validBody, pernyataan: 'false' }).success, false);
});

test('skema penolakan & surat: alasan wajib, perihal punya nilai bawaan, query dibatasi', () => {
  assert.equal(rejectMasterRequestSchema.body.safeParse({}).success, false);
  assert.equal(rejectMasterRequestSchema.body.safeParse({ alasan: 'Berkas tidak lengkap' }).success, true);
  assert.equal(masterLetterSchema.body.safeParse({ isi: 'pendek' }).success, false);
  assert.match(masterLetterSchema.body.parse({ isi: 'Master dapat diambil di kantor LPMQ setiap hari kerja.' }).perihal, /Persetujuan/);
  assert.deepEqual(listMasterRequestsSchema.query.parse({}), { page: 1, limit: 10 });
  assert.equal(listMasterRequestsSchema.query.safeParse({ limit: '500' }).success, false);
  assert.equal(listMasterRequestsSchema.query.safeParse({ status: 'DISETUJUI' }).success, false);
});

test('data wilayah: provinsi, kab/kota, dan kecamatan berhierarki', () => {
  assert.equal(listProvinces().length, 38);
  assert.ok(listRegencies('32').some((r) => r.kode === '32.73' && r.nama === 'Kota Bandung'));
  assert.ok(listDistricts('32.73').every((d) => d.kode.startsWith('32.73.')));
  assert.throws(() => listRegencies('32.73'), (err) => err.statusCode === 400);
  assert.throws(() => listRegencies('99'), (err) => err.statusCode === 404);
  assert.equal(resolveRegion('32', '32.73', '32.73.01').province.nama, 'Jawa Barat');
  assert.throws(() => resolveRegion('32', '31.71', '31.71.01'), (err) => err.statusCode === 400);
  assert.throws(() => resolveRegion('32', '32.73', '32.04.01'), (err) => err.statusCode === 400);
});

test('kode permohonan berformat PMQ-YYYYMMDD-XXXXXX', () => {
  const code = generateRequestCode(new Date('2026-11-09T03:00:00Z'));
  assert.match(code, /^PMQ-20261109-[A-HJ-NP-Z2-9]{6}$/);
});

test('kedua dokumen wajib diunggah', () => {
  assert.throws(() => validateMasterRequestFiles({}), (err) => err.statusCode === 400 && err.errors.length === 2);
  assert.throws(
    () => validateMasterRequestFiles({ surat_permohonan: [{ buffer: Buffer.from('x') }] }),
    (err) => err.errors.length === 1 && err.errors[0].field === 'profil_pemohon',
  );
});

test('permohonan dengan wilayah tidak konsisten ditolak sebelum berkas disimpan', async () => {
  const files = { surat_permohonan: [{ buffer: Buffer.from('x') }], profil_pemohon: [{ buffer: Buffer.from('x') }] };
  await assert.rejects(
    createMasterRequest({ ...validBody, kabupaten_kode: '31.71', kecamatan_kode: '31.71.01' }, files, penerbit),
    (err) => err.statusCode === 400,
  );
});

test('permohonan valid tersimpan beserta dua dokumen PDF dan salinan nama wilayah', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lpmq-master-req-'));
  const previousDir = process.env.MASTER_REQUEST_DOCS_DIR;
  process.env.MASTER_REQUEST_DOCS_DIR = dir;
  try {
    const pdf = await samplePdf();
    const files = {
      surat_permohonan: [{ buffer: pdf, originalname: 'surat permohonan.pdf' }],
      profil_pemohon: [{ buffer: pdf, originalname: 'profil.pdf' }],
    };
    let captured;
    const result = await withDelegates({
      masterMushafRequest: {
        create: async ({ data }) => {
          captured = data;
          return { ...data, id: 'req-1', status: 'DIAJUKAN', created_at: new Date() };
        },
      },
      notification: {
        create: async ({ data }) => {
          assert.equal(data.user_id, 'user-pen-1');
          return data;
        },
      },
    }, () => createMasterRequest(validBody, files, penerbit));

    assert.match(result.kode_permohonan, /^PMQ-/);
    assert.equal(result.jenis_mushaf, 'Yasin dan Tahlil');
    assert.equal(captured.province_name, 'Jawa Barat');
    assert.equal(captured.regency_name, 'Kota Bandung');
    assert.equal(captured.email, 'budi@example.com');
    assert.equal(captured.documents.create.length, 2);
    assert.equal(captured.publisher_id, 'pub-1');
    assert.equal(captured.submitted_by_id, 'user-pen-1');
    assert.deepEqual(captured.documents.create.map((d) => d.document_type), ['SURAT_PERMOHONAN', 'PROFIL_PEMOHON']);
    assert.equal((await readdir(dir)).length, 2);
  } finally {
    if (previousDir === undefined) delete process.env.MASTER_REQUEST_DOCS_DIR;
    else process.env.MASTER_REQUEST_DOCS_DIR = previousDir;
    await rm(dir, { recursive: true, force: true });
  }
});

test('berkas yang terlanjur tersimpan dihapus bila penyimpanan database gagal', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lpmq-master-req-'));
  const previousDir = process.env.MASTER_REQUEST_DOCS_DIR;
  process.env.MASTER_REQUEST_DOCS_DIR = dir;
  try {
    const pdf = await samplePdf();
    const files = { surat_permohonan: [{ buffer: pdf }], profil_pemohon: [{ buffer: pdf }] };
    await withDelegates({
      masterMushafRequest: { create: async () => { throw new Error('DB mati'); } },
    }, () => assert.rejects(createMasterRequest(validBody, files, penerbit), /DB mati/));
    assert.equal((await readdir(dir)).length, 0);
  } finally {
    if (previousDir === undefined) delete process.env.MASTER_REQUEST_DOCS_DIR;
    else process.env.MASTER_REQUEST_DOCS_DIR = previousDir;
    await rm(dir, { recursive: true, force: true });
  }
});

test('berkas bukan PDF atau lebih dari 500 KB ditolak', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lpmq-master-req-'));
  const previousDir = process.env.MASTER_REQUEST_DOCS_DIR;
  process.env.MASTER_REQUEST_DOCS_DIR = dir;
  try {
  const pdf = await samplePdf();
  await assert.rejects(
    createMasterRequest(validBody, { surat_permohonan: [{ buffer: Buffer.from('bukan pdf') }], profil_pemohon: [{ buffer: pdf }] }, penerbit),
    (err) => err.statusCode >= 400 && err.statusCode < 500 && /Surat Permohonan/.test(err.message),
  );
  // Sisipkan spasi setelah header agar struktur %PDF ... %%EOF tetap utuh
  const big = Buffer.concat([pdf.subarray(0, 9), Buffer.alloc(501 * 1024, 0x20), pdf.subarray(9)]);
  await assert.rejects(
    createMasterRequest(validBody, { surat_permohonan: [{ buffer: pdf }], profil_pemohon: [{ buffer: big }] }, penerbit),
    (err) => err.statusCode === 413,
  );
  assert.equal((await readdir(dir)).length, 0, 'berkas pertama yang lolos harus ikut dihapus');
  } finally {
    if (previousDir === undefined) delete process.env.MASTER_REQUEST_DOCS_DIR;
    else process.env.MASTER_REQUEST_DOCS_DIR = previousDir;
    await rm(dir, { recursive: true, force: true });
  }
});

test('hanya penerbit terverifikasi yang dapat mengajukan', async () => {
  assert.throws(() => requireVerifiedPublisher({ id: 'admin', roles: ['SUPERADMIN'] }), (err) => err.statusCode === 403);
  assert.throws(
    () => requireVerifiedPublisher({ ...penerbit, publisher: { verification_status: 'UNVERIFIED' } }),
    (err) => err.statusCode === 403,
  );
  assert.equal(requireVerifiedPublisher(penerbit), 'pub-1');
  await assert.rejects(createMasterRequest(validBody, {}, { id: 'x', roles: ['PENERBIT'] }), (err) => err.statusCode === 403);
});

test('penerbit hanya dapat melihat permohonan miliknya (404 untuk milik penerbit lain)', async () => {
  await withDelegates({
    masterMushafRequest: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, { id: 'req-lain', publisher_id: 'pub-1' });
        return null;
      },
    },
  }, () => assert.rejects(getPublisherMasterRequest('req-lain', penerbit), (err) => err.statusCode === 404));
});

test('surat persetujuan baru dapat dibuka penerbit setelah dikirim admin', async () => {
  const base = { id: 'req-1', publisher_id: 'pub-1', request_code: 'PMQ-1', letter_number: 'B-0001/LPMQ.01/HM.01/XI/2026' };
  await withDelegates({ masterMushafRequest: { findFirst: async () => ({ ...base, status: 'DITANDATANGANI' }) } },
    () => assert.rejects(getPublisherLetterPdf('req-1', penerbit), (err) => err.statusCode === 409));
});

test('daftar admin menghitung jumlah per status dan memfilter pencarian', async () => {
  await withDelegates({
    masterMushafRequest: {
      count: async ({ where }) => {
        assert.equal(where.status, 'MENUNGGU_TTE');
        assert.equal(where.OR.length, 5);
        return 1;
      },
      findMany: async ({ skip, take }) => {
        assert.equal(skip, 0);
        assert.equal(take, 10);
        return [{ id: 'req-1', request_code: 'PMQ-1' }];
      },
      groupBy: async () => [{ status: 'DIAJUKAN', _count: { _all: 3 } }, { status: 'DIKIRIM', _count: { _all: 1 } }],
    },
  }, async () => {
    const result = await listAdminMasterRequests({ page: 1, limit: 10, status: 'MENUNGGU_TTE', search: 'Budi' });
    assert.deepEqual(result.counts, { DIAJUKAN: 3, MENUNGGU_TTE: 0, DITANDATANGANI: 0, DIKIRIM: 1, DITOLAK: 0 });
  });
});

test('aksi admin mengikuti alur status', () => {
  assert.deepEqual(adminActionsFor('DIAJUKAN'), ['AJUKAN_TTE', 'TOLAK']);
  assert.deepEqual(adminActionsFor('MENUNGGU_TTE'), ['PERBARUI_SURAT']);
  assert.deepEqual(adminActionsFor('DITANDATANGANI'), ['KIRIM_KE_PENERBIT']);
  assert.deepEqual(adminActionsFor('DIKIRIM'), []);
  assert.deepEqual(adminActionsFor('DITOLAK'), []);
});

/** Delegate Prisma tiruan untuk satu permohonan yang statusnya bisa berubah. */
function fakeStore(initial) {
  const state = { row: { ...initial }, audits: [], notifications: [] };
  const delegate = {
    findUnique: async () => ({ ...state.row, documents: [], publisher: { id: 'pub-1', legal_name: 'PT Penerbit' } }),
    updateMany: async ({ where, data }) => {
      const allowed = where.status?.in || [where.status];
      if (!allowed.includes(state.row.status)) return { count: 0 };
      Object.assign(state.row, data);
      return { count: 1 };
    },
  };
  const tx = { masterMushafRequest: delegate, auditLog: { create: async ({ data }) => state.audits.push(data) } };
  const delegates = {
    masterMushafRequest: delegate,
    notification: { create: async ({ data }) => state.notifications.push(data) },
    documentNumberSequence: { upsert: async () => ({ last_number: 7 }) },
    verificationDocument: { findFirst: async () => null, count: async () => 0 },
    $transaction: async (fn) => fn({ ...tx, documentNumberSequence: delegates.documentNumberSequence, verificationDocument: delegates.verificationDocument }),
  };
  return { state, delegates };
}

const pending = {
  id: 'req-1',
  request_code: 'PMQ-20261110-ABC234',
  status: 'DIAJUKAN',
  publisher_id: 'pub-1',
  submitted_by_id: 'user-pen-1',
  applicant_name: 'Budi',
  institution: 'PT Penerbit',
  email: 'budi@example.com',
  mushaf_type: 'YASIN_TAHLIL',
  mushaf_type_label: 'Yasin dan Tahlil',
  letter_number: null,
};
const admin = { id: 'admin-1', roles: ['ADMIN_INTERNAL'] };
const kepala = { id: 'kepala-1', roles: ['KEPALA_LPMQ'] };

test('alur lengkap: admin ajukan surat -> Kepala TTE -> admin kirim ke penerbit', async () => {
  const { state, delegates } = fakeStore(pending);
  await withDelegates(delegates, async () => {
    const afterSubmit = await submitLetterForSignature('req-1', { perihal: 'Persetujuan Master', isi: 'Master dikirim melalui surel resmi.' }, admin);
    assert.equal(state.row.status, 'MENUNGGU_TTE');
    assert.match(state.row.letter_number, /^B-0007\/LPMQ\.01\/HM\.01\//);
    assert.deepEqual(afterSubmit.allowed_actions, ['PERBARUI_SURAT']);

    // Admin belum boleh mengirim sebelum ditandatangani
    await assert.rejects(sendLetterToPublisher('req-1', admin), (err) => err.statusCode === 409);

    const signed = await signMasterLetter('req-1', kepala);
    assert.equal(signed.status, 'DITANDATANGANI');
    assert.equal(state.row.signed_by_id, 'kepala-1');
    assert.match(state.row.signature_hash, /^[a-f0-9]{64}$/);

    await sendLetterToPublisher('req-1', admin);
    assert.equal(state.row.status, 'DIKIRIM');
    assert.equal(state.notifications.at(-1).user_id, 'user-pen-1');
    assert.equal(state.notifications.at(-1).type, 'MASTER_REQUEST_DIKIRIM');
  });
  assert.deepEqual(state.audits.map((a) => a.action), [
    'MASTER_LETTER_SUBMITTED_FOR_TTE', 'MASTER_LETTER_SIGNED', 'MASTER_LETTER_SENT_TO_PUBLISHER',
  ]);
});

test('penyusun surat tidak boleh menandatangani suratnya sendiri', async () => {
  const { delegates } = fakeStore({ ...pending, status: 'MENUNGGU_TTE', letter_drafted_by_id: 'kepala-1' });
  await withDelegates(delegates, () => assert.rejects(signMasterLetter('req-1', kepala), (err) => err.statusCode === 403));
});

test('surat tidak dapat ditandatangani dua kali', async () => {
  const { delegates } = fakeStore({ ...pending, status: 'DITANDATANGANI' });
  await withDelegates(delegates, () => assert.rejects(signMasterLetter('req-1', kepala), (err) => err.statusCode === 409));
});

test('penolakan hanya untuk permohonan DIAJUKAN dan memberi tahu penerbit', async () => {
  const { state, delegates } = fakeStore(pending);
  await withDelegates(delegates, async () => {
    await rejectMasterRequest('req-1', { alasan: 'Profil lembaga tidak sesuai' }, admin);
    assert.equal(state.row.status, 'DITOLAK');
    assert.equal(state.notifications[0].type, 'MASTER_REQUEST_DITOLAK');
    await assert.rejects(rejectMasterRequest('req-1', { alasan: 'Lagi' }, admin), (err) => err.statusCode === 409);
  });
});

test('permohonan formulir publik lama (tanpa penerbit) tidak dapat dibuatkan surat', async () => {
  const { delegates } = fakeStore({ ...pending, publisher_id: null });
  await withDelegates(delegates, () => assert.rejects(
    submitLetterForSignature('req-1', { perihal: 'X', isi: 'Isi surat yang cukup panjang.' }, admin),
    (err) => err.statusCode === 409,
  ));
});

test('hash TTE berubah bila isi surat diubah', () => {
  const at = new Date('2026-11-10T03:00:00Z');
  const base = { ...pending, letter_number: 'B-1', letter_subject: 'Hal', letter_body: 'Isi' };
  assert.equal(computeLetterHash(base, 'k', at), computeLetterHash({ ...base }, 'k', at));
  assert.notEqual(computeLetterHash(base, 'k', at), computeLetterHash({ ...base, letter_body: 'Isi diubah' }, 'k', at));
});

test('PDF surat: draf belum bertanda tangan dan versi final bertanda tangan elektronik', async () => {
  const letter = {
    ...pending,
    created_at: new Date('2026-11-10T02:00:00Z'),
    regency_name: 'Kota Bandung',
    letter_number: 'B-0007/LPMQ.01/HM.01/XI/2026',
    letter_subject: "Persetujuan Permohonan Master Mushaf Al-Qur'an",
    letter_body: 'Master dapat diambil di kantor LPMQ pada hari kerja.',
    letter_drafted_at: new Date('2026-11-10T03:00:00Z'),
    publisher: { legal_name: 'PT Penerbit' },
  };
  const draft = await renderMasterLetterPdf(letter);
  assert.equal(draft.subarray(0, 5).toString(), '%PDF-');
  const signed = await renderMasterLetterPdf({
    ...letter, signed_at: new Date('2026-11-10T04:00:00Z'), signature_hash: 'a'.repeat(64), signed_by: { name: 'Kepala LPMQ', nip: '1970' },
  });
  assert.equal(signed.subarray(0, 5).toString(), '%PDF-');
  assert.notEqual(draft.length, signed.length);
});

test('pembungkus teks PDF memecah baris panjang dan mengganti karakter non-ASCII', async () => {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const font = await (await PDFDocument.create()).embedFont(StandardFonts.TimesRoman);
  const lines = wrapText('kata '.repeat(60) + '“kutip”', font, 11, 200);
  assert.ok(lines.length > 3);
  assert.ok(lines.every((line) => font.widthOfTextAtSize(line, 11) <= 200));
});
