/**
 * Mesin Hitung Tarif dan SLA Berbasis Item (B-01 §4 & Sesi 0b)
 *
 * Modul ini merupakan fungsi murni (pure function) tanpa akses database atau I/O.
 * Sumber kebenaran mengacu pada Dokumen Spesifikasi B-01 (v5, 21 Okt 2026):
 * - Tabel 4.1: Item Dasar (Kelompok 1 & 2)
 * - Tabel 4.2: Item Tambahan (Kelompok 3)
 * - Aturan Hitung §4.3: Unit Tarif @ Rp 500.000, Absorpsi Terjemah oleh Perkata/Tafsir, Batas SLA Perdana 60 HK.
 */

export const SLA_INITIAL_CAP_DAYS = 60;
export const UNIT_FEE_RATE = 500000;

// Tabel 4.1: Item Dasar (Kelompok 1 & 2, tepat satu per naskah)
export const ITEM_DASAR_MAP = {
  JUZ30: {
    code: 'JUZ30',
    name: "Al-Qur'an 30 Juz",
    group_number: 1,
    role: 'DASAR',
    fee: 1000000,
    sla_initial: 15,
    sla_revision: 7,
    sla_dummy: 3,
    service_kind: 'CETAK',
    service_type_name: "Mushaf Al-Qur'an 30 Juz",
  },
  YASIN: {
    code: 'YASIN',
    name: 'Surah Yasin dan Bacaan Tahlil',
    group_number: 1,
    role: 'DASAR',
    fee: 500000,
    sla_initial: 5,
    sla_revision: 2,
    sla_dummy: 1,
    service_kind: 'CETAK',
    service_type_name: 'Surah Yasin dan Bacaan Tahlil',
  },
  AMMA: {
    code: 'AMMA',
    name: "Juz 'Amma dan Terjemahnya",
    group_number: 1,
    role: 'DASAR',
    fee: 500000,
    sla_initial: 5,
    sla_revision: 2,
    sla_dummy: 1,
    service_kind: 'CETAK',
    service_type_name: "Juz 'Amma dan Terjemahnya",
  },
  MAJMU: {
    code: 'MAJMU',
    name: "Majmu' Syarif",
    group_number: 1,
    role: 'DASAR',
    fee: 500000,
    sla_initial: 5,
    sla_revision: 2,
    sla_dummy: 1,
    service_kind: 'CETAK',
    service_type_name: "Majmu' Syarif",
  },
  KALIGRAFI: {
    code: 'KALIGRAFI',
    name: 'Kaligrafi',
    group_number: 1,
    role: 'DASAR',
    fee: 500000,
    sla_initial: 3,
    sla_revision: 2,
    sla_dummy: 1,
    service_kind: 'CETAK',
    service_type_name: 'Kaligrafi',
  },
  METODE: {
    code: 'METODE',
    name: "Metode Baca Tulis Al-Qur'an",
    group_number: 1,
    role: 'DASAR',
    fee: 500000,
    sla_initial: 15,
    sla_revision: 7,
    sla_dummy: 3,
    service_kind: 'CETAK',
    service_type_name: "Metode Baca Tulis Al-Qur'an",
  },
  AV: {
    code: 'AV',
    name: 'Audio/Visual',
    group_number: 2,
    role: 'DASAR',
    fee: 1000000,
    sla_initial: 30,
    sla_revision: 15,
    sla_dummy: 7,
    service_kind: 'AUDIO_VISUAL',
    service_type_name: 'Al-Qur\'an Audio/Visual',
  },
  DIGITAL: {
    code: 'DIGITAL',
    name: 'Digital',
    group_number: 2,
    role: 'DASAR',
    fee: 1000000,
    sla_initial: 15,
    sla_revision: 7,
    sla_dummy: 3,
    service_kind: 'DIGITAL',
    service_type_name: 'Mushaf Al-Qur\'an Digital',
  },
  BRAILLE: {
    code: 'BRAILLE',
    name: 'Mushaf Standar Braille',
    group_number: 1,
    role: 'DASAR',
    fee: 0,
    sla_initial: 60,
    sla_revision: 30,
    sla_dummy: 15,
    service_kind: 'BRAILLE',
    service_type_name: 'Mushaf Al-Qur\'an Braille',
  },
};

