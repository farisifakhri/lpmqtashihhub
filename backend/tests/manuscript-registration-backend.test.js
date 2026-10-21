import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import {
  createRegistrationSchema,
  manuscriptMetadataSchema,
  manuscriptVariantSchema,
} from '../src/validators/registration.validator.js';
import {
  SLA_INITIAL_CAP_DAYS,
  calculateManuscriptTarifAndSla,
  calculateRegistrationTarifAndSla,
  sanitizeManuscriptMetadata,
  createDraft,
} from '../src/services/registration.service.js';
import { renderRegistrationReceiptPdf } from '../src/services/registration-receipt-pdf.service.js';
import { listJenisNaskahItems } from '../src/services/master.service.js';

// Dummy Master Items sesuai seed resmi B-01 (§4)
const MOCK_ITEMS = {
  JUZ30: {
    id: 'item-juz30',
    code: 'JUZ30',
    name: "Al-Qur'an 30 Juz",
    role: 'DASAR',
    service_kind: 'CETAK',
    unit_fee_rate: 1,
    fee_per_unit: 1000000,
    duration_initial: 15,
    duration_revision: 7,
    duration_dummy: 3,
    covers_item_code: null,
  },
  YASIN: {
    id: 'item-yasin',
    code: 'YASIN',
    name: 'Surah Yasin dan Bacaan Tahlil',
    role: 'DASAR',
    service_kind: 'CETAK',
    unit_fee_rate: 1,
    fee_per_unit: 500000,
    duration_initial: 5,
    duration_revision: 2,
    duration_dummy: 1,
    covers_item_code: null,
  },
  DIGITAL: {
    id: 'item-digital',
    code: 'DIGITAL',
    name: 'Digital',
    role: 'DASAR',
    service_kind: 'DIGITAL',
    unit_fee_rate: 1,
    fee_per_unit: 1000000,
    duration_initial: 15,
    duration_revision: 7,
    duration_dummy: 3,
    covers_item_code: null,
  },
  BRAILLE: {
    id: 'item-braille',
    code: 'BRAILLE',
    name: 'Mushaf Standar Braille',
    role: 'DASAR',
    service_kind: 'BRAILLE',
    unit_fee_rate: 0,
    fee_per_unit: 0,
    duration_initial: 60,
    duration_revision: 30,
    duration_dummy: 15,
    covers_item_code: null,
  },
  TERJEMAH: {
    id: 'item-terjemah',
    code: 'TERJEMAH',
    name: 'Terjemah',
    role: 'TAMBAHAN',
    service_kind: 'CETAK',
    unit_fee_rate: 1,
    fee_per_unit: 500000,
    duration_initial: 7,
    duration_revision: 5,
    duration_dummy: 4,
    covers_item_code: null,
  },
  TRANSLITERASI: {
    id: 'item-transliterasi',
    code: 'TRANSLITERASI',
    name: 'Transliterasi',
    role: 'TAMBAHAN',
    service_kind: 'CETAK',
    unit_fee_rate: 1,
    fee_per_unit: 500000,
    duration_initial: 7,
    duration_revision: 5,
    duration_dummy: 4,
    covers_item_code: null,
  },
  TAJWID: {
    id: 'item-tajwid',
    code: 'TAJWID',
    name: 'Tajwid Warna / Kode Tajwid',
    role: 'TAMBAHAN',
    service_kind: 'CETAK',
    unit_fee_rate: 1,
    fee_per_unit: 500000,
    duration_initial: 7,
    duration_revision: 5,
    duration_dummy: 4,
    covers_item_code: null,
  },
  PERKATA: {
    id: 'item-perkata',
    code: 'PERKATA',
    name: 'Terjemah/Transliterasi Perkata',
    role: 'TAMBAHAN',
    service_kind: 'CETAK',
    unit_fee_rate: 2,
    fee_per_unit: 500000,
    duration_initial: 30,
    duration_revision: 15,
    duration_dummy: 9,
    covers_item_code: 'TERJEMAH',
  },
  TAFSIR: {
    id: 'item-tafsir',
    code: 'TAFSIR',
    name: 'Tafsir',
    role: 'TAMBAHAN',
    service_kind: 'CETAK',
    unit_fee_rate: 2,
    fee_per_unit: 500000,
    duration_initial: 30,
    duration_revision: 15,
    duration_dummy: 9,
    covers_item_code: 'TERJEMAH',
  },
  QIRAAT: {
    id: 'item-qiraat',
    code: 'QIRAAT',
    name: 'Qiraat',
    role: 'TAMBAHAN',
    service_kind: 'CETAK',
    unit_fee_rate: 1,
    fee_per_unit: 500000,
    duration_initial: 7,
    duration_revision: 5,
    duration_dummy: 4,
    covers_item_code: null,
  },
};

