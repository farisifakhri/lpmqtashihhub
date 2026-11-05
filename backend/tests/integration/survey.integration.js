import assert from 'node:assert/strict';

export async function runSurveyTests({ test, prisma, base, loginAs, adminToken, publisherToken }) {
  const call = async (path, token, method = 'GET', body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const ok = async (path, token, method, body, status = 200) => {
    const res = await call(path, token, method, body);
    assert.equal(res.status, status, `${method} ${path}: ${JSON.stringify(res.json)}`);
    return res.json.data;
  };

  console.log('\n--- Survei Layanan (Super Admin) ---');
  const helperAdminToken = (await loginAs('admin.internal@lpmq.kemenag.go.id')).token;
  let unsurA, unsurB, qPositive, qNegative, qEssay, survey;

  await test('Survei: hanya Super Admin yang boleh mengelola (401/403)', async () => {
    assert.equal((await call('/admin/surveys', null)).status, 401);
    assert.equal((await call('/admin/surveys', publisherToken)).status, 403);
    assert.equal((await call('/admin/surveys', helperAdminToken)).status, 403);
  });

  await test('Survei: Super Admin menyiapkan unsur dan bank pertanyaan', async () => {
    unsurA = await ok('/admin/survey-unsur', adminToken, 'POST', { code: 'T-A', name: 'Persyaratan Pelayanan', kind: 'IKM' }, 201);
    unsurB = await ok('/admin/survey-unsur', adminToken, 'POST', { code: 'T-B', name: 'Prosedur Pelayanan', kind: 'IKM' }, 201);
    assert.equal((await call('/admin/survey-unsur', adminToken, 'POST', { code: 'T-A', name: 'Duplikat kode', kind: 'IKM' })).status, 409);

    const tooFewOptions = await call('/admin/survey-questions', adminToken, 'POST', { text: 'Pertanyaan tanpa opsi cukup', type: 'PILIHAN', options: [{ label: 'Baik', value: 4 }] });
    assert.equal(tooFewOptions.status, 400);

    qPositive = await ok('/admin/survey-questions', adminToken, 'POST', {
      text: 'Bagaimana kesesuaian persyaratan pelayanan?', type: 'PILIHAN',
      options: [{ label: 'Sangat sesuai', value: 4 }, { label: 'Sesuai', value: 3 }, { label: 'Kurang sesuai', value: 2 }, { label: 'Tidak sesuai', value: 1 }],
    }, 201);
    qNegative = await ok('/admin/survey-questions', adminToken, 'POST', {
      text: 'Apakah Anda pernah dipungut biaya tambahan?', type: 'PILIHAN',
      options: [{ label: 'Tidak pernah', value: 4 }, { label: 'Jarang', value: 3 }, { label: 'Sering', value: 2 }, { label: 'Selalu', value: 1 }],
    }, 201);
    qEssay = await ok('/admin/survey-questions', adminToken, 'POST', { text: 'Saran dan kritik untuk pelayanan', type: 'ESAI' }, 201);
    assert.equal(qPositive.options.length, 4);
    assert.equal(qEssay.options.length, 0);
  });

  await test('Survei: tidak bisa diaktifkan sebelum ada pertanyaan, lalu disusun dan diaktifkan', async () => {
    const invalidDates = await call('/admin/surveys', adminToken, 'POST', { name: 'Survei tanggal terbalik', kind: 'IKM', starts_at: '2027-12-31', ends_at: '2027-01-01' });
    assert.equal(invalidDates.status, 400);

    // Seperti sistem lama: cukup nama (topik) + status. Survei baru belum bisa langsung Aktif.
    assert.equal((await call('/admin/surveys', adminToken, 'POST', { name: 'Survei langsung aktif', status: 'AKTIF' })).status, 409);
    survey = await ok('/admin/surveys', adminToken, 'POST', { name: 'Survei IKM Uji', status: 'DRAFT' }, 201);
    assert.equal(survey.status, 'DRAFT');
    assert.equal(survey.starts_at, null);
    assert.equal((await call(`/admin/surveys/${survey.id}/activate`, adminToken, 'POST')).status, 409);
    assert.equal((await call(`/admin/surveys/${survey.id}`, adminToken, 'PUT', { status: 'AKTIF' })).status, 409);

    const detail = await ok(`/admin/surveys/${survey.id}/items`, adminToken, 'PUT', { items: [
      { unsur_id: unsurA.id, question_id: qPositive.id },
      { unsur_id: unsurB.id, question_id: qNegative.id },
      { unsur_id: unsurB.id, question_id: qEssay.id },
    ] });
    assert.deepEqual(detail.items.map((i) => i.question_id), [qPositive.id, qNegative.id, qEssay.id]);

    // Status juga bisa diubah lewat form Edit setelah pertanyaan tersusun.
    const active = await ok(`/admin/surveys/${survey.id}`, adminToken, 'PUT', { name: 'Survei IKM Uji', status: 'AKTIF' });
    assert.equal(active.display_status, 'AKTIF');
  });

  await test('Survei: setelah ada jawaban, susunan dan pertanyaan terkunci; laporan menghitung indeks', async () => {
    const answer = (question, optionLabel) => {
      const option = question.options.find((o) => o.label === optionLabel);
      return { question_id: question.id, option_id: option.id, value: option.value };
    };
    await prisma.surveyResponse.create({ data: { survey_id: survey.id, respondent_name: 'PT Uji Satu', gender: 'L', age: 35, education: 'S1', occupation: 'SWASTA',
      answers: { create: [answer(qPositive, 'Sangat sesuai'), answer(qNegative, 'Tidak pernah'), { question_id: qEssay.id, essay_text: 'Pertahankan.' }] } } });
    await prisma.surveyResponse.create({ data: { survey_id: survey.id, respondent_name: 'PT Uji Dua', gender: 'P', age: 45, education: 'S2', occupation: 'SWASTA',
      answers: { create: [answer(qPositive, 'Sesuai'), answer(qNegative, 'Jarang')] } } });

    assert.equal((await call(`/admin/surveys/${survey.id}/items`, adminToken, 'PUT', { items: [] })).status, 409);
    assert.equal((await call(`/admin/survey-questions/${qPositive.id}`, adminToken, 'PUT', { text: 'Diubah setelah ada jawaban', type: 'ESAI' })).status, 409);
    assert.equal((await call(`/admin/survey-unsur/${unsurA.id}`, adminToken, 'DELETE')).status, 409);
    assert.equal((await call(`/admin/surveys/${survey.id}`, adminToken, 'DELETE')).status, 409);

    const report = await ok(`/admin/surveys/${survey.id}/report`, adminToken, 'GET');
    assert.equal(report.respondents, 2);
    // Unsur A: (4+3)/2 = 3.5; Unsur B: (4+3)/2 = 3.5 → indeks 3.5 × 25 = 87.5 → mutu B.
    assert.deepEqual(report.unsur.map((u) => u.average), [3.5, 3.5]);
    assert.equal(report.index, 87.5);
    assert.equal(report.mutu.grade, 'B');
    assert.equal(report.demographics.gender.reduce((s, g) => s + g.percent, 0), 100);
    assert.equal(report.essays.length, 1);

    const responses = await ok(`/admin/surveys/${survey.id}/responses`, adminToken, 'GET');
    assert.equal(responses.pagination.total, 2);
  });

  await test('Survei: duplikat menyalin susunan ke survei Draf baru yang bisa diubah', async () => {
    const copy = await ok(`/admin/surveys/${survey.id}/duplicate`, adminToken, 'POST', undefined, 201);
    assert.equal(copy.status, 'DRAFT');
    assert.equal(copy._count.items, 3);
    await ok(`/admin/surveys/${copy.id}/items`, adminToken, 'PUT', { items: [{ unsur_id: unsurA.id, question_id: qPositive.id }] });
    // Survei Aktif tanpa jawaban tetap boleh dihapus; yang menahan hapus hanyalah jawaban responden.
    await ok(`/admin/surveys/${copy.id}/activate`, adminToken, 'POST');
    await ok(`/admin/surveys/${copy.id}`, adminToken, 'DELETE');
  });
}
