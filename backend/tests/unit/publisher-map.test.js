import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { coordinatesSchema, createPublisherRegistrationSchema } from '../../src/validators/publisher-registration.validator.js';
import { listPublisherMapPoints, PUBLISHER_MAP_LIMIT } from '../../src/services/publisher-registration.service.js';

const validBody = {
  nama_penerbit: 'PT Pustaka Uji',
  jenis_penerbit: 'PERUSAHAAN',
  alamat_lengkap: 'Jl. Percetakan Mushaf No. 12, Kec. Cipayung, Jakarta Timur',
  nama_penanggung_jawab: 'Ahmad Uji',
  telepon_penanggung_jawab: '081234567890',
  email: 'uji@pustaka.co.id',
  password: 'RahasiaKuat1',
  npwp: '012345678901000',
};

test('titik kantor opsional: pendaftaran tanpa koordinat tetap sah', () => {
  const parsed = createPublisherRegistrationSchema.body.parse(validBody);
  assert.equal(parsed.latitude, undefined);
  assert.equal(parsed.longitude, undefined);
  // multipart mengirim string kosong bila pin tidak dipilih
  assert.equal(createPublisherRegistrationSchema.body.safeParse({ ...validBody, latitude: '', longitude: '' }).success, true);
});

test('titik kantor dari multipart (string) diubah ke angka', () => {
  const parsed = createPublisherRegistrationSchema.body.parse({ ...validBody, latitude: '-6.30115', longitude: '106.89615' });
  assert.equal(parsed.latitude, -6.30115);
  assert.equal(parsed.longitude, 106.89615);
});

test('titik kantor ditolak bila tidak berpasangan, bukan angka, atau di luar Indonesia', () => {
  const cases = [
    { latitude: '-6.3' }, // longitude hilang
    { latitude: 'abc', longitude: '106.9' },
    { latitude: '48.85', longitude: '2.35' }, // Paris
    { latitude: '-6.3', longitude: '160' },
    { latitude: 'Infinity', longitude: '106.9' },
  ];
  for (const coords of cases) {
    assert.equal(createPublisherRegistrationSchema.body.safeParse({ ...validBody, ...coords }).success, false, JSON.stringify(coords));
    assert.equal(coordinatesSchema.safeParse(coords).success, false, JSON.stringify(coords));
  }
  assert.equal(coordinatesSchema.parse({}).latitude, undefined); // revisi tanpa titik: titik lama dipertahankan
});

test('peta publik hanya memuat penerbit terverifikasi, akun aktif, bertitik, tanpa data sensitif', async () => {
  const original = prisma.publisher.findMany;
  let captured;
  prisma.publisher.findMany = async (args) => {
    captured = args;
    return [{ id: 'p1', legal_name: 'PT Pustaka Uji', address: 'Jakarta Timur', latitude: -6.3, longitude: 106.9 }];
  };
  try {
    const points = await listPublisherMapPoints();
    assert.deepEqual(points, [{ id: 'p1', name: 'PT Pustaka Uji', address: 'Jakarta Timur', latitude: -6.3, longitude: 106.9 }]);
    assert.deepEqual(captured.where, {
      verification_status: 'VERIFIED',
      latitude: { not: null },
      longitude: { not: null },
      user: { status: 'ACTIVE' },
    });
    assert.deepEqual(Object.keys(captured.select).sort(), ['address', 'id', 'latitude', 'legal_name', 'longitude']);
    assert.equal(captured.take, PUBLISHER_MAP_LIMIT);
  } finally {
    prisma.publisher.findMany = original;
  }
});
