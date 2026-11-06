import { prisma } from '../config/database.js';
import { fail, audit } from './workflow-utils.js';

// Mutu pelayanan menurut PermenPANRB 14/2017 (nilai konversi 25–100).
const MUTU = [
  { min: 88.31, grade: 'A', label: 'Sangat Baik' },
  { min: 76.61, grade: 'B', label: 'Baik' },
  { min: 65.0, grade: 'C', label: 'Kurang Baik' },
  { min: 25.0, grade: 'D', label: 'Tidak Baik' },
];

const round2 = (n) => Math.round(n * 100) / 100;

export function mutuFor(indexValue) {
  if (indexValue == null) return null;
  return MUTU.find((m) => indexValue >= m.min) || MUTU[MUTU.length - 1];
}

// Survei AKTIF yang lewat tanggal selesai ditampilkan "BERAKHIR" tanpa perlu diubah manual.
export function displayStatus(survey, now = new Date()) {
  if (survey.status === 'AKTIF' && survey.ends_at && new Date(survey.ends_at) < now) return 'BERAKHIR';
  return survey.status;
}

const withAudit = (user, req, actionName, subjectType, fn) =>
  prisma.$transaction(async (tx) => {
    const result = await fn(tx);
    await audit(tx, user, actionName, subjectType, result.id, result, req);
    return result;
  });

// ---------------------------------------------------------------- Unsur
export async function listUnsur({ kind, include_archived } = {}) {
  return prisma.surveyUnsur.findMany({
    where: { ...(kind ? { kind } : {}), ...(include_archived === 'true' ? {} : { is_archived: false }) },
    orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    include: { survey: { select: { id: true, name: true } }, _count: { select: { items: true } } },
  });
}

async function requireUnsurSurvey(tx, surveyId) {
  if (surveyId && !(await tx.survey.findUnique({ where: { id: surveyId }, select: { id: true } }))) fail(400, 'Survei yang dipilih tidak ditemukan. Muat ulang halaman lalu pilih kembali.');
}

// 9 unsur SKM, Pedoman Menteri PANRB No. 9 Tahun 2024, BAB III hlm. 12–13 (urutan = sort_order).
export const STANDARD_UNSUR = [
  ['A', 'Persyaratan', 'Syarat yang harus dipenuhi dalam pengurusan suatu jenis pelayanan, baik persyaratan teknis maupun administratif.'],
  ['B', 'Sistem, Mekanisme, dan Prosedur', 'Tata cara pelayanan yang dibakukan bagi pemberi dan penerima pelayanan, termasuk pengaduan.'],
  ['C', 'Waktu Penyelesaian', 'Jangka waktu yang diperlukan untuk menyelesaikan seluruh proses pelayanan dari setiap jenis pelayanan.'],
  ['D', 'Biaya/Tarif', 'Ongkos yang dikenakan kepada penerima layanan dalam mengurus dan/atau memperoleh pelayanan dari penyelenggara yang besarnya ditetapkan berdasarkan kesepakatan antara penyelenggara dan masyarakat.'],
  ['E', 'Produk, Spesifikasi, dan Jenis Pelayanan', 'Hasil pelayanan yang diberikan dan diterima sesuai dengan ketentuan yang telah ditetapkan.'],
  ['F', 'Kompetensi Pelaksana', 'Kemampuan yang harus dimiliki oleh pelaksana meliputi pengetahuan, keahlian, keterampilan, dan pengalaman.'],
  ['G', 'Perilaku Pelaksana', 'Sikap petugas dalam memberikan pelayanan.'],
  ['H', 'Penanganan Pengaduan', 'Tata cara pelaksanaan penanganan pengaduan dan tindak lanjut.'],
  ['I', 'Sarana dan Prasarana', 'Segala sesuatu yang dapat dipakai sebagai alat dalam mencapai maksud dan tujuan. Prasarana adalah segala sesuatu yang merupakan penunjang utama terselenggaranya suatu proses. Sarana digunakan untuk benda yang bergerak dan prasarana untuk benda yang tidak bergerak.'],
].map(([code, name, definition], i) => ({ code, name, definition, sort_order: i + 1 }));

