import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeManuscriptMetadata,
  createDraft,
  addManuscriptFile,
  listManuscriptFiles,
  ALLOWED_METADATA_KEYS,
} from '../src/services/registration.service.js';
import { assertManuscriptAccess } from '../src/services/file-access.service.js';
import {
  createRegistrationSchema,
  manuscriptMetadataSchema,
  manuscriptVariantSchema,
  manuscriptInputSchema,
  safeRecordSchema,
} from '../src/validators/registration.validator.js';

test('SEC-01: IDOR Protection - createDraft menolak sample_file_id milik pengguna/penerbit lain', async () => {
  const legitUser = { id: 'usr-legit-01', publisherId: 'pub-legit-01', roles: ['PENERBIT'] };

  const origPrisma = await import('../src/config/database.js').then((m) => m.prisma);
  const origFindManyFiles = origPrisma.storedFile.findMany;
  const origFindUniqueService = origPrisma.serviceType.findUnique;
  const origFindFirstService = origPrisma.serviceType.findFirst;
  const origFindManyItems = origPrisma.jenisNaskahItem.findMany;

  origPrisma.storedFile.findMany = async () => [
    // Berkas dimiliki oleh pengguna lain (usr-victim-99)
    { id: '11111111-1111-1111-1111-111111111111', owner_id: 'usr-victim-99' },
  ];
  origPrisma.serviceType.findUnique = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
  });
  origPrisma.serviceType.findFirst = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
  });
  origPrisma.jenisNaskahItem.findMany = async () => [
    {
      id: 'item-juz30',
      code: 'JUZ30',
      name: "Mushaf Al-Qur'an 30 Juz",
      role: 'DASAR',
      group: 1,
      service_kind: 'CETAK',
      fee_per_unit: 1000000,
      duration_initial: 15,
      duration_revision: 7,
      duration_dummy: 3,
      status: 'ACTIVE',
    },
  ];

  const payload = {
    service_type_id: '00000000-0000-0000-0000-000000000001',
    title: 'Pengajuan Naskah Percobaan IDOR',
    manuscripts: [
      {
        seq_number: 1,
        title: "Mushaf 30 Juz",
        items: ['JUZ30'],
        variants: [{ ukuran: 'A4', oplah: 5000 }],
        sample_file_id: '11111111-1111-1111-1111-111111111111',
      },
    ],
  };

  try {
    await assert.rejects(
      async () => {
        await createDraft(payload, legitUser);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('bukan milik akun Anda'));
        return true;
      }
    );
  } finally {
    origPrisma.storedFile.findMany = origFindManyFiles;
    origPrisma.serviceType.findUnique = origFindUniqueService;
    origPrisma.serviceType.findFirst = origFindFirstService;
    origPrisma.jenisNaskahItem.findMany = origFindManyItems;
  }
});