// ==========================================
// T1: Validasi Payload Registrasi Multi-Naskah
// ==========================================
test('B-01 T1: Validasi payload multi-naskah (1..20 naskah) dan penolakan > 20 naskah', () => {
  // 1 naskah valid
  const single = createRegistrationSchema.body.safeParse({
    mushaf_details: { penanggung_jawab_produk: 'Drs. H. Ahmad' },
    manuscripts: [
      {
        title: 'Mushaf Al-Baqarah',
        items: ['item-juz30'],
        variants: [{ ukuran: 'A4', oplah: 5000 }],
      },
    ],
  });
  assert.equal(single.success, true);

  // 20 naskah valid
  const twenty = createRegistrationSchema.body.safeParse({
    mushaf_details: { penanggung_jawab_produk: 'Drs. H. Ahmad' },
    manuscripts: Array.from({ length: 20 }, (_, i) => ({
      title: `Mushaf Seri ${i + 1}`,
      items: ['item-juz30'],
      variants: [{ ukuran: 'A4', oplah: 1000 }],
    })),
  });
  assert.equal(twenty.success, true);

  // 21 naskah HARUS DITOLAK
  const twentyOne = createRegistrationSchema.body.safeParse({
    mushaf_details: { penanggung_jawab_produk: 'Drs. H. Ahmad' },
    manuscripts: Array.from({ length: 21 }, (_, i) => ({
      title: `Mushaf Seri ${i + 1}`,
      items: ['item-juz30'],
      variants: [{ ukuran: 'A4', oplah: 1000 }],
    })),
  });
  assert.equal(twentyOne.success, false);
});

// ==========================================
// T2: Validasi Varian Per Naskah (1..10)
// ==========================================
test('B-01 T2: Validasi batasan varian (oplah min 1, max 10.000.000, max 10 varian)', () => {
  // Valid
  assert.equal(manuscriptVariantSchema.safeParse({ ukuran: 'A5 (14,8 x 21 cm)', oplah: 1000 }).success, true);

  // Oplah 0 atau negatif ditolak
  assert.equal(manuscriptVariantSchema.safeParse({ ukuran: 'A5', oplah: 0 }).success, false);
  assert.equal(manuscriptVariantSchema.safeParse({ ukuran: 'A5', oplah: -100 }).success, false);

  // Oplah pecahan ditolak
  assert.equal(manuscriptVariantSchema.safeParse({ ukuran: 'A5', oplah: 100.5 }).success, false);

  // Oplah melebihi 10 juta ditolak
  assert.equal(manuscriptVariantSchema.safeParse({ ukuran: 'A5', oplah: 10000001 }).success, false);

  // Lebih dari 10 varian per naskah ditolak
  const over10Variants = createRegistrationSchema.body.safeParse({
    mushaf_details: { penanggung_jawab_produk: 'Drs. H. Ahmad' },
    manuscripts: [
      {
        title: 'Mushaf Al-Ikhlas',
        items: ['item-juz30'],
        variants: Array.from({ length: 11 }, (_, i) => ({ ukuran: `Varian-${i}`, oplah: 1000 })),
      },
    ],
  });
  assert.equal(over10Variants.success, false);
});

