import assert from 'node:assert/strict';

export async function runDistributorSlaTests({
  test,
  prisma,
  base,
  loginAs,
  publisherToken,
  verifikatorToken,
  adminToken,
  serviceId,
}) {
  const distributor = (await loginAs('distributor@lpmq.kemenag.go.id')).token;
  const distributorUser = await prisma.user.findUnique({ where: { email: 'distributor@lpmq.kemenag.go.id' } });
  const superAdmin = (await loginAs('admin@lpmq.kemenag.go.id')).token;
  const assignee = await prisma.user.findUnique({ where: { email: 'pentashih@lpmq.kemenag.go.id' } });
  const team = await prisma.distributionTeam.findFirst({
    where: { members: { some: { user_id: assignee.id } }, status: 'ACTIVE' },
  });

  const call = async (path, token, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'b23-sla-test',
      },
      ...(method !== 'GET' && body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, json: await response.json() };
  };

  const expect = async (path, token, method = 'GET', body, expectedStatus = 200) => {
    const result = await call(path, token, method, body);
    assert.equal(
      result.status,
      expectedStatus,
      `Expected ${expectedStatus} on ${method} ${path}, got ${result.status}: ${JSON.stringify(result.json)}`
    );
    return result.json.data;
  };

  let reg;

  await test('B23 Setup: Registrasi mushaf baru sampai siap distribusi dengan SLA snapshot', async () => {
    reg = await expect(
      '/registrations',
      publisherToken,
      'POST',
      {
        service_type_id: serviceId,
        title: 'Mushaf B-23 Penentuan SLA Distributor',
        mushaf_details: { penanggung_jawab_produk: 'Penanggung Jawab B-23' },
      },
      201
    );

    // Set status WAITING_DISTRIBUTION dan fee_sla_snapshot
    await prisma.registration.update({
      where: { id: reg.id },
      data: {
        status: 'WAITING_DISTRIBUTION',
        core_team_number: 1,
        core_distributor_id: distributorUser.id,
        stage_entered_at: new Date('2026-11-16T08:00:00.000Z'),
        fee_sla_snapshot: {
          service_name: "Mushaf Al-Qur'an Standar Kemenag",
          sla_initial_days: 15,
          sla_revision_days: 7,
          sla_dummy_days: 3,
        },
      },
    });

    // Tambah payment record verified agar memenuhi prasyarat distribusi
    await prisma.paymentRecord.create({
      data: {
        registration_id: reg.id,
        billing_no: `BILL-B23-${Date.now()}`,
        amount: 5000000,
        status: 'VERIFIED',
        verified_at: new Date('2026-11-16T07:00:00.000Z'),
      },
    });
  });

  await test('B23-T1: GET /registrations/:id/assignment-sla menyajikan batas SLA resmi', async () => {
    const slaData = await expect(`/registrations/${reg.id}/assignment-sla`, distributor);
    assert.equal(slaData.stage, 'INITIAL');
    assert.equal(slaData.sla_days, 15);
    assert.ok(slaData.max_due_at);
    assert.ok(slaData.basis_info);
  });

  await test('B23-T3: Distributor dicegah menetapkan due_at melebihi max_due (422 Unprocessable Entity)', async () => {
    // 2026-12-30 jauh melebihi batas 15 hari kerja dari 16 Nov
    const result = await call(
      `/registrations/${reg.id}/assignments`,
      distributor,
      'POST',
      {
        team_id: team.id,
        assignee_ids: [assignee.id],
        stage: 'INITIAL',
        due_at: '2026-12-30',
      }
    );
    assert.equal(result.status, 422);
    assert.match(result.json.message, /melebihi batas maksimal SLA/i);
  });

  await test('B23-T5: Distributor memilih tanggal akhir pekan ditolak (422)', async () => {
    // 2026-11-21 adalah hari Sabtu
    const result = await call(
      `/registrations/${reg.id}/assignments`,
      distributor,
      'POST',
      {
        team_id: team.id,
        assignee_ids: [assignee.id],
        stage: 'INITIAL',
        due_at: '2026-11-21',
      }
    );
    assert.equal(result.status, 422);
    assert.match(result.json.message, /hari libur atau akhir pekan/i);
  });

  await test('B23-T4: Superadmin dapat menetapkan due_at melebihi batas dengan alasan valid', async () => {
    // Alihkan ke penugasan manual agar dapat diproses oleh peran Superadmin
    await prisma.registration.update({
      where: { id: reg.id },
      data: { core_team_number: null, core_distributor_id: null },
    });
    const overrideReason = 'Naskah kuno nusantara membutuhkan perbandingan ortografi ekstra hati-hati';
    const assignments = await expect(
      `/registrations/${reg.id}/assignments`,
      superAdmin,
      'POST',
      {
        team_id: team.id,
        assignee_ids: [assignee.id],
        stage: 'INITIAL',
        due_at: '2026-12-30',
        due_override_reason: overrideReason,
      },
      201
    );

    assert.equal(assignments.length, 1);
    assert.ok(assignments[0].due_at.startsWith('2026-12-30'));
    assert.equal(assignments[0].due_meta?.override_reason, overrideReason);
  });
}