test('SEC-02: IDOR Protection - createDraft menolak sample_file_id yang tidak terdaftar', async () => {
  const legitUser = { id: 'usr-legit-01', publisherId: 'pub-legit-01', roles: ['PENERBIT'] };

  const origPrisma = await import('../src/config/database.js').then((m) => m.prisma);
  const origFindManyFiles = origPrisma.storedFile.findMany;
  const origFindUniqueService = origPrisma.serviceType.findUnique;
  const origFindFirstService = origPrisma.serviceType.findFirst;
  const origFindManyItems = origPrisma.jenisNaskahItem.findMany;

  origPrisma.storedFile.findMany = async () => [];
  origPrisma.auditLog.create = async () => ({ id: 'aud-root' });
  origPrisma.registration.findUnique = async () => null; // Berkas tidak ditemukan
  origPrisma.serviceType.findUnique = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
  });
  origPrisma.serviceType.findFirst = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
  });
  origPrisma.jenisNaskahItem.findMany = async () => [
    {
      id: 'item-juz30',
      code: 'JUZ30',
      name: "Mushaf Al-Qur'an 30 Juz",
      role: 'DASAR',
      group: 1,
      service_kind: 'CETAK',
      fee_per_unit: 1000000,
      duration_initial: 15,
      duration_revision: 7,
      duration_dummy: 3,
      status: 'ACTIVE',
    },
  ];

  const payload = {
    service_type_id: '00000000-0000-0000-0000-000000000001',
    title: 'Pengajuan Naskah Berkas Hantu',
    manuscripts: [
      {
        seq_number: 1,
        title: "Mushaf 30 Juz",
        items: ['JUZ30'],
        variants: [{ ukuran: 'A4', oplah: 5000 }],
        sample_file_id: '22222222-2222-2222-2222-222222222222',
      },
    ],
  };

  try {
    await assert.rejects(
      async () => {
        await createDraft(payload, legitUser);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('tidak ditemukan di sistem'));
        return true;
      }
    );
  } finally {
    origPrisma.storedFile.findMany = origFindManyFiles;
    origPrisma.serviceType.findUnique = origFindUniqueService;
    origPrisma.serviceType.findFirst = origFindFirstService;
    origPrisma.jenisNaskahItem.findMany = origFindManyItems;
  }
});

test('SEC-03: IDOR Protection - addManuscriptFile menolak penerbit lain dan manuscript_id lintas registrasi', async () => {
  const origPrisma = await import('../src/config/database.js').then((m) => m.prisma);
  const origRegFindUnique = origPrisma.registration.findUnique;
  const origTx = origPrisma.$transaction;

  try {
    // Kasus 1: Penerbit B mencoba mengunggah file ke registrasi milik Penerbit A
    origPrisma.registration.findUnique = async () => ({
      id: 'reg-publisher-a',
      publisher_id: 'pub-alpha',
      status: 'DRAFT',
    });

    const attackerUser = { id: 'usr-attacker', publisherId: 'pub-beta', roles: ['PENERBIT'] };

    await assert.rejects(
      async () => {
        await addManuscriptFile('reg-publisher-a', { file_id: '11111111-1111-1111-1111-111111111111' }, attackerUser);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('tidak memiliki izin'));
        return true;
      }
    );

    // Kasus 2: Penerbit A menyertakan manuscript_id yang bukan milik registrasi tersebut
    origPrisma.registration.findUnique = async () => ({
      id: 'reg-publisher-a',
      publisher_id: 'pub-alpha',
      status: 'DRAFT',
    });

    origPrisma.$transaction = async (callback) => {
      const fakeTx = {
        $queryRaw: async () => [{ id: 'reg-publisher-a' }],
        registration: {
          findUnique: async () => ({ id: 'reg-publisher-a', publisher_id: 'pub-alpha', status: 'DRAFT' }),
        },
        storedFile: {
          findUnique: async () => ({ id: 'file-01', owner_id: 'usr-alpha', checksum: 'sha256-abc', file_size: 1024, mime_type: 'application/pdf' }),
        },
        manuscript: {
          findFirst: async () => null, // Naskah tidak ditemukan pada registrasi ini
        },
        manuscriptFile: {
          findFirst: async () => null,
        },
      };
      return callback(fakeTx);
    };

    const legitAlphaUser = { id: 'usr-alpha', publisherId: 'pub-alpha', roles: ['PENERBIT'] };

    await assert.rejects(
      async () => {
        await addManuscriptFile(
          'reg-publisher-a',
          { file_id: '11111111-1111-1111-1111-111111111111', manuscript_id: '33333333-3333-3333-3333-333333333333' },
          legitAlphaUser
        );
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        assert.ok(err.message.includes('Naskah tidak ditemukan pada pengajuan ini'));
        return true;
      }
    );
  } finally {
    origPrisma.registration.findUnique = origRegFindUnique;
    origPrisma.$transaction = origTx;
  }
});