// Pertanyaan Data Persepsi baku, Pedoman Menteri PANRB No. 9/2024 hlm. 16–18, varian Campuran (Hybrid):
// layanan pentashihan memadukan pendaftaran daring dan penyerahan master fisik luring.
const STANDARD_SCALE = [['Sangat baik', 4], ['Baik', 3], ['Kurang baik', 2], ['Tidak baik', 1]].map(([label, value]) => ({ label, value }));
export const STANDARD_QUESTIONS = [
  ['A', 'Bagaimana penilaian Bapak/Ibu tentang kesesuaian persyaratan pelayanan yang harus dipenuhi dengan persyaratan pelayanan yang diinformasikan?'],
  ['B', 'Bagaimana penilaian Bapak/Ibu mengenai kemudahan prosedur yang dijalani untuk mendapatkan layanan?'],
  ['C', 'Bagaimana penilaian Bapak/Ibu mengenai kesesuaian jangka waktu penyelesaian pelayanan dengan yang diinformasikan?'],
  ['D', 'Bagaimana penilaian Bapak/Ibu mengenai kesesuaian biaya pelayanan yang dibayarkan dengan yang diinformasikan?'],
  ['E', 'Bagaimana pendapat Saudara tentang kesesuaian produk pelayanan antara yang ada pada publikasi dengan pelayanan yang diberikan?'],
  ['F', 'Bagaimana kecepatan respon (membuka halaman, konten, pencarian informasi, unduh/unggah) dari aplikasi sistem pelayanan yang diberikan?'],
  ['F', 'Bagaimana penilaian Bapak/Ibu mengenai kesigapan petugas pelayanan?'],
  ['G', 'Bagaimana kemudahan dalam penggunaan fitur pada aplikasi sistem layanan?'],
  ['G', 'Bagaimana penilaian Bapak/Ibu mengenai perilaku/kemampuan petugas pelayanan?'],
  ['H', 'Bagaimana penilaian Bapak/Ibu mengenai ketersediaan sarana/media untuk menyampaikan pengaduan/saran?'],
  ['I', 'Bagaimana penilaian Bapak/Ibu tentang kualitas isi/konten dari aplikasi sistem layanan?'],
  ['I', 'Bagaimana penilaian Bapak/Ibu terhadap ketersediaan sarana dan prasarana pelayanan di Unit Penyelenggara Pelayanan?'],
].map(([code, text]) => ({ code, text }));

// Mengisi bank soal dengan pertanyaan baku; aman diulang (teks yang sama pada unsur yang sama dilewati).
export async function seedStandardQuestions(user, req) {
  return prisma.$transaction(async (tx) => {
    const unsur = await tx.surveyUnsur.findMany({ where: { code: { in: [...new Set(STANDARD_QUESTIONS.map((q) => q.code))] } } });
    const unsurByCode = new Map(unsur.map((u) => [u.code, u]));
    let created = 0;
    let existing = 0;
    const missing = new Set();
    for (const std of STANDARD_QUESTIONS) {
      const target = unsurByCode.get(std.code);
      if (!target) { missing.add(STANDARD_UNSUR.find((s) => s.code === std.code).name); continue; }
      if (await tx.surveyQuestion.findFirst({ where: { unsur_id: target.id, text: std.text }, select: { id: true } })) { existing += 1; continue; }
      await tx.surveyQuestion.create({ data: { text: std.text, type: 'PILIHAN', unsur_id: target.id, options: { create: optionRows('PILIHAN', STANDARD_SCALE) } } });
      created += 1;
    }
    const result = { created, existing, missing_unsur: [...missing] };
    await audit(tx, user, 'SURVEY_QUESTION_SEED_STANDARD', 'SurveyQuestion', 'standard', result, req);
    return result;
  });
}

// Membuat ulang unsur baku yang hilang dan mengembalikan urutannya. Unsur buatan sendiri dengan nama
// yang sama (mis. "Persyaratan" yang dibuat ulang setelah dihapus) dijadikan unsur baku, bukan diduplikasi.
export async function restoreStandardUnsur(user, req) {
  await prisma.$transaction(async (tx) => {
    for (const std of STANDARD_UNSUR) {
      const existing = await tx.surveyUnsur.findFirst({ where: { code: std.code } })
        || await tx.surveyUnsur.findFirst({ where: { name: std.name }, orderBy: { created_at: 'asc' } });
      const data = { code: std.code, name: std.name, kind: 'IKM', is_standard: true, sort_order: std.sort_order, is_archived: false };
      if (existing) await tx.surveyUnsur.update({ where: { id: existing.id }, data: { ...data, definition: existing.definition || std.definition } });
      else await tx.surveyUnsur.create({ data: { ...data, definition: std.definition } });
    }
    await audit(tx, user, 'SURVEY_UNSUR_RESTORE_STANDARD', 'SurveyUnsur', 'standard', { codes: STANDARD_UNSUR.map((s) => s.code) }, req);
  });
  return listUnsur();
}

