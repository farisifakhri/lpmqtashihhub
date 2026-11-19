import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/config/database.js';
import { getPublicSurveyReport, listPublicSurveys } from '../../src/services/survey.service.js';
import { publicSurveyReportSchema } from '../../src/validators/survey.validator.js';

const ID = '11111111-1111-4111-8111-111111111111';
const unsurA = { id: 'ua', code: 'A', name: 'Persyaratan', definition: 'Definisi unsur A', sort_order: 1 };
const unsurB = { id: 'ub', code: 'B', name: 'Prosedur', definition: null, sort_order: 2 };
const survey = (status) => ({
  id: ID, name: 'Indeks Persepsi Kualitas Pelayanan', kind: 'IKM', description: null, status, starts_at: null, ends_at: null,
  items: [
    { question_id: 'q1', unsur_id: 'ua', unsur: unsurA, question: { type: 'PILIHAN', text: 'Q1' } },
    { question_id: 'q2', unsur_id: 'ub', unsur: unsurB, question: { type: 'PILIHAN', text: 'Q2' } },
    { question_id: 'q3', unsur_id: 'ub', unsur: unsurB, question: { type: 'ESAI', text: 'Saran' } },
  ],
});

function mockPrisma(status) {
  const originals = { s: prisma.survey.findUnique, a: prisma.surveyAnswer.findMany, r: prisma.surveyResponse.findMany };
  const calls = {};
  prisma.survey.findUnique = async () => survey(status);
  prisma.surveyAnswer.findMany = async (args) => {
    calls.answers = args;
    const resp = { respondent_name: 'Budi Rahasia', submitted_at: new Date() };
    return [
      { response_id: 'r1', question_id: 'q1', value: 4, response: resp },
      { response_id: 'r2', question_id: 'q1', value: 3, response: resp },
      { response_id: 'r1', question_id: 'q2', value: 4, response: resp },
      { response_id: 'r2', question_id: 'q2', value: 2, response: resp },
      { response_id: 'r1', question_id: 'q3', value: null, essay_text: 'esai pribadi', response: resp },
    ];
  };
  prisma.surveyResponse.findMany = async (args) => {
    calls.responses = args;
    return [
      { id: 'r1', respondent_name: 'Budi Rahasia', gender: 'L', age: 35, education: 'S1', occupation: 'SWASTA', is_disabled: true, feedback: 'kritik pribadi' },
      { id: 'r2', respondent_name: 'Siti', gender: 'P', age: 52, education: 'S2', occupation: 'PNS', is_disabled: false, feedback: null },
    ];
  };
  return { calls, restore: () => { prisma.survey.findUnique = originals.s; prisma.surveyAnswer.findMany = originals.a; prisma.surveyResponse.findMany = originals.r; } };
}

test('laporan publik: NRR, jumlah nilai, responden per unsur, IKM terkonversi dan mutu', async () => {
  const { calls, restore } = mockPrisma('AKTIF');
  try {
    const report = await getPublicSurveyReport(ID, { from: '2026-01-01', to: '2026-01-31' });
    assert.equal(report.respondents, 2);
    assert.deepEqual(report.unsur.map((u) => [u.code, u.sum, u.respondents, u.average, u.converted, u.mutu.grade]), [
      ['A', 7, 2, 3.5, 87.5, 'B'],
      ['B', 6, 2, 3, 75, 'C'],
    ]);
    assert.equal(report.average, 3.25);
    assert.equal(report.index, 81.25);
    assert.equal(report.mutu.label, 'Baik');
    assert.equal(report.unsur[0].definition, 'Definisi unsur A'); // definisi unsur tampil di halaman publik
    // rentang tanggal inklusif sampai akhir hari `to`
    assert.equal(calls.responses.where.submitted_at.gte.getDate(), 1);
    assert.equal(calls.responses.where.submitted_at.lte.getHours(), 23);
    assert.deepEqual(calls.answers.where.response, calls.responses.where);
    // tidak membocorkan data pribadi
    const json = JSON.stringify(report);
    for (const secret of ['Budi Rahasia', 'esai pribadi', 'kritik pribadi', 'disability']) assert.ok(!json.includes(secret), secret);
    assert.deepEqual(Object.keys(report.demographics).sort(), ['age', 'education', 'gender', 'occupation']);
    // usia per tahun seperti situs lama, urut naik
    assert.deepEqual(report.demographics.age.map((r) => r.label), ['35 Tahun', '52 Tahun']);
  } finally { restore(); }
});