test('SEC-04: XSS & HTML Sanitization - sanitizeManuscriptMetadata membersihkan tag dan script berbahaya', () => {
  const dirtyInput = {
    penulis_nama: '<script>alert("xss")</script>Dr. H. Ahmad',
    deskripsi: '<b onclick="malicious()">Mushaf</b> dengan terjemahan <img src=x onerror=alert(1)>',
    penanggung_jawab_produk: '<iframe src="evil.com"></iframe>Fakhri',
    tahun_terbit: 2026,
    jumlah_halaman: 604,
    sizes: ['<script>14 x 21</script>14 x 21', '21 x 29.7'],
    malicious_unwhitelisted_key: 'hacked_payload',
    __proto__: { admin: true },
  };

  const sanitized = sanitizeManuscriptMetadata(dirtyInput);

  assert.equal(sanitized.penulis_nama, 'Dr. H. Ahmad');
  assert.equal(sanitized.deskripsi, 'Mushaf dengan terjemahan');
  assert.equal(sanitized.penanggung_jawab_produk, 'Fakhri');
  assert.equal(sanitized.tahun_terbit, 2026);
  assert.equal(sanitized.jumlah_halaman, 604);
  assert.deepEqual(sanitized.sizes, ['14 x 21', '21 x 29.7']);
  assert.equal(sanitized.malicious_unwhitelisted_key, undefined, 'Key tidak terdaftar wajib diabaikan');
  assert.equal(sanitized.admin, undefined, 'Prototype pollution wajib dicegah');
});

test('SEC-05: XSS Protection - createDraft membersihkan tag HTML pada judul naskah dan ukuran varian', async () => {
  const origPrisma = await import('../src/config/database.js').then((m) => m.prisma);
  const origFindManyFiles = origPrisma.storedFile.findMany;
  const origFindUniqueService = origPrisma.serviceType.findUnique;
  const origFindFirstService = origPrisma.serviceType.findFirst;
  const origFindManyItems = origPrisma.jenisNaskahItem.findMany;
  const origTx = origPrisma.$transaction;

  origPrisma.storedFile.findMany = async () => [];
  origPrisma.auditLog.create = async () => ({ id: 'aud-root' });
  origPrisma.registration.findUnique = async () => null;
  origPrisma.serviceType.findUnique = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
    duration_initial: 15,
  });
  origPrisma.serviceType.findFirst = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
    duration_initial: 15,
  });
  origPrisma.jenisNaskahItem.findMany = async () => [
    { id: 'item-1', code: 'JUZ30', role: 'DASAR', service_kind: 'CETAK', status: 'ACTIVE', fee_per_unit: 1000000, duration_initial: 15 },
  ];

  let capturedTitle = null;
  let capturedManuscriptTitle = null;
  let capturedVariantUkuran = null;

  origPrisma.$transaction = async (callback) => {
    const fakeTx = {
      $queryRaw: async () => [{ next_seq: 1 }],
      serviceAddon: { findMany: async () => [] },
      registration: {
        findFirst: async () => null,
        create: async ({ data }) => {
          capturedTitle = data.title;
          return { id: 'reg-xss-clean', ...data };
        },
      },
      manuscript: {
        create: async ({ data }) => {
          capturedManuscriptTitle = data.title;
          return { id: 'm-xss-clean', ...data };
        },
      },
      manuscriptItem: {
        create: async () => ({ id: 'mi-1' }),
      },
      manuscriptVariant: {
        create: async ({ data }) => {
          capturedVariantUkuran = data.ukuran;
          return { id: 'mv-1', ...data };
        },
      },
      manuscriptFile: {
        create: async () => ({ id: 'mf-1' }),
      },
      auditLog: {
        create: async () => ({ id: 'aud-1' }),
      },
      statusHistory: {
        create: async () => ({ id: 'sh-1' }),
      },
    };
    return callback(fakeTx);
  };

  const user = { id: 'usr-01', publisherId: 'pub-01', roles: ['PENERBIT'] };
  const payload = {
    service_type_id: '00000000-0000-0000-0000-000000000001',
    title: '<script>alert("xss")</script>Mushaf Al-Qur\'an Bersih',
    manuscripts: [
      {
        seq_number: 1,
        title: '<script>alert("hack")</script>Mushaf Utama',
        items: ['JUZ30'],
        variants: [
          { ukuran: '<b onmouseover=evil()>A4 (21 x 29.7)</b>', oplah: 2000 },
        ],
      },
    ],
  };

  try {
    await createDraft(payload, user);
    assert.equal(capturedTitle, "Mushaf Al-Qur'an Bersih", 'Tag script pada judul registrasi wajib dibersihkan');
    assert.equal(capturedManuscriptTitle, "Mushaf Utama", 'Tag script pada judul naskah wajib dibersihkan');
    assert.equal(capturedVariantUkuran, 'A4 (21 x 29.7)', 'Tag HTML pada ukuran varian wajib dibersihkan');
  } finally {
    origPrisma.storedFile.findMany = origFindManyFiles;
    origPrisma.serviceType.findUnique = origFindUniqueService;
    origPrisma.serviceType.findFirst = origFindFirstService;
    origPrisma.jenisNaskahItem.findMany = origFindManyItems;
    origPrisma.$transaction = origTx;
  }
});