// ==========================================
// T3: Sanitasi Metadata & Strict Whitelist
// ==========================================
test('B-01 T3: Sanitasi metadata naskah dan penolakan properti di luar whitelist', () => {
  // Properti resmi diterima
  const validMeta = {
    penulis_nama: 'Ahmad Dahlan',
    tahun_terbit: 2026,
    jumlah_halaman: 604,
    font_arab: 'LPMQ Misbah',
    deskripsi: 'Mushaf standar usmani dengan tanda waqaf kemenag',
  };
  assert.equal(manuscriptMetadataSchema.safeParse(validMeta).success, true);

  // Properti asing/berbahaya ditolak oleh Zod .strict()
  const invalidMeta = {
    ...validMeta,
    malicious_script: '<script>alert(1)</script>',
    unauthorized_attr: 'hack',
  };
  assert.equal(manuscriptMetadataSchema.safeParse(invalidMeta).success, false);

  // Sanitasi via sanitizeManuscriptMetadata membersihkan tag HTML
  const sanitized = sanitizeManuscriptMetadata({
    penulis_nama: '<b>Ahmad Dahlan</b>',
    deskripsi: '<script>alert("xss")</script>Deskripsi mushaf.',
    unknown_field: 'ignored',
  });
  assert.equal(sanitized.penulis_nama, 'Ahmad Dahlan');
  assert.equal(sanitized.deskripsi, 'alert("xss")Deskripsi mushaf.');
  assert.equal(sanitized.unknown_field, undefined);
});

// ==========================================
// T4: Engine Kalkulasi Tarif Naskah & Absorpsi
// ==========================================
test('B-01 T4: Engine kalkulasi tarif per naskah dan absorpsi Terjemah oleh Perkata/Tafsir', () => {
  // 1. 30 Juz murni = Rp 1.000.000
  const t1 = calculateManuscriptTarifAndSla([MOCK_ITEMS.JUZ30]);
  assert.equal(t1.fee, 1000000);
  assert.equal(t1.slaInitial, 15);

  // 2. 30 Juz + Terjemah (500k) + Transliterasi (500k) + Tajwid (500k) = Rp 2.500.000
  const t2 = calculateManuscriptTarifAndSla([
    MOCK_ITEMS.JUZ30,
    MOCK_ITEMS.TERJEMAH,
    MOCK_ITEMS.TRANSLITERASI,
    MOCK_ITEMS.TAJWID,
  ]);
  assert.equal(t2.fee, 2500000);
  // SLA = 15 + 7 + 7 + 7 = 36 HK
  assert.equal(t2.slaInitial, 36);

  // 3. 30 Juz + Perkata (2 unit = Rp 1.000.000) = Rp 2.000.000
  const t3 = calculateManuscriptTarifAndSla([MOCK_ITEMS.JUZ30, MOCK_ITEMS.PERKATA]);
  assert.equal(t3.fee, 2000000);
  // SLA = 15 + 30 = 45 HK
  assert.equal(t3.slaInitial, 45);

  // 4. 30 Juz + Terjemah + Perkata -> Terjemah diabsorpsi oleh Perkata!
  const t4 = calculateManuscriptTarifAndSla([
    MOCK_ITEMS.JUZ30,
    MOCK_ITEMS.TERJEMAH,
    MOCK_ITEMS.PERKATA,
  ]);
  assert.equal(t4.fee, 2000000, 'Terjemah harus diabsorpsi (tidak ditagih ganda)');
  assert.equal(t4.slaInitial, 45, 'Delta SLA Terjemah harus diabsorpsi');
  const terjemahItem = t4.items.find((i) => i.code === 'TERJEMAH');
  assert.equal(terjemahItem.is_covered, true);
  assert.equal(terjemahItem.fee, 0);

  // 5. 30 Juz + Terjemah + Tafsir -> Terjemah diabsorpsi oleh Tafsir!
  const t5 = calculateManuscriptTarifAndSla([
    MOCK_ITEMS.JUZ30,
    MOCK_ITEMS.TERJEMAH,
    MOCK_ITEMS.TAFSIR,
  ]);
  assert.equal(t5.fee, 2000000);
  assert.equal(t5.slaInitial, 45);

  // 6. 30 Juz + Tafsir (2 unit) + Perkata (2 unit) = Rp 3.000.000
  const t6 = calculateManuscriptTarifAndSla([
    MOCK_ITEMS.JUZ30,
    MOCK_ITEMS.TAFSIR,
    MOCK_ITEMS.PERKATA,
  ]);
  assert.equal(t6.fee, 3000000);

  // 7. Braille = Rp 0, SLA 60 HK
  const t7 = calculateManuscriptTarifAndSla([MOCK_ITEMS.BRAILLE]);
  assert.equal(t7.fee, 0);
  assert.equal(t7.slaInitial, 60);
});