test('survei DRAFT tidak bisa dibuka publik', async () => {
  const { restore } = mockPrisma('DRAFT');
  try {
    await assert.rejects(getPublicSurveyReport(ID), (err) => err.statusCode === 404 || err.status === 404);
  } finally { restore(); }
});

test('daftar survei publik hanya AKTIF/NONAKTIF', async () => {
  const original = prisma.survey.findMany;
  let captured;
  prisma.survey.findMany = async (args) => { captured = args; return []; };
  try {
    await listPublicSurveys();
    assert.deepEqual(captured.where, { status: { in: ['AKTIF', 'NONAKTIF'] } });
  } finally { prisma.survey.findMany = original; }
});

test('query rentang tanggal divalidasi', () => {
  const q = publicSurveyReportSchema.query;
  assert.equal(q.safeParse({ from: '2026-01-01', to: '2026-02-01' }).success, true);
  assert.equal(q.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success, false);
  assert.equal(q.safeParse({ from: '01-01-2026' }).success, false);
  assert.equal(q.safeParse({}).success, true);
});

test('unsur baku: 9 unsur IKM (A–I) dan 12 unsur IPAK (1–10 sistem lama + 2 anti-korupsi)', async () => {
  const { STANDARD_UNSUR } = await import('../../src/services/survey.service.js');
  const ikm = STANDARD_UNSUR.filter((u) => u.kind === 'IKM');
  const ipak = STANDARD_UNSUR.filter((u) => u.kind === 'IPAK');
  assert.deepEqual(ikm.map((u) => u.code), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  assert.equal(ikm[0].name, 'Persyaratan Pelayanan Pentashihan');
  assert.equal(ikm[7].name, 'Penanganan Pengaduan, Saran dan Masukan');
  assert.deepEqual(ipak.map((u) => `${u.code} ${u.name}`), [
    '1 Manipulasi Peraturan', '2 Penyalahgunaan Jabatan', '3 Menjual Pengaruh', '4 Transparansi Biaya', '5 Biaya Tambahan',
    '6 Hadiah', '7 Transparansi Pembayaran', '8 Percaloan', '9 Perbuatan Curang', '10 Transaksi Rahasia',
    '11 Transparansi Pelayanan', '12 Integritas Petugas Pelayanan',
  ]);
  assert.equal(new Set(STANDARD_UNSUR.map((u) => u.code)).size, 21); // kode unik (kolom code @unique)
});

test('mutu IPAK memakai label anti korupsi dengan rentang yang sama', async () => {
  const { mutuFor } = await import('../../src/services/survey.service.js');
  assert.equal(mutuFor(98.48, 'IPAK').label, 'Bersih dari korupsi');
  assert.equal(mutuFor(98.48, 'IPAK').grade, 'A');
  assert.equal(mutuFor(80, 'IPAK').label, 'Cukup bersih dari korupsi');
  assert.equal(mutuFor(91.27).label, 'Sangat Baik');
});

test('survei IPAK baru langsung memuat 10 unsur baku IPAK dengan pertanyaan pertamanya', async () => {
  const { createSurvey } = await import('../../src/services/survey.service.js');
  const original = prisma.$transaction;
  let created;
  const tx = {
    survey: {
      create: async ({ data }) => ({ id: 'sv', ...data, _count: { items: 0, responses: 0 } }),
      findUnique: async () => ({ id: 'sv', kind: 'IPAK', _count: { items: created.length, responses: 0 } }),
    },
    surveyUnsur: {
      findMany: async (args) => {
        assert.deepEqual(args.where, { kind: 'IPAK', is_standard: true, is_archived: false });
        return [
          { id: 'u1', questions: [{ id: 'q1' }] },
          { id: 'u2', questions: [] }, // unsur tanpa pertanyaan dilewati
          { id: 'u3', questions: [{ id: 'q3' }] },
        ];
      },
    },
    surveyItem: { createMany: async ({ data }) => { created = data; } },
    auditLog: { create: async () => ({}) },
  };
  prisma.$transaction = async (fn) => fn(tx);
  try {
    const result = await createSurvey({ name: 'IPAK 2027', kind: 'IPAK' }, { id: 'admin' }, { headers: {}, ip: '127.0.0.1' });
    assert.deepEqual(created, [
      { survey_id: 'sv', unsur_id: 'u1', question_id: 'q1', sort_order: 0 },
      { survey_id: 'sv', unsur_id: 'u3', question_id: 'q3', sort_order: 1 },
    ]);
    assert.equal(result._count.items, 2);
  } finally { prisma.$transaction = original; }
});

test('jawaban Likert 1–5 dikonversi ke 25–100 setara skala 1–4', async () => {
  const opts = (max) => Array.from({ length: max }, (_, i) => ({ value: i + 1 }));
  const u4 = { id: 'u4', code: '1', name: 'Percaloan', definition: null, sort_order: 1 };
  const u5 = { id: 'u5', code: '12', name: 'Integritas Petugas Pelayanan', definition: null, sort_order: 2 };
  const originals = { s: prisma.survey.findUnique, a: prisma.surveyAnswer.findMany, r: prisma.surveyResponse.findMany };
  prisma.survey.findUnique = async () => ({
    id: ID, name: 'IPAK', kind: 'IPAK', status: 'AKTIF',
    items: [
      { question_id: 'q4', unsur_id: 'u4', unsur: u4, question: { type: 'PILIHAN', text: 'Q4', options: opts(4) } },
      { question_id: 'q5', unsur_id: 'u5', unsur: u5, question: { type: 'PILIHAN', text: 'Q5', options: opts(5) } },
    ],
  });
  prisma.surveyAnswer.findMany = async () => [
    { response_id: 'r1', question_id: 'q4', value: 4, response: {} },
    { response_id: 'r1', question_id: 'q5', value: 5, response: {} }, // 5/5 → 100
    { response_id: 'r2', question_id: 'q5', value: 3, response: {} }, // 3/5 → setara 2,5 → 62,5
  ];
  prisma.surveyResponse.findMany = async () => [{ id: 'r1' }, { id: 'r2' }];
  try {
    const report = await getPublicSurveyReport(ID);
    const integritas = report.unsur.find((u) => u.code === '12');
    assert.equal(integritas.scale, 5);
    assert.equal(integritas.average, 4); // NRR pada skala aslinya
    assert.equal(integritas.converted, 81.25); // (100 + 62,5) / 2
    assert.equal(integritas.mutu.label, 'Cukup bersih dari korupsi');
    assert.equal(report.unsur.find((u) => u.code === '1').converted, 100);
    assert.equal(report.index, 90.63);
    assert.equal(report.mutu.label, 'Bersih dari korupsi');
  } finally {
    prisma.survey.findUnique = originals.s; prisma.surveyAnswer.findMany = originals.a; prisma.surveyResponse.findMany = originals.r;
  }
});

test('label mutu kustom dari Super Admin menggantikan label bawaan', async () => {
  const { mutuFor } = await import('../../src/services/survey.service.js');
  const { updateSurveySchema } = await import('../../src/validators/survey.validator.js');
  assert.equal(mutuFor(95, 'IKM', { A: 'Sangat Memuaskan' }).label, 'Sangat Memuaskan');
  assert.equal(mutuFor(80, 'IKM', { A: 'Sangat Memuaskan' }).label, 'Baik'); // huruf lain tetap bawaan
  assert.equal(mutuFor(95, 'IPAK', { A: 'Bebas Korupsi' }).label, 'Bebas Korupsi');
  const parse = (mutu_labels) => updateSurveySchema.body.parse({ mutu_labels }).mutu_labels;
  assert.deepEqual(parse({ A: ' Sangat Memuaskan ', B: '' }), { A: 'Sangat Memuaskan' });
  assert.equal(parse({ A: '', B: '' }), null); // semua kosong = kembali ke bawaan
  assert.equal(updateSurveySchema.body.safeParse({ mutu_labels: { E: 'x' } }).success, false);
  assert.equal(updateSurveySchema.body.safeParse({ mutu_labels: { A: 'x'.repeat(61) } }).success, false);
});