// Tabel 4.2: Item Tambahan (Kelompok 3, boleh lebih dari satu)
export const ITEM_TAMBAHAN_MAP = {
  TERJEMAH: {
    code: 'TERJEMAH',
    name: 'Terjemah',
    group_number: 3,
    role: 'TAMBAHAN',
    unit_count: 1,
    fee: 500000,
    delta_initial: 7,
    delta_revision: 5,
    delta_dummy: 4,
    covers_item_code: null,
  },
  TRANSLITERASI: {
    code: 'TRANSLITERASI',
    name: 'Transliterasi',
    group_number: 3,
    role: 'TAMBAHAN',
    unit_count: 1,
    fee: 500000,
    delta_initial: 7,
    delta_revision: 5,
    delta_dummy: 4,
    covers_item_code: null,
  },
  TAJWID: {
    code: 'TAJWID',
    name: 'Tajwid Warna / Kode Tajwid',
    group_number: 3,
    role: 'TAMBAHAN',
    unit_count: 1,
    fee: 500000,
    delta_initial: 7,
    delta_revision: 5,
    delta_dummy: 4,
    covers_item_code: null,
  },
  WAQAF: {
    code: 'WAQAF',
    name: "Waqaf Ibtida'",
    group_number: 3,
    role: 'TAMBAHAN',
    unit_count: 1,
    fee: 500000,
    delta_initial: 7,
    delta_revision: 5,
    delta_dummy: 4,
    covers_item_code: null,
  },
  QIRAAT: {
    code: 'QIRAAT',
    name: 'Qiraat',
    group_number: 3,
    role: 'TAMBAHAN',
    unit_count: 1,
    fee: 500000,
    delta_initial: 7,
    delta_revision: 5,
    delta_dummy: 4,
    covers_item_code: null,
  },
  PERKATA: {
    code: 'PERKATA',
    name: 'Terjemah/Transliterasi Perkata',
    group_number: 3,
    role: 'TAMBAHAN',
    unit_count: 2,
    fee: 1000000,
    delta_initial: 30,
    delta_revision: 15,
    delta_dummy: 9,
    covers_item_code: 'TERJEMAH',
  },
  TAFSIR: {
    code: 'TAFSIR',
    name: 'Tafsir',
    group_number: 3,
    role: 'TAMBAHAN',
    unit_count: 2,
    fee: 1000000,
    delta_initial: 30,
    delta_revision: 15,
    delta_dummy: 9,
    covers_item_code: 'TERJEMAH',
  },
};

/**
 * Menghitung tarif dan SLA naskah berdasarkan daftar kode item.
 *
 * @param {Array<string|object>} itemCodesOrObjects - Daftar kode item atau objek item
 * @param {object} [options]
 * @param {boolean} [options.isExtensionOrTambahOplah=false] - Jika true, gunakan SLA perpanjangan/dumi (T11)
 * @returns {object} Detail kalkulasi tarif dan SLA naskah
 */