// ==========================================
// T5: Batas Maksimal SLA Perdana 60 HK
// ==========================================
test('B-01 T5: Batas maksimal SLA perdana dicap di 60 HK (Keputusan Baseline 1)', () => {
  // Misal naskah memilih 30 Juz (15 HK) + Tafsir (30 HK) + Perkata (30 HK) + Tajwid (7 HK)
  // Raw SLA = 15 + 30 + 30 + 7 = 82 HK
  const tOver = calculateManuscriptTarifAndSla([
    MOCK_ITEMS.JUZ30,
    MOCK_ITEMS.TAFSIR,
    MOCK_ITEMS.PERKATA,
    MOCK_ITEMS.TAJWID,
  ]);

  assert.equal(tOver.rawSlaInitial, 82);
  assert.equal(tOver.slaInitial, 60, 'SLA Perdana wajib dibatasi maksimum 60 HK');
  assert.equal(SLA_INITIAL_CAP_DAYS, 60);

  // Namun SLA revisi tidak dicap (7 + 15 + 15 + 5 = 42 HK)
  assert.equal(tOver.slaRevision, 42);
});

// ==========================================
// T6: Akumulasi Tarif & SLA Multi-Naskah
// ==========================================
test('B-01 T6: Akumulasi tarif dan penentuan SLA pendaftaran multi-naskah', () => {
  const m1 = calculateManuscriptTarifAndSla([MOCK_ITEMS.JUZ30, MOCK_ITEMS.TERJEMAH]); // Fee 1.500.000, SLA 22 HK
  const m2 = calculateManuscriptTarifAndSla([MOCK_ITEMS.JUZ30, MOCK_ITEMS.PERKATA]);  // Fee 2.000.000, SLA 45 HK
  const m3 = calculateManuscriptTarifAndSla([MOCK_ITEMS.YASIN]);                      // Fee 500.000, SLA 5 HK

  const regCalc = calculateRegistrationTarifAndSla([m1, m2, m3]);

  // Total tarif registrasi = 1.5jt + 2.0jt + 0.5jt = 4.000.000
  assert.equal(regCalc.totalFee, 4000000);

  // SLA registrasi = nilai maksimum SLA naskah = max(22, 45, 5) = 45 HK
  assert.equal(regCalc.slaInitial, 45);
});

