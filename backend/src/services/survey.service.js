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
    orderBy: [{ kind: 'asc' }, { code: 'asc' }],
    include: { _count: { select: { items: true } } },
  });
}

export async function createUnsur(data, user, req) {
  return withAudit(user, req, 'SURVEY_UNSUR_CREATE', 'SurveyUnsur', (tx) => tx.surveyUnsur.create({ data }));
}

export async function updateUnsur(id, data, user, req) {
  return withAudit(user, req, 'SURVEY_UNSUR_UPDATE', 'SurveyUnsur', async (tx) => {
    if (!(await tx.surveyUnsur.findUnique({ where: { id } }))) fail(404, 'Unsur survei tidak ditemukan.');
    return tx.surveyUnsur.update({ where: { id }, data });
  });
}

export async function deleteUnsur(id, user, req) {
  return withAudit(user, req, 'SURVEY_UNSUR_DELETE', 'SurveyUnsur', async (tx) => {
    const unsur = await tx.surveyUnsur.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
    if (!unsur) fail(404, 'Unsur survei tidak ditemukan.');
    if (unsur._count.items) fail(409, 'Unsur ini sudah dipakai pada survei. Arsipkan unsur alih-alih menghapusnya.');
    return tx.surveyUnsur.delete({ where: { id } });
  });
}

// ---------------------------------------------------------------- Bank pertanyaan
const questionInclude = {
  options: { orderBy: { sort_order: 'asc' } },
  _count: { select: { items: true, answers: true } },
};

function assertOptions(type, options) {
  if (type === 'PILIHAN' && (!options || options.length < 2)) fail(400, 'Pertanyaan pilihan memerlukan minimal 2 opsi jawaban.');
}

const optionRows = (type, options) =>
  type === 'PILIHAN' ? options.map((o, i) => ({ label: o.label, value: o.value, sort_order: i })) : [];

export async function listQuestions({ search, type } = {}) {
  return prisma.surveyQuestion.findMany({
    where: { ...(type ? { type } : {}), ...(search ? { text: { contains: search } } : {}) },
    orderBy: { created_at: 'desc' },
    include: questionInclude,
  });
}

export async function createQuestion({ text, type, options }, user, req) {
  assertOptions(type, options);
  return withAudit(user, req, 'SURVEY_QUESTION_CREATE', 'SurveyQuestion', (tx) =>
    tx.surveyQuestion.create({ data: { text, type, options: { create: optionRows(type, options) } }, include: questionInclude }));
}

export async function updateQuestion(id, { text, type, options }, user, req) {
  assertOptions(type, options);
  return withAudit(user, req, 'SURVEY_QUESTION_UPDATE', 'SurveyQuestion', async (tx) => {
    const question = await tx.surveyQuestion.findUnique({ where: { id }, include: questionInclude });
    if (!question) fail(404, 'Pertanyaan survei tidak ditemukan.');
    // Jawaban lama harus tetap bermakna sama; ubah lewat duplikat.
    if (question._count.answers) fail(409, 'Pertanyaan ini sudah memiliki jawaban dan tidak dapat diubah. Gunakan Duplikat untuk membuat versi baru.');
    await tx.surveyOption.deleteMany({ where: { question_id: id } });
    return tx.surveyQuestion.update({
      where: { id },
      data: { text, type, options: { create: optionRows(type, options) } },
      include: questionInclude,
    });
  });
}

export async function duplicateQuestion(id, user, req) {
  const question = await prisma.surveyQuestion.findUnique({ where: { id }, include: questionInclude });
  if (!question) fail(404, 'Pertanyaan survei tidak ditemukan.');
  return createQuestion({ text: `${question.text} (salinan)`, type: question.type, options: question.options }, user, req);
}

export async function deleteQuestion(id, user, req) {
  return withAudit(user, req, 'SURVEY_QUESTION_DELETE', 'SurveyQuestion', async (tx) => {
    const question = await tx.surveyQuestion.findUnique({ where: { id }, include: questionInclude });
    if (!question) fail(404, 'Pertanyaan survei tidak ditemukan.');
    if (question._count.items || question._count.answers) fail(409, 'Pertanyaan ini sudah dipakai pada survei sehingga tidak dapat dihapus.');
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
    orderBy: { created_at: 'desc' },
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

export async function deleteSurvey(id, user, req) {
  return withAudit(user, req, 'SURVEY_DELETE', 'Survey', async (tx) => {
    const survey = await requireSurvey(tx, id);
    // Jawaban responden adalah data laporan; survei yang sudah dijawab cukup dinonaktifkan (Expired).
    if (survey._count.responses) fail(409, 'Survei ini sudah memiliki jawaban responden sehingga tidak dapat dihapus. Nonaktifkan survei bila tidak dipakai lagi.');
    return tx.survey.delete({ where: { id } });
  });
}

export async function setSurveyItems(id, items, user, req) {
  await withAudit(user, req, 'SURVEY_ITEMS_SET', 'Survey', async (tx) => {
    const survey = await requireSurvey(tx, id);
    if (survey._count.responses) fail(409, 'Susunan pertanyaan terkunci karena survei sudah memiliki jawaban.');
    const questionIds = items.map((i) => i.question_id);
    if (new Set(questionIds).size !== questionIds.length) fail(400, 'Satu pertanyaan hanya boleh muncul sekali dalam survei.');
    const [unsurCount, questionCount] = await Promise.all([
      tx.surveyUnsur.count({ where: { id: { in: [...new Set(items.map((i) => i.unsur_id))] } } }),
      tx.surveyQuestion.count({ where: { id: { in: questionIds } } }),
    ]);
    if (unsurCount !== new Set(items.map((i) => i.unsur_id)).size || questionCount !== questionIds.length) {
      fail(400, 'Sebagian unsur atau pertanyaan tidak ditemukan. Muat ulang halaman lalu susun kembali.');
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
    prisma.surveyResponse.findMany({ where: { survey_id: id }, select: { gender: true, age: true, education: true, occupation: true } }),
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

  const unsur = [...perUnsur.values()].map(({ unsur: u, sum, count }) => {
    const average = count ? round2(sum / count) : null;
    return { id: u.id, code: u.code, name: u.name, answers: count, average, converted: average == null ? null : round2(average * 25) };
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
    },
    essays: answers
      .filter((a) => a.essay_text?.trim())
      .map((a) => ({ question: questionText.get(a.question_id), text: a.essay_text, respondent: a.response.respondent_name, submitted_at: a.response.submitted_at })),
  };
}