export async function createUnsur(data, user, req) {
  return withAudit(user, req, 'SURVEY_UNSUR_CREATE', 'SurveyUnsur', async (tx) => {
    await requireUnsurSurvey(tx, data.survey_id);
    return tx.surveyUnsur.create({ data });
  });
}

export async function updateUnsur(id, data, user, req) {
  return withAudit(user, req, 'SURVEY_UNSUR_UPDATE', 'SurveyUnsur', async (tx) => {
    const unsur = await tx.surveyUnsur.findUnique({ where: { id } });
    if (!unsur) fail(404, 'Unsur survei tidak ditemukan.');
    // 9 unsur baku PANRB berlaku untuk semua survei; mengikatnya ke satu survei membuatnya hilang dari survei lain.
    if (unsur.is_standard && data.survey_id) fail(422, 'Unsur baku PANRB berlaku untuk semua survei dan tidak dapat dikhususkan ke satu survei.');
    await requireUnsurSurvey(tx, data.survey_id);
    return tx.surveyUnsur.update({ where: { id }, data });
  });
}

export async function deleteUnsur(id, { force } = {}, user, req) {
  return withAudit(user, req, 'SURVEY_UNSUR_DELETE', 'SurveyUnsur', async (tx) => {
    const unsur = await tx.surveyUnsur.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
    if (!unsur) fail(404, 'Unsur survei tidak ditemukan.');
    // force: unsur dikeluarkan dari susunan survei yang memakainya; pertanyaannya tetap ada di bank soal tanpa unsur.
    if (unsur._count.items && force !== 'true') fail(409, 'Unsur ini sudah dipakai pada survei. Hapus paksa untuk mengeluarkannya dari susunan survei tersebut.');
    await tx.surveyItem.deleteMany({ where: { unsur_id: id } });
    return tx.surveyUnsur.delete({ where: { id } });
  });
}

// Urutan tampil unsur mengikuti daftar id yang dikirim (hasil seret di halaman Nama Unsur).
export async function reorderUnsur(ids, user, req) {
  await withAudit(user, req, 'SURVEY_UNSUR_REORDER', 'SurveyUnsur', async (tx) => {
    const found = await tx.surveyUnsur.count({ where: { id: { in: ids } } });
    if (found !== ids.length) fail(400, 'Sebagian unsur tidak ditemukan. Muat ulang halaman lalu susun kembali.');
    for (const [index, id] of ids.entries()) await tx.surveyUnsur.update({ where: { id }, data: { sort_order: index + 1 } });
    return { ids };
  });
  return listUnsur();
}

// ---------------------------------------------------------------- Bank pertanyaan
const questionInclude = {
  unsur: { select: { id: true, code: true, name: true, sort_order: true } },
  options: { orderBy: { sort_order: 'asc' } },
  _count: { select: { items: true, answers: true } },
  items: { select: { survey: { select: { id: true, name: true } } } },
};

// "Nama survei" di form pertanyaan: tambahkan ke akhir susunan survei itu (seperti Pemilihan Survey sistem lama).
async function attachToSurvey(tx, questionId, unsurId, surveyId) {
  if (!surveyId) return;
  const survey = await tx.survey.findUnique({ where: { id: surveyId }, include: { _count: { select: { responses: true } } } });
  if (!survey) fail(400, 'Survei yang dipilih tidak ditemukan. Muat ulang halaman lalu pilih kembali.');
  if (await tx.surveyItem.findFirst({ where: { survey_id: surveyId, question_id: questionId } })) return;
  if (survey._count.responses) fail(409, 'Susunan survei ini terkunci karena sudah memiliki jawaban. Pilih survei lain atau kosongkan Nama survei.');
  if (!unsurId) fail(400, 'Pilih unsur sebelum menambahkan pertanyaan ke survei.');
  const last = await tx.surveyItem.findFirst({ where: { survey_id: surveyId }, orderBy: { sort_order: 'desc' } });
  await tx.surveyItem.create({ data: { survey_id: surveyId, unsur_id: unsurId, question_id: questionId, sort_order: (last?.sort_order ?? -1) + 1 } });
}