// ==========================================
// T7: Render Tanda Terima PDF Multi-Naskah
// ==========================================
test('B-01 T7: renderRegistrationReceiptPdf menghasilkan buffer PDF valid dengan rincian multi-naskah', async () => {
  const mockRegistration = {
    registration_no: 'REG-202610-TEST-001',
    title: 'Paket Mushaf Nusantara',
    registration_category: 'NEW',
    created_at: new Date('2026-10-20T10:00:00Z'),
    publisher: {
      name: 'PT Percetakan Al-Qur\'an Berkah',
      legal_name: 'PT Percetakan Al-Qur\'an Berkah Sejahtera',
      id: 'pub-test-01',
    },
    manuscripts: [
      {
        seq_number: 1,
        title: 'Mushaf Al-Qur\'an 30 Juz Standar',
        items: [
          { item: { name: 'Al-Qur\'an 30 Juz' } },
          { item: { name: 'Terjemah' } },
        ],
        variants: [
          { ukuran: 'A4 (21,0 x 29,7 cm)', oplah: 5000 },
          { ukuran: 'B5 (17,6 x 25,0 cm)', oplah: 3000 },
        ],
      },
      {
        seq_number: 2,
        title: 'Mushaf Surah Yasin & Tahlil',
        items: [
          { item: { name: 'Surah Yasin dan Bacaan Tahlil' } },
        ],
        variants: [
          { ukuran: 'A6 (10,5 x 14,8 cm)', oplah: 10000 },
        ],
      },
    ],
  };

  const buffer = await renderRegistrationReceiptPdf(mockRegistration);
  assert.ok(buffer instanceof Uint8Array || Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000, 'Panjang berkas PDF harus lebih dari 1000 bytes');

  // Periksa PDF magic bytes
  const header = Buffer.from(buffer.slice(0, 5)).toString();
  assert.equal(header, '%PDF-', 'Buffer harus berupa dokumen PDF yang valid');
});

// ==========================================
// T8: Validasi Service Logic: Peran DASAR & Varian CETAK
// ==========================================
test('B-01 T8: Penolakan naskah tanpa item DASAR dan naskah CETAK tanpa varian', async () => {
  const originalServiceFind = prisma.serviceType.findUnique;
  const originalItemsFind = prisma.jenisNaskahItem.findMany;

  try {
    prisma.serviceType.findUnique = async () => ({ id: 'srv-1', status: 'ACTIVE', category: {} });

    // 1. Uji Penolakan jika TIDAK ADA item dengan peran DASAR (hanya TAMBAHAN)
    prisma.jenisNaskahItem.findMany = async () => [MOCK_ITEMS.TERJEMAH, MOCK_ITEMS.TAJWID];
    await assert.rejects(
      createDraft(
        {
          service_type_id: 'srv-1',
          manuscripts: [
            {
              title: 'Mushaf Tanpa Item Dasar',
              items: ['item-terjemah', 'item-tajwid'],
              variants: [{ ukuran: 'A4', oplah: 1000 }],
            },
          ],
        },
        { id: 'usr-1', publisherId: 'pub-1', roles: ['PENERBIT'] }
      ),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('peran DASAR'), `Pesan harus menyebut peran DASAR: ${err.message}`);
        return true;
      }
    );

    // 2. Uji Penolakan jika item CETAK tidak memiliki varian ukuran & oplah
    prisma.jenisNaskahItem.findMany = async () => [MOCK_ITEMS.JUZ30]; // JUZ30 is CETAK
    await assert.rejects(
      createDraft(
        {
          service_type_id: 'srv-1',
          manuscripts: [
            {
              title: 'Mushaf Cetak Tanpa Varian',
              items: ['item-juz30'],
              variants: [], // Kosong!
            },
          ],
        },
        { id: 'usr-1', publisherId: 'pub-1', roles: ['PENERBIT'] }
      ),
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('varian ukuran dan oplah'), `Pesan harus menyebut varian: ${err.message}`);
        return true;
      }
    );

    // 3. Uji Penerimaan jika naskah DIGITAL tidak memiliki varian (varian opsional untuk non-CETAK)
    prisma.jenisNaskahItem.findMany = async () => [MOCK_ITEMS.DIGITAL]; // DIGITAL is non-CETAK
    // Mock prisma.$transaction to verify it reaches transaction successfully
    let txReached = false;
    const originalTx = prisma.$transaction;
    prisma.$transaction = async (fn) => {
      txReached = true;
      throw new Error('TX_SUCCESSFULLY_REACHED');
    };

    try {
      await assert.rejects(
        createDraft(
          {
            service_type_id: 'srv-1',
            manuscripts: [
              {
                title: 'Aplikasi Mushaf Digital',
                items: ['item-digital'],
                variants: [], // Diizinkan untuk non-cetak!
              },
            ],
          },
          { id: 'usr-1', publisherId: 'pub-1', roles: ['PENERBIT'] }
        ),
        (err) => err.message === 'TX_SUCCESSFULLY_REACHED'
      );
      assert.equal(txReached, true, 'Naskah DIGITAL tanpa varian harus lolos validasi varian');
    } finally {
      prisma.$transaction = originalTx;
    }
  } finally {
    prisma.serviceType.findUnique = originalServiceFind;
    prisma.jenisNaskahItem.findMany = originalItemsFind;
  }
});

