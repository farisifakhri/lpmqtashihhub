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

  await test('Survei: 9 unsur baku Pedoman PANRB 9/2024 langsung tersedia beserta definisinya', async () => {
    const list = await ok('/admin/survey-unsur', adminToken, 'GET');
    const standard = list.filter((u) => u.is_standard);
    assert.deepEqual(standard.map((u) => `${u.code} ${u.name}`), [
      'A Persyaratan', 'B Sistem, Mekanisme, dan Prosedur', 'C Waktu Penyelesaian', 'D Biaya/Tarif',
      'E Produk, Spesifikasi, dan Jenis Pelayanan', 'F Kompetensi Pelaksana', 'G Perilaku Pelaksana',
      'H Penanganan Pengaduan', 'I Sarana dan Prasarana',
    ]);
    assert.match(standard[0].definition, /^Syarat yang harus dipenuhi/);
    assert.ok(standard.every((u) => u.definition));

    // Definisi unsur baku boleh disesuaikan dan unsurnya boleh diarsipkan.
    const persyaratan = standard[0];
    const edited = await ok(`/admin/survey-unsur/${persyaratan.id}`, adminToken, 'PUT', { definition: 'Definisi khusus pentashihan.' });
    assert.equal(edited.definition, 'Definisi khusus pentashihan.');
    assert.equal(edited.is_standard, true);
    await ok(`/admin/survey-unsur/${persyaratan.id}`, adminToken, 'PUT', { definition: persyaratan.definition, is_archived: true });
    assert.ok(!(await ok('/admin/survey-unsur', adminToken, 'GET')).some((u) => u.id === persyaratan.id));
    await ok(`/admin/survey-unsur/${persyaratan.id}`, adminToken, 'PUT', { is_archived: false });

    // Form unsur tidak lagi meminta kode/jenis: dua unsur tanpa kode boleh berdampingan, jenis default IKM.
    const tanpaKode1 = await ok('/admin/survey-unsur', adminToken, 'POST', { name: 'Unsur tanpa kode satu', definition: 'Definisi satu.' }, 201);
    const tanpaKode2 = await ok('/admin/survey-unsur', adminToken, 'POST', { name: 'Unsur tanpa kode dua' }, 201);
    assert.equal(tanpaKode1.code, null);
    assert.equal(tanpaKode1.kind, 'IKM');
    const ordered = (await ok('/admin/survey-unsur', adminToken, 'GET')).map((u) => u.id);
    assert.ok(ordered.indexOf(standard[8].id) < ordered.indexOf(tanpaKode1.id), 'unsur baku tampil lebih dulu');
    await ok(`/admin/survey-unsur/${tanpaKode1.id}`, adminToken, 'DELETE');
    await ok(`/admin/survey-unsur/${tanpaKode2.id}`, adminToken, 'DELETE');

    // Unsur yang tidak dipakai survei mana pun boleh dihapus, termasuk unsur baku.
    await ok(`/admin/survey-unsur/${standard[8].id}`, adminToken, 'DELETE');
    assert.ok(!(await ok('/admin/survey-unsur?include_archived=true', adminToken, 'GET')).some((u) => u.id === standard[8].id));

    // Kasus nyata: "Persyaratan" dihapus lalu dibuat ulang tanpa kode sehingga jatuh ke urutan terakhir.
    await ok(`/admin/survey-unsur/${standard[0].id}`, adminToken, 'DELETE');
    const recreated = await ok('/admin/survey-unsur', adminToken, 'POST', { name: 'Persyaratan', definition: 'Definisi buatan admin.' }, 201);
    const restored = await ok('/admin/survey-unsur/restore-standard', adminToken, 'POST');
    const restoredStandard = restored.filter((u) => u.is_standard);
    assert.deepEqual(restoredStandard.map((u) => u.name).slice(0, 9), [
      'Persyaratan', 'Sistem, Mekanisme, dan Prosedur', 'Waktu Penyelesaian', 'Biaya/Tarif',
      'Produk, Spesifikasi, dan Jenis Pelayanan', 'Kompetensi Pelaksana', 'Perilaku Pelaksana',
      'Penanganan Pengaduan', 'Sarana dan Prasarana',
    ]);
    assert.deepEqual(restoredStandard.map((u) => u.sort_order), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // Unsur buatan ulang dijadikan baku (tanpa duplikat) dan definisi admin dipertahankan.
    assert.equal(restoredStandard[0].id, recreated.id);
    assert.equal(restoredStandard[0].definition, 'Definisi buatan admin.');
    assert.equal(restored.filter((u) => u.name === 'Persyaratan').length, 1);
    // Unsur buatan sendiri tampil setelah 9 unsur baku.
    const custom = await ok('/admin/survey-unsur', adminToken, 'POST', { name: 'Unsur tambahan' }, 201);
    assert.equal((await ok('/admin/survey-unsur', adminToken, 'GET')).at(-1).id, custom.id);
    await ok(`/admin/survey-unsur/${custom.id}`, adminToken, 'DELETE');

    // Regresi: mengarsipkan unsur IPAK tidak boleh mengubah jenisnya menjadi IKM.
    const ipak = await ok('/admin/survey-unsur', adminToken, 'POST', { code: 'T-IPAK', name: 'Pungutan liar', kind: 'IPAK' }, 201);
    assert.equal((await ok(`/admin/survey-unsur/${ipak.id}`, adminToken, 'PUT', { is_archived: true })).kind, 'IPAK');
    await ok(`/admin/survey-unsur/${ipak.id}`, adminToken, 'DELETE');
  });

  await test('Survei: Super Admin menyiapkan unsur dan bank pertanyaan', async () => {
    unsurA = await ok('/admin/survey-unsur', adminToken, 'POST', { code: 'T-A', name: 'Persyaratan Pelayanan', kind: 'IKM' }, 201);
    unsurB = await ok('/admin/survey-unsur', adminToken, 'POST', { code: 'T-B', name: 'Prosedur Pelayanan', kind: 'IKM' }, 201);
    assert.equal((await call('/admin/survey-unsur', adminToken, 'POST', { code: 'T-A', name: 'Duplikat kode', kind: 'IKM' })).status, 409);

    const tooFewOptions = await call('/admin/survey-questions', adminToken, 'POST', { text: 'Pertanyaan tanpa opsi cukup', type: 'PILIHAN', unsur_id: unsurA.id, options: [{ label: 'Baik', value: 4 }] });
    assert.equal(tooFewOptions.status, 400);

    qPositive = await ok('/admin/survey-questions', adminToken, 'POST', {
      text: 'Bagaimana kesesuaian persyaratan pelayanan?', type: 'PILIHAN', unsur_id: unsurA.id,
      options: [{ label: 'Sangat sesuai', value: 4 }, { label: 'Sesuai', value: 3 }, { label: 'Kurang sesuai', value: 2 }, { label: 'Tidak sesuai', value: 1 }],
    }, 201);
    qNegative = await ok('/admin/survey-questions', adminToken, 'POST', {
      text: 'Apakah Anda pernah dipungut biaya tambahan?', type: 'PILIHAN', unsur_id: unsurB.id,
      options: [{ label: 'Tidak pernah', value: 4 }, { label: 'Jarang', value: 3 }, { label: 'Sering', value: 2 }, { label: 'Selalu', value: 1 }],
    }, 201);
    qEssay = await ok('/admin/survey-questions', adminToken, 'POST', { text: 'Saran dan kritik untuk pelayanan', type: 'ESAI', unsur_id: unsurB.id }, 201);
    assert.equal(qPositive.options.length, 4);
    assert.equal(qEssay.options.length, 0);

    // Bank soal dikelompokkan per unsur: unsur wajib, bisa difilter per unsur, ikut saat diduplikat.
    assert.equal((await call('/admin/survey-questions', adminToken, 'POST', { text: 'Pertanyaan tanpa unsur', type: 'ESAI' })).status, 400);
    assert.equal(qPositive.unsur.name, 'Persyaratan Pelayanan');
    const perUnsurB = await ok(`/admin/survey-questions?unsur_id=${unsurB.id}`, adminToken, 'GET');
    assert.deepEqual(perUnsurB.map((q) => q.id).sort(), [qNegative.id, qEssay.id].sort());
    const copy = await ok(`/admin/survey-questions/${qPositive.id}/duplicate`, adminToken, 'POST', undefined, 201);
    assert.equal(copy.unsur_id, unsurA.id);
    await ok(`/admin/survey-questions/${copy.id}`, adminToken, 'DELETE');
  });

  await test('Survei: status bebas diatur (seperti sistem lama), lalu pertanyaan disusun', async () => {
    const invalidDates = await call('/admin/surveys', adminToken, 'POST', { name: 'Survei tanggal terbalik', kind: 'IKM', starts_at: '2027-12-31', ends_at: '2027-01-01' });
    assert.equal(invalidDates.status, 400);

    // Cukup nama (topik) + status; Aktif boleh dipilih walau pertanyaan belum disusun.
    const direct = await ok('/admin/surveys', adminToken, 'POST', { name: 'Survei langsung aktif', status: 'AKTIF' }, 201);
    assert.equal(direct.display_status, 'AKTIF');
    await ok(`/admin/surveys/${direct.id}`, adminToken, 'DELETE');

    survey = await ok('/admin/surveys', adminToken, 'POST', { name: 'Survei IKM Uji', status: 'DRAFT' }, 201);
    assert.equal(survey.status, 'DRAFT');
    assert.equal(survey.starts_at, null);
    assert.equal((await ok(`/admin/surveys/${survey.id}/activate`, adminToken, 'POST')).status, 'AKTIF');
    assert.equal((await ok(`/admin/surveys/${survey.id}`, adminToken, 'PUT', { status: 'NONAKTIF' })).status, 'NONAKTIF');

    // Pertanyaan milik unsur B tidak boleh ditempatkan di unsur A.
    assert.equal((await call(`/admin/surveys/${survey.id}/items`, adminToken, 'PUT', { items: [{ unsur_id: unsurA.id, question_id: qNegative.id }] })).status, 400);

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
      is_disabled: false, service_category: 'HYBRID', overall_satisfaction: 5, nps_score: 10, ak_transparency: 5, ak_no_extortion: 5, feedback: 'Layanan cepat.',
      answers: { create: [answer(qPositive, 'Sangat sesuai'), answer(qNegative, 'Tidak pernah'), { question_id: qEssay.id, essay_text: 'Pertahankan.' }] } } });
    await prisma.surveyResponse.create({ data: { survey_id: survey.id, respondent_name: 'PT Uji Dua', gender: 'P', age: 45, education: 'S2', occupation: 'SWASTA',
      is_disabled: true, disability_type: 'FISIK', service_category: 'DARING', overall_satisfaction: 4, nps_score: 6, ak_transparency: 4,
      answers: { create: [answer(qPositive, 'Sesuai'), answer(qNegative, 'Jarang')] } } });

    assert.equal((await call(`/admin/surveys/${survey.id}/items`, adminToken, 'PUT', { items: [] })).status, 409);
    assert.equal((await call(`/admin/survey-questions/${qPositive.id}`, adminToken, 'PUT', { text: 'Diubah setelah ada jawaban', type: 'ESAI', unsur_id: unsurA.id })).status, 409);
    assert.equal((await call(`/admin/survey-unsur/${unsurA.id}`, adminToken, 'DELETE')).status, 409);
    assert.equal((await call(`/admin/surveys/${survey.id}`, adminToken, 'DELETE')).status, 409);

    const report = await ok(`/admin/surveys/${survey.id}/report`, adminToken, 'GET');
    assert.equal(report.respondents, 2);
    // Unsur A: (4+3)/2 = 3.5; Unsur B: (4+3)/2 = 3.5 → indeks 3.5 × 25 = 87.5 → mutu B.
    assert.deepEqual(report.unsur.map((u) => u.average), [3.5, 3.5]);
    assert.equal(report.index, 87.5);
    assert.equal(report.mutu.grade, 'B');
    assert.equal(report.demographics.gender.reduce((s, g) => s + g.percent, 0), 100);
    // Esai pertanyaan + kritik & saran responden.
    assert.equal(report.essays.length, 2);
    assert.equal(report.satisfaction.average, 4.5);
    // NPS: 1 promotor (10), 1 detraktor (6) dari 2 responden → 0.
    assert.deepEqual(report.nps, { score: 0, respondents: 2, promoters: 1, passives: 0, detractors: 1 });
    assert.deepEqual(report.anti_corruption.map((a) => [a.key, a.average]), [['ak_transparency', 4.5], ['ak_no_extortion', 5], ['ak_no_broker', null], ['ak_no_gratification', null]]);
    assert.deepEqual(report.demographics.disability.map((d) => [d.label, d.percent]).sort(), [['Tidak', 50], ['Ya', 50]]);
    assert.deepEqual(report.demographics.disability_type.map((d) => d.label), ['FISIK']);
    assert.equal(report.unsur[0].mutu.grade, 'B');

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

  await test('Survei: pertanyaan baku Pedoman PANRB diisi ke unsurnya dan aman diulang', async () => {
    const standardUnsur = await ok('/admin/survey-unsur/restore-standard', adminToken, 'POST');
    const sarana = standardUnsur.find((u) => u.code === 'I');

    const first = await ok('/admin/survey-questions/seed-standard', adminToken, 'POST');
    assert.deepEqual(first, { created: 12, existing: 0, missing_unsur: [] });
    const saranaQuestions = await ok(`/admin/survey-questions?unsur_id=${sarana.id}`, adminToken, 'GET');
    assert.equal(saranaQuestions.length, 2); // varian Campuran: aplikasi + sarana fisik
    assert.deepEqual(saranaQuestions[0].options.map((o) => [o.label, o.value]), [['Sangat baik', 4], ['Baik', 3], ['Kurang baik', 2], ['Tidak baik', 1]]);

    // Ditekan lagi: tidak menggandakan.
    assert.deepEqual(await ok('/admin/survey-questions/seed-standard', adminToken, 'POST'), { created: 0, existing: 12, missing_unsur: [] });

    // Unsur baku yang hilang dilaporkan; pertanyaan unsur lain tetap dibuat ulang.
    for (const q of saranaQuestions) await ok(`/admin/survey-questions/${q.id}`, adminToken, 'DELETE');
    await ok(`/admin/survey-unsur/${sarana.id}`, adminToken, 'DELETE');
    assert.deepEqual(await ok('/admin/survey-questions/seed-standard', adminToken, 'POST'), { created: 0, existing: 10, missing_unsur: ['Sarana dan Prasarana'] });
    await ok('/admin/survey-unsur/restore-standard', adminToken, 'POST');
  });

  await test('Survei: "Nama survei" di form pertanyaan langsung menyusun pertanyaan ke survei itu', async () => {
    const target = await ok('/admin/surveys', adminToken, 'POST', { name: 'Survei dari bank soal' }, 201);
    const body = { text: 'Bagaimana kejelasan informasi tarif?', type: 'ESAI', unsur_id: unsurA.id, survey_id: target.id };
    const q = await ok('/admin/survey-questions', adminToken, 'POST', body, 201);
    assert.deepEqual(q.items.map((i) => i.survey.name), ['Survei dari bank soal']);

    // Disimpan ulang dengan survei yang sama: tidak digandakan. Pindah unsur: susunan survei ikut pindah.
    await ok(`/admin/survey-questions/${q.id}`, adminToken, 'PUT', { ...body, unsur_id: unsurB.id });
    const detail = await ok(`/admin/surveys/${target.id}`, adminToken, 'GET');
    assert.deepEqual(detail.items.map((i) => [i.question_id, i.unsur_id]), [[q.id, unsurB.id]]);

    // Survei yang sudah dijawab terkunci.
    const locked = await call('/admin/survey-questions', adminToken, 'POST', { ...body, text: 'Pertanyaan ke survei terkunci', survey_id: survey.id });
    assert.equal(locked.status, 409);

    // Pertanyaan yang dipakai survei tanpa jawaban boleh dihapus dan ikut keluar dari susunannya.
    await ok(`/admin/survey-questions/${q.id}`, adminToken, 'DELETE');
    assert.deepEqual((await ok(`/admin/surveys/${target.id}`, adminToken, 'GET')).items, []);
    // Pertanyaan yang sudah dijawab responden tetap tidak dapat dihapus.
    assert.equal((await call(`/admin/survey-questions/${qPositive.id}`, adminToken, 'DELETE')).status, 409);
    await ok(`/admin/surveys/${target.id}`, adminToken, 'DELETE');
  });
}