function assertOptions(type, options) {
  if (type === 'PILIHAN' && (!options || options.length < 2)) fail(400, 'Pertanyaan pilihan memerlukan minimal 2 opsi jawaban.');
}

const optionRows = (type, options) =>
  type === 'PILIHAN' ? options.map((o, i) => ({ label: o.label, value: o.value, sort_order: i })) : [];

export async function listQuestions({ search, type, unsur_id } = {}) {
  return prisma.surveyQuestion.findMany({
    where: { ...(type ? { type } : {}), ...(unsur_id ? { unsur_id } : {}), ...(search ? { text: { contains: search } } : {}) },
    // Dikelompokkan per unsur sesuai urutan Pedoman; pertanyaan tanpa unsur (data lama) tampil terakhir.
    orderBy: [{ unsur: { sort_order: 'asc' } }, { created_at: 'asc' }],
    include: questionInclude,
  });
}

async function requireUnsur(tx, unsurId) {
  if (!unsurId) return; // duplikat pertanyaan lama yang belum dikelompokkan
  if (!(await tx.surveyUnsur.findUnique({ where: { id: unsurId } }))) fail(400, 'Unsur yang dipilih tidak ditemukan. Muat ulang halaman lalu pilih kembali.');
}

export async function createQuestion({ text, type, unsur_id, survey_id, options }, user, req) {
  assertOptions(type, options);
  return withAudit(user, req, 'SURVEY_QUESTION_CREATE', 'SurveyQuestion', async (tx) => {
    await requireUnsur(tx, unsur_id);
    const created = await tx.surveyQuestion.create({ data: { text, type, unsur_id, options: { create: optionRows(type, options) } } });
    await attachToSurvey(tx, created.id, unsur_id, survey_id);
    return tx.surveyQuestion.findUnique({ where: { id: created.id }, include: questionInclude });
  });
}

export async function updateQuestion(id, { text, type, unsur_id, survey_id, options }, user, req) {
  assertOptions(type, options);
  return withAudit(user, req, 'SURVEY_QUESTION_UPDATE', 'SurveyQuestion', async (tx) => {
    await requireUnsur(tx, unsur_id);
    const question = await tx.surveyQuestion.findUnique({ where: { id }, include: questionInclude });
    if (!question) fail(404, 'Pertanyaan survei tidak ditemukan.');
    // Jawaban lama harus tetap bermakna sama; ubah lewat duplikat.
    if (question._count.answers) fail(409, 'Pertanyaan ini sudah memiliki jawaban dan tidak dapat diubah. Gunakan Duplikat untuk membuat versi baru.');
    await tx.surveyOption.deleteMany({ where: { question_id: id } });
    await tx.surveyQuestion.update({ where: { id }, data: { text, type, unsur_id, options: { create: optionRows(type, options) } } });
    // Unsur pertanyaan berubah: susunan survei yang memakainya ikut pindah unsur agar laporan tetap benar.
    if (unsur_id && unsur_id !== question.unsur_id) await tx.surveyItem.updateMany({ where: { question_id: id }, data: { unsur_id } });
    await attachToSurvey(tx, id, unsur_id, survey_id);
    return tx.surveyQuestion.findUnique({ where: { id }, include: questionInclude });
  });
}

export async function duplicateQuestion(id, user, req) {
  const question = await prisma.surveyQuestion.findUnique({ where: { id }, include: questionInclude });
  if (!question) fail(404, 'Pertanyaan survei tidak ditemukan.');
  return createQuestion({ text: `${question.text} (salinan)`, type: question.type, unsur_id: question.unsur_id, options: question.options }, user, req);
}