// ==========================================
// T9: P0 Security: Perlindungan sample_file_id
// ==========================================
test('B-01 T9: P0 Security: createDraft menolak sample_file_id naskah milik pengguna lain', async () => {
  const originalServiceFind = prisma.serviceType.findUnique;
  const originalItemsFind = prisma.jenisNaskahItem.findMany;
  const originalStoredFileFindMany = prisma.storedFile.findMany;

  try {
    prisma.serviceType.findUnique = async () => ({ id: 'srv-1', status: 'ACTIVE', category: {} });
    prisma.jenisNaskahItem.findMany = async () => [MOCK_ITEMS.JUZ30];
    // Berkas dimiliki oleh 'other-user-uuid'
    prisma.storedFile.findMany = async () => [
      { id: 'file-stolen-sample', owner_id: 'other-user-uuid' },
    ];

    await assert.rejects(
      createDraft(
        {
          service_type_id: 'srv-1',
          manuscripts: [
            {
              title: 'Mushaf Bajakan',
              items: ['item-juz30'],
              sample_file_id: 'file-stolen-sample',
              variants: [{ ukuran: 'A4', oplah: 1000 }],
            },
          ],
        },
        { id: 'my-user-uuid', roles: ['PENERBIT'], publisherId: 'pub-1' }
      ),
      (err) => err.statusCode === 403 && err.message.includes('bukan milik akun Anda')
    );
  } finally {
    prisma.serviceType.findUnique = originalServiceFind;
    prisma.jenisNaskahItem.findMany = originalItemsFind;
    prisma.storedFile.findMany = originalStoredFileFindMany;
  }
});

// ==========================================
// T10: Master Data Service: listJenisNaskahItems
// ==========================================
test('B-01 T10: listJenisNaskahItems memanggil query master jenis naskah dengan status ACTIVE', async () => {
  const originalFindMany = prisma.jenisNaskahItem.findMany;
  try {
    let queriedWhere = null;
    prisma.jenisNaskahItem.findMany = async (args) => {
      queriedWhere = args.where;
      return Object.values(MOCK_ITEMS);
    };

    const items = await listJenisNaskahItems();
    assert.equal(items.length, 10);
    assert.deepEqual(queriedWhere, { status: 'ACTIVE' });
  } finally {
    prisma.jenisNaskahItem.findMany = originalFindMany;
  }
});

// ==========================================
// T11: Backward Compatibility: calculateManuscriptTarifAndSla edge cases
// ==========================================
test('B-01 T11: Edge cases kalkulasi tarif dan SLA jika items kosong atau null', () => {
  const emptyCalc = calculateManuscriptTarifAndSla([]);
  assert.equal(emptyCalc.fee, 0);
  assert.equal(emptyCalc.slaInitial, 0);
  assert.equal(emptyCalc.items.length, 0);

  const nullCalc = calculateManuscriptTarifAndSla(null);
  assert.equal(nullCalc.fee, 0);
  assert.equal(nullCalc.slaInitial, 0);

  const regEmpty = calculateRegistrationTarifAndSla([]);
  assert.equal(regEmpty.totalFee, 0);
  assert.equal(regEmpty.slaInitial, 0);
});