export function calculateItemTarifAndSla(itemCodesOrObjects = [], options = {}) {
  const codes = (Array.isArray(itemCodesOrObjects) ? itemCodesOrObjects : [])
    .map((it) => (typeof it === 'string' ? it.trim().toUpperCase() : it?.code?.trim()?.toUpperCase()))
    .filter(Boolean);

  let dasarItem = null;
  const tambahanItems = [];

  for (const code of codes) {
    if (ITEM_DASAR_MAP[code]) {
      if (!dasarItem) {
        dasarItem = ITEM_DASAR_MAP[code];
      }
    } else if (ITEM_TAMBAHAN_MAP[code]) {
      tambahanItems.push(ITEM_TAMBAHAN_MAP[code]);
    }
  }

  // Jika tidak ada item dasar eksplisit, bawaan ke JUZ30 bila bukan item non-cetak
  if (!dasarItem) {
    dasarItem = ITEM_DASAR_MAP.JUZ30;
  }

  // Cek absorpsi (contoh: PERKATA atau TAFSIR mengabaikan TERJEMAH)
  const coveredCodes = new Set();
  for (const tamb of tambahanItems) {
    if (tamb.covers_item_code) {
      coveredCodes.add(tamb.covers_item_code);
    }
  }

  let totalFee = dasarItem.fee;
  let rawInitialSla = dasarItem.sla_initial;
  let slaRevision = dasarItem.sla_revision;
  let slaDummy = dasarItem.sla_dummy;

  const itemDetails = [
    {
      code: dasarItem.code,
      name: dasarItem.name,
      role: 'DASAR',
      fee: dasarItem.fee,
      is_covered: false,
      delta_initial: dasarItem.sla_initial,
      delta_revision: dasarItem.sla_revision,
      delta_dummy: dasarItem.sla_dummy,
    },
  ];

  for (const tamb of tambahanItems) {
    const isCovered = coveredCodes.has(tamb.code);
    const itemFee = isCovered ? 0 : tamb.fee;
    const deltaInit = isCovered ? 0 : tamb.delta_initial;
    const deltaRev = isCovered ? 0 : tamb.delta_revision;
    const deltaDum = isCovered ? 0 : tamb.delta_dummy;

    totalFee += itemFee;
    rawInitialSla += deltaInit;
    slaRevision += deltaRev;
    slaDummy += deltaDum;

    itemDetails.push({
      code: tamb.code,
      name: tamb.name,
      role: 'TAMBAHAN',
      fee: itemFee,
      is_covered: isCovered,
      delta_initial: deltaInit,
      delta_revision: deltaRev,
      delta_dummy: deltaDum,
    });
  }

  // Batas 60 HK hanya berlaku untuk SLA perdana (§4.3)
  const cappedInitialSla = Math.min(SLA_INITIAL_CAP_DAYS, rawInitialSla);

  // Jika tambah oplah atau perpanjangan, SLA memakai SLA perpanjangan/dumi (T11 & §4.3)
  const isExtension = Boolean(options?.isExtensionOrTambahOplah);
  const effectiveInitialSla = isExtension ? slaDummy : cappedInitialSla;

  // Nama layanan tampilan
  const activeTambahanNames = itemDetails
    .filter((d) => d.role === 'TAMBAHAN' && !d.is_covered)
    .map((d) => d.name);

  const layananDisplay =
    activeTambahanNames.length > 0
      ? `${dasarItem.name} (+ ${activeTambahanNames.join(', ')})`
      : dasarItem.name;

  return {
    dasar_code: dasarItem.code,
    dasar_name: dasarItem.name,
    service_kind: dasarItem.service_kind,
    service_type_name: dasarItem.service_type_name,
    layanan_display: layananDisplay,
    layananDisplay: layananDisplay,
    fee: totalFee,
    sla_initial: effectiveInitialSla,
    raw_sla_initial: rawInitialSla,
    sla_revision: slaRevision,
    sla_dummy: slaDummy,
    items: itemDetails,
  };
}

/**
 * Agregasi total tarif dan SLA pengajuan (multi-naskah).
 * Tarif = penjumlahan seluruh tarif naskah.
 * SLA = durasi naskah terpanjang (perdana, revisi, dumi).
 *
 * @param {Array<object>} manuscriptCalculations
 * @returns {object} Ringkasan pengajuan
 */
