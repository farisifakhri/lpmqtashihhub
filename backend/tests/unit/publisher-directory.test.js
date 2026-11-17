import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { detectProvince, UNKNOWN_PROVINCE, PROVINCE_NAMES } from '../../src/utils/province.js';
import { directoryLetter, getPublicPublisherDirectory, getPublisherDirectory } from '../../src/services/publisher.service.js';
import { publisherDirectorySchema } from '../../src/validators/publisher.validator.js';

test('provinsi dideteksi dari alamat nyata direktori lama (nama provinsi maupun kota)', () => {
  assert.equal(detectProvince('Jl. Tarumanegara utama no. 37. Banyuanyar RT 4 RW VI Banjarsari Solo Jawa Tengah Kode Pos 57137'), 'Jawa Tengah');
  assert.equal(detectProvince('Jl. Medokan Semampir Blok D/2, Surabaya'), 'Jawa Timur');
  assert.equal(detectProvince('Jalan Saluyu B XVI No 455 Cimapokolan Rancasari Kota Bandung'), 'Jawa Barat');
  // alamat hasil peta pendaftaran (Nominatim)
  assert.equal(detectProvince('Taman Mini Indonesia Indah, Kec. Cipayung, Jakarta Timur, Daerah Khusus Ibukota Jakarta, 13810'), 'DKI Jakarta');
});

test('kecocokan paling belakang dan alias terpanjang yang menang', () => {
  assert.equal(detectProvince('Jl. Bandung No. 5, Surabaya'), 'Jawa Timur'); // nama jalan tidak menentukan
  assert.equal(detectProvince('Sorong, Papua Barat Daya'), 'Papua Barat Daya');
  assert.equal(detectProvince('Batam, Kepulauan Riau'), 'Kepulauan Riau');
  assert.equal(detectProvince('Ternate, Maluku Utara'), 'Maluku Utara');
  assert.equal(detectProvince('Jl. Banjarsari No. 1'), UNKNOWN_PROVINCE); // "banjar" di dalam kata tidak terhitung
  assert.equal(detectProvince(''), UNKNOWN_PROVINCE);
  assert.equal(PROVINCE_NAMES.length, 38);
});

test('huruf direktori mengabaikan awalan badan hukum', () => {
  assert.equal(directoryLetter('PT. Akademi Amazing'), 'A');
  assert.equal(directoryLetter('CV Bintang'), 'B');
  assert.equal(directoryLetter('Yayasan Mushaf Uji'), 'M');
  assert.equal(directoryLetter('abyan'), 'A');
  assert.equal(directoryLetter('3 Serangkai'), '#');
});

test('query direktori divalidasi: huruf A-Z/#, limit maks 100', () => {
  assert.equal(publisherDirectorySchema.query.parse({ letter: 'b' }).letter, 'B');
  assert.equal(publisherDirectorySchema.query.safeParse({ letter: 'AB' }).success, false);
  assert.equal(publisherDirectorySchema.query.safeParse({ limit: '500' }).success, false);
  assert.deepEqual(publisherDirectorySchema.query.parse({}), { page: 1, limit: 20 });
});

test('direktori: hanya penerbit terverifikasi, urut nama, filter huruf/provinsi/kata kunci, dan ringkasan', async () => {
  const rows = [
    { id: 'p2', legal_name: 'Agna Media Indokarya', entity_type: 'PT', address: 'Jl. Medokan Semampir Blok D/2, Surabaya', phone: '083856670965', nomor_induk_penerbit: '01', npwp: '', nib: '', created_at: new Date(), user: { name: 'Nur Hayati', email: 'quranagna@gmail.com' }, registration_submission: null },
    { id: 'p1', legal_name: 'abyan', entity_type: 'PT', address: 'Banjarsari Solo Jawa Tengah', phone: null, nomor_induk_penerbit: null, npwp: null, nib: null, created_at: new Date(), user: { name: 'akun', email: 'abyanpenerbit@yahoo.com' }, registration_submission: { address: 'x', pic_name: 'Edy Sutarto, S.T.', pic_phone: '081329086542', email: 'abyan@x.id', decided_at: null } },
    { id: 'p3', legal_name: 'PT Bintang Cahaya', entity_type: 'PT', address: 'Kota Bandung', phone: '0811', nomor_induk_penerbit: null, npwp: null, nib: null, created_at: new Date(), user: null, registration_submission: null },
  ];
  const original = prisma.publisher.findMany;
  let captured;
  prisma.publisher.findMany = async (args) => { captured = args; return rows; };
  try {
    const all = await getPublisherDirectory({ page: 1, limit: 2 });
    assert.deepEqual(captured.where, { verification_status: 'VERIFIED' });
    assert.deepEqual(all.items.map((row) => [row.no, row.name]), [[1, 'abyan'], [2, 'Agna Media Indokarya']]);
    assert.equal(all.items[0].pic_name, 'Edy Sutarto, S.T.'); // PJ dari formulir pendaftaran
    assert.equal(all.items[0].phone, '081329086542');
    assert.equal(all.items[0].email, 'abyanpenerbit@yahoo.com'); // email akun login
    assert.equal(all.items[0].province, 'Jawa Tengah');
    assert.deepEqual(all.pagination, { total: 3, page: 1, limit: 2, totalPages: 2 });
    assert.deepEqual(all.summary.letters, { A: 2, B: 1 });
    assert.equal(all.summary.total, 3);
    assert.equal(all.summary.provinces.find((p) => p.name === 'Jawa Timur').count, 1);
    assert.equal(all.summary.provinces.find((p) => p.name === 'Aceh').count, 0);

    const page2 = await getPublisherDirectory({ page: 2, limit: 2 });
    assert.deepEqual(page2.items.map((row) => [row.no, row.name]), [[3, 'PT Bintang Cahaya']]);

    assert.deepEqual((await getPublisherDirectory({ letter: 'B' })).items.map((row) => row.id), ['p3']);
    assert.deepEqual((await getPublisherDirectory({ province: 'Jawa Timur' })).items.map((row) => row.id), ['p2']);
    assert.deepEqual((await getPublisherDirectory({ search: 'QURANAGNA' })).items.map((row) => row.id), ['p2']);
    // ringkasan tetap menghitung semua penerbit walau tabel tersaring
    assert.equal((await getPublisherDirectory({ letter: 'B' })).summary.total, 3);
  } finally {
    prisma.publisher.findMany = original;
  }
});

test('direktori publik tidak mengeluarkan NPWP dan NIB', async () => {
  const original = prisma.publisher.findMany;
  prisma.publisher.findMany = async () => [
    { id: 'p1', legal_name: 'abyan', entity_type: 'PT', address: 'Solo Jawa Tengah', phone: '0813', nomor_induk_penerbit: '01', npwp: '012345678901000', nib: '9120001234567', created_at: new Date(), user: { name: 'Edy', email: 'a@b.id' }, registration_submission: null },
  ];
  try {
    const result = await getPublicPublisherDirectory({ page: 1, limit: 20 });
    assert.equal(result.items.length, 1);
    assert.equal('npwp' in result.items[0], false);
    assert.equal('nib' in result.items[0], false);
    assert.equal(result.items[0].email, 'a@b.id');
    assert.equal(result.summary.total, 1);
  } finally {
    prisma.publisher.findMany = original;
  }
});
