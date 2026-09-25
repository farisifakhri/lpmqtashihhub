import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

export async function runVerificationPerformanceRbacTests({
  test,
  prisma,
  base,
  loginAs,
  adminToken,
  publisherToken,
  publisherBToken,
  serviceId,
}) {
  console.log('\n--- PR-VER-07: SLA, Laporan Kinerja, Timeline Lintas Peran, dan Hardening RBAC ---');

  const call = async (path, token, method = 'GET', body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      ...(method !== 'GET' && body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
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

  // 1. Setup Admin Internal Murni (Role HELPER_ADMIN saja, bukan SUPERADMIN)
  let internalAdminToken = null;
  const internalAdminEmail = `admin.internal.${Date.now()}@lpmq.kemenag.go.id`;

  // Pastikan role HELPER_ADMIN ada di database
  let adminRole = await prisma.role.findUnique({ where: { code: 'HELPER_ADMIN' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        code: 'HELPER_ADMIN',
        name: 'Administrator Internal LPMQ',
      },
    });
  }

  const hashedPassword = await bcrypt.hash('password123', 10);
  const internalAdminUser = await prisma.user.create({
    data: {
      name: 'Budi Santoso (Admin Internal)',
      email: internalAdminEmail,
      password_hash: hashedPassword,
      status: 'ACTIVE',
      roles: {
        create: [
          { role_id: adminRole.id },
        ],
      },
    },
  });

  const loginRes = await loginAs(internalAdminEmail, 'password123');
  internalAdminToken = loginRes.token;
  assert.ok(internalAdminToken, 'Token admin internal harus didapatkan');

  // Registrasi naskah uji untuk pengujian kepemilikan dan timeline
  let testReg = null;

  // -------------------------------------------------------------
  // TEST SUITE: SLA & LAPORAN KINERJA VERIFIKASI (VER-I06)
  // -------------------------------------------------------------
  await test('Laporan Kinerja: SUPERADMIN dapat mengakses laporan kinerja verifikasi & metrik SLA', async () => {
    const data = await expect('/reports/verification-performance', adminToken, 'GET', undefined, 200);

    assert.ok(data.sla_config, 'SLA config harus tersedia');
    assert.equal(data.sla_config.INTAKE_PHYSICAL_MINUTES, 30);
    assert.equal(data.sla_config.VERIFICATION_REVIEW_DAYS, 2);
    assert.equal(data.sla_config.PAYMENT_BILLING_DAYS, 7);

    assert.ok(data.summary, 'Summary kinerja harus tersedia');
    assert.equal(typeof data.summary.compliance_rate_percent, 'number');
    assert.equal(typeof data.summary.avg_duration_hours, 'number');
    assert.equal(typeof data.summary.total_overdue, 'number');

    assert.ok(data.payments, 'Rekapitulasi PNBP harus tersedia');
    assert.equal(typeof data.payments.total_billed_amount, 'number');
    assert.equal(typeof data.payments.total_verified_amount, 'number');

    assert.ok(data.handovers, 'Metrik serah-terima fisik harus tersedia');
    assert.equal(typeof data.handovers.total_handovers, 'number');
  });

  await test('Laporan Kinerja: HELPER_ADMIN internal dapat mengakses laporan kinerja verifikasi', async () => {
    const data = await expect('/reports/verification-performance', internalAdminToken, 'GET', undefined, 200);
    assert.ok(data.summary);
    assert.ok(data.status_distribution);
  });

  await test('Negative: ADMIN_PENERBIT dilarang mengakses laporan kinerja internal verifikasi (403)', async () => {
    const res = await call('/reports/verification-performance', publisherToken, 'GET');
    assert.equal(res.status, 403);
  });

  // -------------------------------------------------------------
  // TEST SUITE: RBAC HARDENING (SUPERADMIN vs HELPER_ADMIN INTERNAL)
  // -------------------------------------------------------------
  await test('RBAC Hardening: Buat naskah baru oleh Penerbit A untuk pengujian batas wewenang', async () => {
    const regPayload = {
      service_type_id: serviceId,
      title: 'Mushaf Al-Qur\'an Uji RBAC Hardening PR-VER-07',
      mushaf_details: { penanggung_jawab_produk: 'Penanggung Jawab Uji' },
      estimated_juz: 30,
      notes: 'Pengujian batas akses Super Admin vs Admin Internal',
    };
    testReg = await expect('/registrations', publisherToken, 'POST', regPayload, 201);
    assert.ok(testReg.id);
  });

  await test('RBAC Hardening: HELPER_ADMIN internal DITOLAK saat membatalkan naskah penerbit via portal publisher (403)', async () => {
    // Admin internal tidak punya publisherId dan bukan ADMIN_PENERBIT / SUPERADMIN
    const res = await call(`/registrations/${testReg.id}/status`, internalAdminToken, 'PATCH', {
      to_status: 'CANCELLED',
      notes: 'Admin internal mencoba membatalkan naskah penerbit secara ilegal',
    });
    assert.equal(res.status, 403, 'Admin internal tidak boleh memanipulasi pengajuan milik publisher');
  });

  await test('RBAC Hardening: SUPERADMIN DAPAT membatalkan atau mengelola naskah penerbit (Bypass requireOwner)', async () => {
    // Superadmin memiliki bypass resmi pada requireOwner
    const data = await expect(`/registrations/${testReg.id}/status`, adminToken, 'PATCH', {
      to_status: 'CANCELLED',
      notes: 'Pembatalan darurat oleh Super Admin Sistem LPMQ',
    }, 200);
    assert.equal(data.status, 'CANCELLED');
  });

  // -------------------------------------------------------------
  // TEST SUITE: TIMELINE LINTAS PERAN & SANITASI (VER-I05)
  // -------------------------------------------------------------
  // Buat naskah kedua untuk menguji catatan internal dan revisi
  let timelineReg = null;
  await test('Timeline: Buat naskah baru dan tambahkan riwayat status untuk pengujian timeline', async () => {
    timelineReg = await expect('/registrations', publisherToken, 'POST', {
      service_type_id: serviceId,
      title: 'Mushaf Pengujian Timeline Lintas Peran Sanitasi',
      mushaf_details: { penanggung_jawab_produk: 'Penanggung Jawab Uji' },
      estimated_juz: 30,
    }, 201);

    // Kirim pengajuan ke DRAFT -> SUBMITTED -> WAITING_INTAKE
    await expect(`/registrations/${timelineReg.id}/submit`, publisherToken, 'POST', undefined, 200);

    // Tambahkan status history dengan catatan internal teknis yang rahasia
    await prisma.statusHistory.create({
      data: {
        registration_id: timelineReg.id,
        from_status: 'SUBMITTED',
        to_status: 'WAITING_INTAKE',
        notes: 'RAHASIA INTERNAL: Nota Dinas No. ND-102/LPMQ/2026 telah diverifikasi oleh tim telaah rasm.',
        actor_id: internalAdminUser.id,
      },
    });
  });

  await test('Timeline: Internal (HELPER_ADMIN / SUPERADMIN) melihat detail lengkap tanpa sanitasi', async () => {
    const data = await expect(`/registrations/${timelineReg.id}/timeline`, adminToken, 'GET', undefined, 200);
    assert.equal(data.is_sanitized, false, 'Timeline untuk internal tidak disanitasi');
    assert.ok(Array.isArray(data.timeline));
    assert.ok(data.timeline.length >= 2);

    // Temukan entri dengan catatan nota dinas
    const entry = data.timeline.find((t) => t.to_status === 'WAITING_INTAKE');
    assert.ok(entry, 'Entri WAITING_INTAKE harus ditemukan');
    assert.ok(entry.notes.includes('RAHASIA INTERNAL: Nota Dinas No. ND-102'), 'Internal harus melihat memo asli');
    assert.ok(entry.actor, 'Internal dapat melihat detail data aktor');
    assert.equal(entry.actor.email, internalAdminEmail);
  });

  await test('Timeline: Penerbit pemilik naskah melihat riwayat yang disanitasi otomatis', async () => {
    const data = await expect(`/registrations/${timelineReg.id}/timeline`, publisherToken, 'GET', undefined, 200);
    assert.equal(data.is_sanitized, true, 'Timeline untuk penerbit wajib disanitasi');
    assert.ok(Array.isArray(data.timeline));

    // Temukan entri WAITING_INTAKE
    const entry = data.timeline.find((t) => t.to_status === 'WAITING_INTAKE');
    assert.ok(entry, 'Entri WAITING_INTAKE harus ditemukan');
    // Catatan rahasia tidak boleh bocor
    assert.ok(!entry.notes.includes('RAHASIA INTERNAL'), 'Memo rahasia tidak boleh bocor ke penerbit');
    assert.ok(entry.notes.includes('selesai diproses'), 'Catatan harus disanitasi menjadi deskripsi aman');
    // Identitas aktor internal disamarkan
    assert.equal(entry.actor_display, 'Petugas LPMQ', 'Aktor internal harus disamarkan menjadi Petugas LPMQ');
    assert.equal(entry.actor, undefined, 'Objek aktor detail internal tidak boleh dikirim ke penerbit');
  });

  await test('Negative: Penerbit B dilarang melihat timeline naskah milik Penerbit A (403)', async () => {
    const res = await call(`/registrations/${timelineReg.id}/timeline`, publisherBToken, 'GET');
    assert.equal(res.status, 403, 'Penerbit lain harus ditolak melihat timeline naskah pihak ketiga');
  });

  console.log('✅ Semua pengujian PR-VER-07 (SLA, Kinerja, Sanitasi Timeline & RBAC) Berhasil 100%!');
}