export function calculateRegistrationSummary(manuscriptCalculations = []) {
  const mList = Array.isArray(manuscriptCalculations) ? manuscriptCalculations : [];

  const totalFee = mList.reduce((sum, m) => sum + (Number(m.fee) || 0), 0);
  const maxSlaInitial = mList.length > 0 ? Math.max(...mList.map((m) => m.sla_initial || m.slaInitial || 0)) : 0;
  const maxSlaRevision = mList.length > 0 ? Math.max(...mList.map((m) => m.sla_revision || m.slaRevision || 0)) : 0;
  const maxSlaDummy = mList.length > 0 ? Math.max(...mList.map((m) => m.sla_dummy || m.slaDummy || 0)) : 0;

  return {
    total_fee: totalFee,
    sla_initial: maxSlaInitial,
    sla_revision: maxSlaRevision,
    sla_dummy: maxSlaDummy,
  };
}

/**
 * Normalisasi pilihan form lama (jenis_naskah, jenis_mushaf, registration_type)
 * menjadi daftar kode item resmi B-01 (§4.1 & §4.2)
 *
 * Mengeliminasi tebakan teks parsial yang menyebabkan bug UAT U-01.
 *
 * @param {Array<string>} jenisNaskahList - Pilihan checklist form
 * @param {object} [metadata]
 * @returns {Array<string>} Daftar kode item (misal ['JUZ30', 'WAQAF', 'PERKATA', 'TAJWID'])
 */
export function normalizeLegacyToItemCodes(jenisNaskahList = [], metadata = {}) {
  const list = Array.isArray(jenisNaskahList) ? jenisNaskahList : [];
  const textJoined = list.join(' ').toLowerCase();

  const jenisMushaf = (metadata?.jenis_mushaf || '').toLowerCase();
  const regType = metadata?.registration_type || metadata?.registration_category || '';

  const itemCodes = new Set();

  // 1. Tentukan Item Dasar secara deterministik (Kelompok 1 & 2)
  if (jenisMushaf.includes('braille') || textJoined.includes('braille')) {
    itemCodes.add('BRAILLE');
  } else if (textJoined.includes('audio/visual') || textJoined.includes('audio visual') || textJoined.includes('rekaman')) {
    itemCodes.add('AV');
  } else if (textJoined.includes('2. digital') || (textJoined.includes('digital') && !textJoined.includes('cetak'))) {
    itemCodes.add('DIGITAL');
  } else if (textJoined.includes('surah yasin') || textJoined.includes('yasin')) {
    itemCodes.add('YASIN');
  } else if (textJoined.includes("majmu' syarif") || textJoined.includes('majmu')) {
    itemCodes.add('MAJMU');
  } else if (textJoined.includes('kaligrafi')) {
    itemCodes.add('KALIGRAFI');
  } else if (textJoined.includes('metode baca tulis')) {
    itemCodes.add('METODE');
  } else if (
    textJoined.includes("1. juz 'amma") ||
    textJoined.includes('1. juz-juz pilihan') ||
    (textJoined.includes('juz') && !textJoined.includes('30 juz') && !textJoined.includes('30'))
  ) {
    itemCodes.add('AMMA');
  } else {
    // Default utama cetak adalah 30 Juz
    itemCodes.add('JUZ30');
  }

  // 2. Tentukan Item Tambahan (Kelompok 3)
  for (const raw of list) {
    if (!raw || typeof raw !== 'string') continue;
    const lower = raw.toLowerCase();

    if (lower.includes('perkata')) {
      itemCodes.add('PERKATA');
    } else if (lower.includes('tafsir')) {
      itemCodes.add('TAFSIR');
    } else if (lower.includes('terjemah') && !lower.includes("juz 'amma dan terjemahnya")) {
      itemCodes.add('TERJEMAH');
    } else if (lower.includes('transliterasi')) {
      itemCodes.add('TRANSLITERASI');
    } else if (lower.includes('tajwid')) {
      itemCodes.add('TAJWID');
    } else if (lower.includes('waqaf') || lower.includes('ibtida')) {
      itemCodes.add('WAQAF');
    } else if (lower.includes('qiraat') || lower.includes("qira'at") || lower.includes('qiroat')) {
      itemCodes.add('QIRAAT');
    }
  }

  return Array.from(itemCodes);
}