test('SEC-06: DoS & Quota Protection - Menolak pendaftaran dengan > 20 naskah', () => {
  const schema = createRegistrationSchema.body;
  const excessiveManuscripts = [];
  for (let i = 1; i <= 21; i++) {
    excessiveManuscripts.push({
      seq_number: i,
      title: `Mushaf Naskah Ke-${i}`,
      items: ['JUZ30'],
      variants: [{ ukuran: 'A4', oplah: 1000 }],
    });
  }

  const result = schema.safeParse({
    service_type_id: '00000000-0000-0000-0000-000000000001',
    manuscripts: excessiveManuscripts,
    mushaf_details: { penanggung_jawab_produk: 'Ahmad' },
  });

  assert.equal(result.success, false, 'Pengajuan dengan > 20 naskah wajib ditolak');
  const errorPaths = result.error.issues.map((iss) => iss.path.join('.'));
  assert.ok(errorPaths.includes('manuscripts'));
});

test('SEC-07: DoS & Quota Protection - Menolak naskah dengan > 10 varian', () => {
  const schema = manuscriptInputSchema;
  const excessiveVariants = [];
  for (let i = 1; i <= 11; i++) {
    excessiveVariants.push({ ukuran: `Ukuran ${i}`, oplah: 1000 });
  }

  const result = schema.safeParse({
    seq_number: 1,
    title: 'Mushaf Terlalu Banyak Varian',
    items: ['JUZ30'],
    variants: excessiveVariants,
  });

  assert.equal(result.success, false, 'Naskah dengan > 10 varian wajib ditolak');
  assert.ok(result.error.issues[0].message.includes('Maksimal 10 varian'));
});

test('SEC-08: Parameter Tampering & Bounds - Validasi batasan oplah dan ukuran varian', () => {
  const schema = manuscriptVariantSchema;

  // 1. Oplah 0 atau negatif wajib ditolak
  assert.equal(schema.safeParse({ ukuran: 'A4', oplah: 0 }).success, false);
  assert.equal(schema.safeParse({ ukuran: 'A4', oplah: -500 }).success, false);

  // 2. Oplah desimal/float wajib ditolak
  assert.equal(schema.safeParse({ ukuran: 'A4', oplah: 100.5 }).success, false);

  // 3. Oplah ekstrem (> 10.000.000) wajib ditolak
  assert.equal(schema.safeParse({ ukuran: 'A4', oplah: 10_000_001 }).success, false);

  // 4. Oplah valid (1 s.d. 10.000.000) wajib diterima
  assert.equal(schema.safeParse({ ukuran: 'A4', oplah: 1 }).success, true);
  assert.equal(schema.safeParse({ ukuran: 'A4', oplah: 10_000_000 }).success, true);

  // 5. Ukuran kosong atau > 50 karakter wajib ditolak
  assert.equal(schema.safeParse({ ukuran: '', oplah: 1000 }).success, false);
  assert.equal(schema.safeParse({ ukuran: 'A'.repeat(51), oplah: 1000 }).success, false);
});