export async function deleteQuestion(id, { force } = {}, user, req) {
  return withAudit(user, req, 'SURVEY_QUESTION_DELETE', 'SurveyQuestion', async (tx) => {
    const question = await tx.surveyQuestion.findUnique({ where: { id }, include: questionInclude });
    if (!question) fail(404, 'Pertanyaan survei tidak ditemukan.');
    // Jawaban responden adalah data laporan; selama belum dijawab, pertanyaan boleh dihapus
    // dan ikut dikeluarkan dari susunan survei yang memakainya.
    // force: jawaban responden atas pertanyaan ini ikut terhapus sehingga laporan survei berubah.
    if (question._count.answers && force !== 'true') fail(409, 'Pertanyaan ini sudah memiliki jawaban responden. Hapus paksa bila jawabannya memang ingin dibuang.');
    await tx.surveyAnswer.deleteMany({ where: { question_id: id } });
    await tx.surveyItem.deleteMany({ where: { question_id: id } });
    return tx.surveyQuestion.delete({ where: { id } });
  });
}

// ---------------------------------------------------------------- Survei
const surveyListInclude = { _count: { select: { items: true, responses: true } } };

const surveyDetailInclude = {
  ...surveyListInclude,
  items: {
    orderBy: { sort_order: 'asc' },
    include: { unsur: true, question: { include: { options: { orderBy: { sort_order: 'asc' } } } } },
  },
};

const present = (survey) => survey && { ...survey, display_status: displayStatus(survey) };

async function requireSurvey(tx, id, include = surveyListInclude) {
  const survey = await tx.survey.findUnique({ where: { id }, include });
  if (!survey) fail(404, 'Survei tidak ditemukan.');
  return survey;
}

export async function listSurveys({ search, status } = {}) {
  const surveys = await prisma.survey.findMany({
    where: { ...(status ? { status } : {}), ...(search ? { name: { contains: search } } : {}) },
    orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    include: surveyListInclude,
  });
  return surveys.map(present);
}

export async function getSurvey(id) {
  return present(await requireSurvey(prisma, id, surveyDetailInclude));
}

export async function createSurvey(data, user, req) {
  return present(await withAudit(user, req, 'SURVEY_CREATE', 'Survey', (tx) =>
    tx.survey.create({ data, include: surveyListInclude })));
}

export async function updateSurvey(id, data, user, req) {
  return present(await withAudit(user, req, 'SURVEY_UPDATE', 'Survey', async (tx) => {
    const survey = await requireSurvey(tx, id);
    const startsAt = data.starts_at !== undefined ? data.starts_at : survey.starts_at;
    const endsAt = data.ends_at !== undefined ? data.ends_at : survey.ends_at;
    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) fail(400, 'Tanggal selesai tidak boleh sebelum tanggal mulai.');
    return tx.survey.update({ where: { id }, data, include: surveyListInclude });
  }));
}

export async function deleteSurvey(id, { force } = {}, user, req) {
  return withAudit(user, req, 'SURVEY_DELETE', 'Survey', async (tx) => {
    const survey = await requireSurvey(tx, id);
    // Jawaban responden adalah data laporan; force menghapusnya sekalian, jadi laporan survei ini hilang.
    if (survey._count.responses && force !== 'true') {
      fail(409, 'Survei ini sudah memiliki jawaban responden. Nonaktifkan survei, atau hapus paksa bila jawabannya memang ingin dibuang.');
    }
    await tx.surveyResponse.deleteMany({ where: { survey_id: id } }); // jawaban ikut terhapus (cascade)
    return tx.survey.delete({ where: { id } });
  });
}

// Urutan tampil survei mengikuti daftar id yang dikirim (hasil seret di halaman Nama Survei).
export async function reorderSurveys(ids, user, req) {
  await withAudit(user, req, 'SURVEY_REORDER', 'Survey', async (tx) => {
    const found = await tx.survey.count({ where: { id: { in: ids } } });
    if (found !== ids.length) fail(400, 'Sebagian survei tidak ditemukan. Muat ulang halaman lalu susun kembali.');
    for (const [index, id] of ids.entries()) await tx.survey.update({ where: { id }, data: { sort_order: index + 1 } });
    return { ids };
  });
  return listSurveys();
}

export async function setSurveyItems(id, items, user, req) {
  await withAudit(user, req, 'SURVEY_ITEMS_SET', 'Survey', async (tx) => {
    const survey = await requireSurvey(tx, id);
    if (survey._count.responses) fail(409, 'Susunan pertanyaan terkunci karena survei sudah memiliki jawaban.');
    const questionIds = items.map((i) => i.question_id);
    if (new Set(questionIds).size !== questionIds.length) fail(400, 'Satu pertanyaan hanya boleh muncul sekali dalam survei.');
    const [unsurRows, questions] = await Promise.all([
      tx.surveyUnsur.findMany({ where: { id: { in: [...new Set(items.map((i) => i.unsur_id))] } }, select: { id: true, survey_id: true } }),
      tx.surveyQuestion.findMany({ where: { id: { in: questionIds } }, select: { id: true, unsur_id: true } }),
    ]);
    if (unsurRows.length !== new Set(items.map((i) => i.unsur_id)).size || questions.length !== questionIds.length) {
      fail(400, 'Sebagian unsur atau pertanyaan tidak ditemukan. Muat ulang halaman lalu susun kembali.');
    }
    // Unsur yang sudah ada di survei ini (mis. hasil Duplikat) tetap boleh dipakai.
    const current = new Set((await tx.surveyItem.findMany({ where: { survey_id: id }, select: { unsur_id: true } })).map((i) => i.unsur_id));
    if (unsurRows.some((u) => u.survey_id && u.survey_id !== id && !current.has(u.id))) fail(400, 'Unsur khusus survei lain tidak dapat dipakai pada survei ini.');
    const unsurOf = new Map(questions.map((q) => [q.id, q.unsur_id]));
    if (items.some((i) => unsurOf.get(i.question_id) && unsurOf.get(i.question_id) !== i.unsur_id)) {
      fail(400, 'Pertanyaan harus ditempatkan pada unsur yang sama dengan unsurnya di bank soal.');
    }
    await tx.surveyItem.deleteMany({ where: { survey_id: id } });
    await tx.surveyItem.createMany({ data: items.map((i, idx) => ({ survey_id: id, unsur_id: i.unsur_id, question_id: i.question_id, sort_order: idx })) });
    return { id, items };
  });
  return getSurvey(id);
}

export async function setSurveyStatus(id, status, user, req) {
  return present(await withAudit(user, req, status === 'AKTIF' ? 'SURVEY_ACTIVATE' : 'SURVEY_DEACTIVATE', 'Survey', async (tx) => {
    await requireSurvey(tx, id);
    return tx.survey.update({ where: { id }, data: { status }, include: surveyListInclude });
  }));
}

export async function duplicateSurvey(id, user, req) {
  const source = await requireSurvey(prisma, id, surveyDetailInclude);
  return present(await withAudit(user, req, 'SURVEY_DUPLICATE', 'Survey', (tx) =>
    tx.survey.create({
      data: {
        name: `${source.name} (salinan)`,
        kind: source.kind,
        description: source.description,
        starts_at: source.starts_at,
        ends_at: source.ends_at,
        status: 'DRAFT',
        items: { create: source.items.map((i) => ({ unsur_id: i.unsur_id, question_id: i.question_id, sort_order: i.sort_order })) },
      },
      include: surveyListInclude,
    })));
}

// ---------------------------------------------------------------- Jawaban & laporan
export async function listResponses(id, { page = 1, limit = 20 } = {}) {
  await requireSurvey(prisma, id);
  const where = { survey_id: id };
  const [total, rows] = await Promise.all([
    prisma.surveyResponse.count({ where }),
    prisma.surveyResponse.findMany({
      where,
      orderBy: { submitted_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        registration: { select: { registration_no: true, publisher: { select: { legal_name: true } } } },
        answers: {
          include: { question: { select: { text: true, type: true } }, option: { select: { label: true } } },
        },
      },
    }),
  ]);
  return { items: rows, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

const countBy = (rows, keyFn) => {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row) ?? 'Tidak diisi';
    map.set(key, (map.get(key) || 0) + 1);
  }
  // Persentase per responden (bukan per baris jawaban) agar totalnya 100%.
  return [...map.entries()].map(([label, count]) => ({ label, count, percent: rows.length ? round2((count / rows.length) * 100) : 0 }));
};

const ageBucket = (age) => (age == null ? null : age < 30 ? '< 30 tahun' : age < 40 ? '30–39 tahun' : age < 50 ? '40–49 tahun' : '≥ 50 tahun');