test('SEC-09: DoS & Payload Bloat - safeRecordSchema menolak metadata dengan properti atau ukuran berlebih', () => {
  const schema = safeRecordSchema;

  // 1. Lebih dari 50 properti wajib ditolak
  const bloatedObject = {};
  for (let i = 1; i <= 51; i++) {
    bloatedObject[`prop_${i}`] = `value_${i}`;
  }
  const resultBloat = schema.safeParse(bloatedObject);
  assert.equal(resultBloat.success, false);
  assert.ok(resultBloat.error.issues[0].message.includes('maksimal 50'));

  // 2. String properti melebihi 5000 karakter wajib ditolak
  const hugeValueObject = {
    catatan: 'X'.repeat(5001),
  };
  const resultHuge = schema.safeParse(hugeValueObject);
  assert.equal(resultHuge.success, false);
  assert.ok(resultHuge.error.issues[0].message.includes('melebihi batas aman'));

  // 3. Objek metadata dalam batas aman (misal 5 properti, panjang normal) lolos
  const normalObject = {
    penulis_nama: 'Drs. H. Ahmad',
    tahun_terbit: 2026,
    deskripsi: 'Deskripsi normal naskah',
  };
  assert.equal(schema.safeParse(normalObject).success, true);
});

test('SEC-10: Tenant Isolation - assertManuscriptAccess menolak akses lintas tenant dan pentashih tanpa penugasan aktif', async () => {
  const mockRegistration = {
    id: 'reg-tenant-a',
    publisher_id: 'pub-alpha',
    status: 'IN_VERIFICATION',
    core_verifier_id: 'usr-verif-01',
  };

  // Penerbit lain (pub-beta) ditolak akses (403)
  await assert.rejects(
    async () => {
      await assertManuscriptAccess(mockRegistration, {
        id: 'usr-beta',
        publisherId: 'pub-beta',
        roles: ['PENERBIT'],
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.message, 'Akses berkas ditolak.');
      return true;
    }
  );

  // Pentashih yang belum ditugaskan ditolak akses (403)
  const mockDbNoAssignment = {
    verificationAssignment: { findFirst: async () => null },
    assignment: { findFirst: async () => null },
  };

  await assert.rejects(
    async () => {
      await assertManuscriptAccess(
        mockRegistration,
        { id: 'usr-pentashih-unassigned', roles: ['PENTASHIH'] },
        false,
        mockDbNoAssignment
      );
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.ok(err.message.includes('belum memiliki penugasan aktif'));
      return true;
    }
  );

  // Penerbit pemilik sah diizinkan membaca
  await assert.doesNotReject(async () => {
    await assertManuscriptAccess(mockRegistration, {
      id: 'usr-alpha',
      publisherId: 'pub-alpha',
      roles: ['PENERBIT'],
    });
  });
});

test('SEC-11: Fee & SLA Tampering - Server mengabaikan fee / sla buatan client dan menghitung deterministik dari master data', async () => {
  const origPrisma = await import('../src/config/database.js').then((m) => m.prisma);
  const origFindManyFiles = origPrisma.storedFile.findMany;
  const origFindUniqueService = origPrisma.serviceType.findUnique;
  const origFindFirstService = origPrisma.serviceType.findFirst;
  const origFindManyItems = origPrisma.jenisNaskahItem.findMany;
  const origTx = origPrisma.$transaction;

  origPrisma.storedFile.findMany = async () => [];
  origPrisma.auditLog.create = async () => ({ id: 'aud-root' });
  origPrisma.registration.findUnique = async () => null;
  origPrisma.serviceType.findUnique = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
    duration_initial: 15,
  });
  origPrisma.serviceType.findFirst = async () => ({
    id: '00000000-0000-0000-0000-000000000001',
    name: "Mushaf Al-Qur'an 30 Juz",
    service_kind: 'CETAK',
    status: 'ACTIVE',
    base_fee: 1000000,
    duration_initial: 15,
  });
  origPrisma.jenisNaskahItem.findMany = async () => [
    {
      id: 'item-1',
      code: 'JUZ30',
      name: "Mushaf Al-Qur'an 30 Juz",
      role: 'DASAR',
      service_kind: 'CETAK',
      status: 'ACTIVE',
      fee_per_unit: 1000000,
      duration_initial: 15,
      duration_revision: 7,
      duration_dummy: 3,
    },
  ];

  let capturedSnapshot = null;

  origPrisma.$transaction = async (callback) => {
    const fakeTx = {
      $queryRaw: async () => [{ next_seq: 1 }],
      serviceAddon: { findMany: async () => [] },
      registration: {
        findFirst: async () => null,
        create: async ({ data }) => {
          capturedSnapshot = data.fee_sla_snapshot;
          return { id: 'reg-tamper-proof', ...data };
        },
      },
      manuscript: {
        create: async ({ data }) => ({ id: 'm-tamper-proof', ...data }),
      },
      manuscriptItem: {
        create: async () => ({ id: 'mi-1' }),
      },
      manuscriptVariant: {
        create: async ({ data }) => ({ id: 'mv-1', ...data }),
      },
      manuscriptFile: {
        create: async () => ({ id: 'mf-1' }),
      },
      auditLog: {
        create: async () => ({ id: 'aud-1' }),
      },
      statusHistory: {
        create: async () => ({ id: 'sh-1' }),
      },
    };
    return callback(fakeTx);
  };

  const user = { id: 'usr-01', publisherId: 'pub-01', roles: ['PENERBIT'] };
  // Client mencoba mengirim fee 0 rupiah dan SLA 1 hari (tampering attempt)
  const maliciousPayload = {
    service_type_id: '00000000-0000-0000-0000-000000000001',
    title: 'Mushaf Percobaan Manipulasi Tarif',
    fee: 0,
    base_fee: 0,
    total_fee: 0,
    sla_initial_days: 1,
    fee_sla_snapshot: { total_fee: 0, sla_initial_days: 1 },
    manuscripts: [
      {
        seq_number: 1,
        title: 'Mushaf 30 Juz Resmi',
        items: ['JUZ30'],
        variants: [{ ukuran: 'A4', oplah: 2000 }],
        fee: 0,
        sla_initial: 1,
      },
    ],
  };

  try {
    await createDraft(maliciousPayload, user);
    assert.equal(capturedSnapshot.total_fee, 1000000, 'Tarif wajib dihitung dari master data Rp 1.000.000, bukan 0');
    assert.equal(capturedSnapshot.sla_initial_days, 15, 'SLA perdana wajib 15 HK sesuai master data, bukan 1 HK');
    assert.equal(capturedSnapshot.manuscripts[0].fee, 1000000, 'Tarif naskah snapshot wajib Rp 1.000.000');
    assert.equal(capturedSnapshot.manuscripts[0].sla_initial, 15, 'SLA naskah snapshot wajib 15 HK');
  } finally {
    origPrisma.storedFile.findMany = origFindManyFiles;
    origPrisma.serviceType.findUnique = origFindUniqueService;
    origPrisma.serviceType.findFirst = origFindFirstService;
    origPrisma.jenisNaskahItem.findMany = origFindManyItems;
    origPrisma.$transaction = origTx;
  }
});