export async function getSurveyReport(id) {
  const survey = await requireSurvey(prisma, id, surveyDetailInclude);
  const [answers, responses] = await Promise.all([
    prisma.surveyAnswer.findMany({
      where: { response: { survey_id: id } },
      select: { question_id: true, value: true, essay_text: true, response: { select: { respondent_name: true, submitted_at: true } } },
    }),
    prisma.surveyResponse.findMany({ where: { survey_id: id } }),
  ]);

  const unsurByQuestion = new Map(survey.items.map((i) => [i.question_id, i.unsur]));
  const perUnsur = new Map();
  for (const item of survey.items) {
    if (item.question.type === 'PILIHAN' && !perUnsur.has(item.unsur_id)) perUnsur.set(item.unsur_id, { unsur: item.unsur, sum: 0, count: 0 });
  }
  for (const a of answers) {
    const unsur = unsurByQuestion.get(a.question_id);
    const bucket = unsur && perUnsur.get(unsur.id);
    if (bucket && a.value != null) { bucket.sum += a.value; bucket.count += 1; }
  }

  const unsur = [...perUnsur.values()]
    .sort((a, b) => a.unsur.sort_order - b.unsur.sort_order)
    .map(({ unsur: u, sum, count }) => {
      const average = count ? round2(sum / count) : null;
      const converted = average == null ? null : round2(average * 25);
      return { id: u.id, code: u.code, name: u.name, definition: u.definition, answers: count, average, converted, mutu: mutuFor(converted) };
    });
  const scored = unsur.filter((u) => u.average != null);
  const averageAll = scored.length ? scored.reduce((s, u) => s + u.average, 0) / scored.length : null;
  const indexValue = averageAll == null ? null : round2(averageAll * 25);
  const questionText = new Map(survey.items.map((i) => [i.question_id, i.question.text]));

  return {
    survey: present({ ...survey, items: undefined }),
    respondents: responses.length,
    unsur,
    index: indexValue,
    mutu: mutuFor(indexValue),
    demographics: {
      gender: countBy(responses, (r) => (r.gender === 'L' ? 'Laki-laki' : r.gender === 'P' ? 'Perempuan' : null)),
      age: countBy(responses, (r) => ageBucket(r.age)),
      education: countBy(responses, (r) => r.education),
      occupation: countBy(responses, (r) => r.occupation),
      disability: countBy(responses, (r) => (r.is_disabled === true ? 'Ya' : r.is_disabled === false ? 'Tidak' : null)),
      disability_type: countBy(responses.filter((r) => r.is_disabled), (r) => r.disability_type),
      service_type: countBy(responses, (r) => r.service_type),
      service_category: countBy(responses, (r) => r.service_category),
    },
    satisfaction: { average: avgOf(responses, 'overall_satisfaction'), distribution: countBy(responses.filter((r) => r.overall_satisfaction != null), (r) => r.overall_satisfaction) },
    nps: npsOf(responses),
    anti_corruption: AK_FIELDS.map((key) => ({ key, average: avgOf(responses, key), answers: responses.filter((r) => r[key] != null).length })),
    essays: [
      ...answers
        .filter((a) => a.essay_text?.trim())
        .map((a) => ({ question: questionText.get(a.question_id), text: a.essay_text, respondent: a.response.respondent_name, submitted_at: a.response.submitted_at })),
      ...responses
        .filter((r) => r.feedback?.trim())
        .map((r) => ({ question: 'Kritik dan saran', text: r.feedback, respondent: r.respondent_name, submitted_at: r.submitted_at })),
    ],
  };
}

const AK_FIELDS = ['ak_transparency', 'ak_no_extortion', 'ak_no_broker', 'ak_no_gratification'];

function avgOf(rows, key) {
  const values = rows.map((r) => r[key]).filter((v) => v != null);
  return values.length ? round2(values.reduce((s, v) => s + v, 0) / values.length) : null;
}

// Net Promoter Score skala 1–10: % promotor (9–10) dikurangi % detraktor (1–6).
export function npsOf(rows) {
  const scores = rows.map((r) => r.nps_score).filter((v) => v != null);
  if (!scores.length) return { score: null, respondents: 0, promoters: 0, passives: 0, detractors: 0 };
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return { score: round2(((promoters - detractors) / scores.length) * 100), respondents: scores.length, promoters, passives: scores.length - promoters - detractors, detractors };
}
