import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database LPMQ v2.2 ---');

  // 1. Roles
  const rolesData = [
    { code: 'SUPERADMIN', name: 'Administrator Sistem LPMQ' },
    { code: 'ADMIN_INTERNAL', name: 'Admin Internal LPMQ' },
    { code: 'PENERBIT', name: 'Penerbit' },
    { code: 'VERIFIKATOR', name: 'Verifikator Berkas & Naskah' },
    { code: 'DISTRIBUTOR', name: 'Distributor Naskah Pentashihan' },
    { code: 'PENTASHIH', name: 'Pentashih / Pembaca Naskah' },
    { code: 'DOKUMENTATOR', name: 'Dokumentator Mushaf' },
    { code: 'KEPALA_LPMQ', name: 'Kepala LPMQ Kemenag RI' },
  ];

  const roles = {};
  for (const r of rolesData) {
    roles[r.code] = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: r,
    });
  }
  console.log('✅ Roles seeded');

  // 2. Users & Passwords
  const isProduction = process.env.NODE_ENV === 'production';
  let seedPassword = process.env.SEED_DEFAULT_PASSWORD;

  if (isProduction && !seedPassword) {
    throw new Error('FATAL: SEED_DEFAULT_PASSWORD environment variable wajib ditentukan saat seeding di environment production!');
  }

  if (!seedPassword) {
    seedPassword = 'password123';
    console.warn('⚠️  PERINGATAN: Menggunakan password seed bawaan ("password123") untuk development. Ganti sebelum deployment.');
  }

  const passwordHash = await bcrypt.hash(seedPassword, 10);

  const usersData = [
    {
      name: 'Super Admin LPMQ',
      email: 'admin@lpmq.kemenag.go.id',
      nip: '198001012005011001',
      roles: ['SUPERADMIN'],
    },
    {
      name: 'Muhammad Zamroni Ahbab, S.S.I., M.Ag.',
      email: 'admin.internal@lpmq.kemenag.go.id',
      nip: '198810302023211018',
      roles: ['ADMIN_INTERNAL'],
    },
    {
      name: 'Mustakim, Lc., M.Ag.',
      email: 'mustakim@lpmq.kemenag.go.id',
      nip: '198807152023211024',
      roles: ['ADMIN_INTERNAL'],
    },
    {
      name: 'Ahmad Falahudin, S.S',
      email: 'verifikator@lpmq.kemenag.go.id',
      nip: '199409252022031001',
      roles: ['VERIFIKATOR', 'PENTASHIH'],
    },
    {
      name: 'Umi Masruroh, S.Ag',
      email: 'distributor@lpmq.kemenag.go.id',
      nip: '198912062022032001',
      roles: ['DISTRIBUTOR', 'PENTASHIH'],
    },
    {
      name: 'Dr. H. Deni Hudaeny A. Arifin, Lc. MA',
      email: 'distributor2@lpmq.kemenag.go.id',
      nip: '197907272002121008',
      roles: ['DISTRIBUTOR', 'PENTASHIH'],
    },
    {
      name: 'Dr. H. Ahmad Badruddin, Lc. M.A',
      email: 'pentashih@lpmq.kemenag.go.id',
      nip: '197411202009011006',
      roles: ['PENTASHIH'],
    },
    {
      name: 'Hj. Tuti Nurkhayati, S.H.I, M.A',
      email: 'dokumentator@lpmq.kemenag.go.id',
      nip: '197311032009012002',
      roles: ['DOKUMENTATOR', 'PENTASHIH'],
    },
    {
      name: 'H. Abdul Aziz Sidqi, M.Ag. (Kepala LPMQ)',
      email: 'kepala@lpmq.kemenag.go.id',
      nip: '197106061998031006',
      roles: ['KEPALA_LPMQ'],
    },
    {
      name: 'Penerbit PT Mushaf Nusantara Mandiri',
      email: 'penerbit@mushafnusantara.com',
      nip: null,
      roles: ['PENERBIT'],
      publisher: {
        legal_name: 'PT Mushaf Nusantara Mandiri',
        entity_type: 'PT',
        verification_status: 'VERIFIED',
        address: 'Jl. Percetakan Al-Qur\'an No. 12, Jakarta Timur',
        phone: '021-87654321',
      },
    },
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      // Jangan menimpa password_hash akun yang sudah ada saat re-seed
      update: { name: u.name, nip: u.nip, status: 'ACTIVE' },
      create: {
        name: u.name,
        email: u.email,
        nip: u.nip,
        password_hash: passwordHash,
        status: 'ACTIVE',
      },
    });

    // Assign roles (mendukung peran ganda sesuai struktur personil LPMQ)
    const assignedRoleCodes = u.roles || (u.role ? [u.role] : []);
    for (const rCode of assignedRoleCodes) {
      if (roles[rCode]) {
        await prisma.userRole.upsert({
          where: {
            user_id_role_id: {
              user_id: user.id,
              role_id: roles[rCode].id,
            },
          },
          update: {},
          create: {
            user_id: user.id,
            role_id: roles[rCode].id,
          },
        });
      }
    }

    // Publisher profile if applicable
    if (u.publisher) {
      await prisma.publisher.upsert({
        where: { user_id: user.id },
        update: u.publisher,
        create: {
          ...u.publisher,
          user_id: user.id,
        },
      });
    }
  }
  console.log('✅ Users & Roles assigned');

  // 3. Mushaf Categories
  const categoriesData = [
    { code: 'MC', name: 'Mushaf Cetak', display_order: 1 },
    { code: 'MD', name: 'Mushaf Digital', display_order: 2 },
    { code: 'MAV', name: 'Mushaf Audio/Visual', display_order: 3 },
    { code: 'L', name: 'Lainnya', display_order: 4 },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    categories[cat.code] = await prisma.mushafCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, display_order: cat.display_order },
      create: { ...cat, status: 'ACTIVE' },
    });
  }
  console.log('✅ Mushaf Categories seeded');

  // 4. 17 Service Types & Official SLA (SRS v2.2 §9.2)
  const serviceTypesData = [
    { cat: 'MC', name: 'Mushaf Al-Qur\'an 30 Juz', kind: 'CETAK', fee: 1000000, init: 15, rev: 7, dum: 3 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an dan Terjemahnya', kind: 'CETAK', fee: 1000000, init: 22, rev: 12, dum: 7 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an Tajwid Warna/Kode Tajwid', kind: 'CETAK', fee: 1000000, init: 22, rev: 12, dum: 7 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an Waqaf Ibtida\'', kind: 'CETAK', fee: 1000000, init: 22, rev: 12, dum: 7 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an Qiraat', kind: 'CETAK', fee: 1000000, init: 22, rev: 12, dum: 7 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an Transliterasi', kind: 'CETAK', fee: 1000000, init: 22, rev: 12, dum: 7 },
    { cat: 'MAV', name: 'Al-Qur\'an Audio/Visual', kind: 'AUDIO_VISUAL', fee: 1000000, init: 30, rev: 15, dum: 7 },
    { cat: 'MD', name: 'Mushaf Al-Qur\'an Digital', kind: 'DIGITAL', fee: 1000000, init: 15, rev: 7, dum: 3 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an Terjemah Perkata', kind: 'CETAK', fee: 1000000, init: 45, rev: 22, dum: 12 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an dan Tafsirnya', kind: 'CETAK', fee: 1000000, init: 45, rev: 22, dum: 12 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an Luar Negeri', kind: 'CETAK', fee: 1000000, init: 15, rev: 7, dum: 3 },
    { cat: 'MC', name: 'Mushaf Al-Qur\'an Braille', kind: 'BRAILLE', fee: 0, init: 60, rev: 30, dum: 15 },
    { cat: 'L', name: 'Surah Yasin dan Bacaan Tahlil', kind: 'CETAK', fee: 500000, init: 5, rev: 2, dum: 1 },
    { cat: 'L', name: 'Juz \'Amma dan Terjemahnya', kind: 'CETAK', fee: 500000, init: 5, rev: 2, dum: 1 },
    { cat: 'L', name: 'Majmu\' Syarif', kind: 'CETAK', fee: 500000, init: 5, rev: 2, dum: 1 },
    { cat: 'L', name: 'Metode Baca Tulis Al-Qur\'an', kind: 'CETAK', fee: 500000, init: 15, rev: 7, dum: 3 },
    { cat: 'L', name: 'Kaligrafi', kind: 'CETAK', fee: 500000, init: 3, rev: 2, dum: 1 },
  ];

  for (const st of serviceTypesData) {
    const existing = await prisma.serviceType.findFirst({
      where: { name: st.name },
    });

    if (existing) {
      await prisma.serviceType.update({
        where: { id: existing.id },
        data: {
          category_id: categories[st.cat].id,
          service_kind: st.kind,
          base_fee: st.fee,
          duration_initial: st.init,
          duration_revision: st.rev,
          duration_dummy: st.dum,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.serviceType.create({
        data: {
          category_id: categories[st.cat].id,
          name: st.name,
          service_kind: st.kind,
          base_fee: st.fee,
          duration_initial: st.init,
          duration_revision: st.rev,
          duration_dummy: st.dum,
          status: 'ACTIVE',
        },
      });
    }
  }
  console.log('✅ 17 Service Types & SLAs seeded');

  // 5. Service Addons (SRS v2.2 §9.3)
  const addonsData = [
    { code: 'TAR-BRAILLE', name: 'Mushaf Al-Qur\'an Braille', fee: 0 },
    { code: 'TAR-PENDEK', name: 'Kaligrafi, Juz \'Amma/surah-surah pendek', fee: 500000 },
    { code: 'TAR-MUSHAF', name: 'Mushaf Al-Qur\'an', fee: 1000000 },
    { code: 'ADD-MATERI', name: 'Tambahan materi selain konten ayat', fee: 500000 },
  ];

  for (const add of addonsData) {
    await prisma.serviceAddon.upsert({
      where: { code: add.code },
      update: { name: add.name, fee: add.fee, status: 'ACTIVE' },
      create: { ...add, status: 'ACTIVE' },
    });
  }
  console.log('✅ Service Addons seeded');

  // 5b. 16 Master Items Jenis Naskah (B-01 §4)
  const jenisNaskahItemsData = [
    // Kelompok 1 & 2: Item Dasar (tepat satu per naskah)
    {
      code: 'JUZ30',
      name: "Al-Qur'an 30 Juz",
      group_number: 1,
      role: 'DASAR',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 1000000,
      duration_initial: 15,
      duration_revision: 7,
      duration_dummy: 3,
      covers_item_code: null,
    },
    {
      code: 'YASIN',
      name: 'Surah Yasin dan Bacaan Tahlil',
      group_number: 1,
      role: 'DASAR',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 5,
      duration_revision: 2,
      duration_dummy: 1,
      covers_item_code: null,
    },
    {
      code: 'AMMA',
      name: "Juz 'Amma dan Terjemahnya",
      group_number: 1,
      role: 'DASAR',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 5,
      duration_revision: 2,
      duration_dummy: 1,
      covers_item_code: null,
    },
    {
      code: 'MAJMU',
      name: "Majmu' Syarif",
      group_number: 1,
      role: 'DASAR',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 5,
      duration_revision: 2,
      duration_dummy: 1,
      covers_item_code: null,
    },
    {
      code: 'KALIGRAFI',
      name: 'Kaligrafi',
      group_number: 1,
      role: 'DASAR',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 3,
      duration_revision: 2,
      duration_dummy: 1,
      covers_item_code: null,
    },
    {
      code: 'METODE',
      name: "Metode Baca Tulis Al-Qur'an",
      group_number: 1,
      role: 'DASAR',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 15,
      duration_revision: 7,
      duration_dummy: 3,
      covers_item_code: null,
    },
    {
      code: 'AV',
      name: 'Audio/Visual',
      group_number: 2,
      role: 'DASAR',
      service_kind: 'AUDIO_VISUAL',
      unit_fee_rate: 1,
      fee_per_unit: 1000000,
      duration_initial: 30,
      duration_revision: 15,
      duration_dummy: 7,
      covers_item_code: null,
    },
    {
      code: 'DIGITAL',
      name: 'Digital',
      group_number: 2,
      role: 'DASAR',
      service_kind: 'DIGITAL',
      unit_fee_rate: 1,
      fee_per_unit: 1000000,
      duration_initial: 15,
      duration_revision: 7,
      duration_dummy: 3,
      covers_item_code: null,
    },
    {
      code: 'BRAILLE',
      name: 'Mushaf Standar Braille',
      group_number: 1,
      role: 'DASAR',
      service_kind: 'BRAILLE',
      unit_fee_rate: 0,
      fee_per_unit: 0,
      duration_initial: 60,
      duration_revision: 30,
      duration_dummy: 15,
      covers_item_code: null,
    },

    // Kelompok 3: Item Tambahan (boleh lebih dari satu)
    {
      code: 'TERJEMAH',
      name: 'Terjemah',
      group_number: 3,
      role: 'TAMBAHAN',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 7,
      duration_revision: 5,
      duration_dummy: 4,
      covers_item_code: null,
    },
    {
      code: 'TRANSLITERASI',
      name: 'Transliterasi',
      group_number: 3,
      role: 'TAMBAHAN',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 7,
      duration_revision: 5,
      duration_dummy: 4,
      covers_item_code: null,
    },
    {
      code: 'TAJWID',
      name: 'Tajwid Warna / Kode Tajwid',
      group_number: 3,
      role: 'TAMBAHAN',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 7,
      duration_revision: 5,
      duration_dummy: 4,
      covers_item_code: null,
    },
    {
      code: 'WAQAF',
      name: "Waqaf Ibtida'",
      group_number: 3,
      role: 'TAMBAHAN',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 7,
      duration_revision: 5,
      duration_dummy: 4,
      covers_item_code: null,
    },
    {
      code: 'QIRAAT',
      name: 'Qiraat',
      group_number: 3,
      role: 'TAMBAHAN',
      service_kind: 'CETAK',
      unit_fee_rate: 1,
      fee_per_unit: 500000,
      duration_initial: 7,
      duration_revision: 5,
      duration_dummy: 4,
      covers_item_code: null,
    },
    {
      code: 'PERKATA',
      name: 'Terjemah/Transliterasi Perkata',
      group_number: 3,
      role: 'TAMBAHAN',
      service_kind: 'CETAK',
      unit_fee_rate: 2,
      fee_per_unit: 500000,
      duration_initial: 30,
      duration_revision: 15,
      duration_dummy: 9,
      covers_item_code: 'TERJEMAH',
    },
    {
      code: 'TAFSIR',
      name: 'Tafsir',
      group_number: 3,
      role: 'TAMBAHAN',
      service_kind: 'CETAK',
      unit_fee_rate: 2,
      fee_per_unit: 500000,
      duration_initial: 30,
      duration_revision: 15,
      duration_dummy: 9,
      covers_item_code: 'TERJEMAH',
    },
  ];

  for (const item of jenisNaskahItemsData) {
    await prisma.jenisNaskahItem.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        group_number: item.group_number,
        role: item.role,
        service_kind: item.service_kind,
        unit_fee_rate: item.unit_fee_rate,
        fee_per_unit: item.fee_per_unit,
        duration_initial: item.duration_initial,
        duration_revision: item.duration_revision,
        duration_dummy: item.duration_dummy,
        covers_item_code: item.covers_item_code,
        status: 'ACTIVE',
      },
      create: { ...item, status: 'ACTIVE' },
    });
  }
  console.log('✅ 16 Jenis Naskah Master Items seeded');

  // 6. 90 Pentashih Roster & 6 Kelompok Utama (SK LPMQ 2025)
  const rosterFile = new URL('./pentashih-roster-2025.json', import.meta.url);
  const rosterData = JSON.parse(await readFile(rosterFile, 'utf-8'));
  const allPentashihUsers = [];

  for (const person of rosterData) {
    const cleanNip = person.nip.replace(/\s+/g, '');
    let pUser = await prisma.user.findFirst({
      where: {
        OR: [
          { nip: cleanNip },
          { name: person.name },
        ],
      },
    });

    if (!pUser) {
      const emailSlug = person.name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').slice(0, 30);
      const email = `${emailSlug}@pentashih.lpmq.go.id`;
      pUser = await prisma.user.upsert({
        where: { email },
        update: { name: person.name, nip: cleanNip, status: 'ACTIVE' },
        create: {
          name: person.name,
          email,
          nip: cleanNip,
          password_hash: passwordHash,
          status: 'ACTIVE',
        },
      });
      await prisma.userRole.upsert({
        where: { user_id_role_id: { user_id: pUser.id, role_id: roles['PENTASHIH'].id } },
        update: {},
        create: { user_id: pUser.id, role_id: roles['PENTASHIH'].id },
      });
    } else if (!person.is_admin_internal) {
      // Pastikan peran PENTASHIH juga aktif pada akun yang bersangkutan (peran ganda untuk verifikator, distributor, dokumentator)
      await prisma.userRole.upsert({
        where: { user_id_role_id: { user_id: pUser.id, role_id: roles['PENTASHIH'].id } },
        update: {},
        create: { user_id: pUser.id, role_id: roles['PENTASHIH'].id },
      });
    }
    allPentashihUsers.push(pUser);
  }
  console.log(`✅ 90 Personil Pentashih resmi LPMQ (SK 2025) berhasil diselaraskan`);

  // 5b. Seed the 6 Parallel Pentashih Groups (SK Pembagian Kelompok Kerja Pentashihan - CPNS 2025)
  const cpns2025GroupRoster = [
    {
      id: 'kelompok-1',
      name: 'Kelompok Pentashihan I',
      members: [
        'Nur Azka Inayatussahara',
        'Ahmad Jauhari Abbas',
        'Saiful Akmal',
        'Aisyah',
        'Ahmad Hariyanto',
        'Fikri Mustofa',
        'Ida Nur Laila Sari',
        'Ismail Reza Anggara',
        'Anisa Resti Damayanti',
        'Sakinah Nst',
        'Solihin', // Cadangan/rotasi (*)
      ],
    },
    {
      id: 'kelompok-2',
      name: 'Kelompok Pentashihan II',
      members: [
        'Siti Iyam Muslimah',
        'Muhammad Syafqy Abda',
        'Muhammad Addien Nastiar',
        'Aufa Aqiq Filosofi',
        'Muhamad Rizki Ridho',
        "Muhamad A'thoillah Mubarok",
        'Siti Nur Ismah',
        'Firda Sholihah',
        'Tammiya Nurfuadi',
        'Indah Rhowdlotul Jannah',
        'Ilhamani', // Cadangan/rotasi (*)
      ],
    },
    {
      id: 'kelompok-3',
      name: 'Kelompok Pentashihan III',
      members: [
        'Abdul Wahid',
        'Septia Aisyah Rusda',
        'Munafisah',
        'Rafi Dinilhaq',
        'Muhammad Ilham Mursyid',
        'Tamama Zuhriyah',
        'Bayu Muhammad',
        'Vina Hidayati',
        'Shera Diva Zahiyah',
        'Inayah Nur Wafiq',
      ],
    },
    {
      id: 'kelompok-4',
      name: 'Kelompok Pentashihan IV',
      members: [
        'Minnatul Maula',
        'Muhammad Ibnu Abbas',
        'Raziq Ahmadi',
        'Fathy Fatullah Muchtar',
        'Muhammad Azhar Fuadi',
        'Mohammad Iqbal Muadzin',
        'Iqbal Hayyis Surur',
        'Himmah Aliyah',
        "Ra'yal Aidin Al Fadhli",
        'Ali Mustawa Ritonga',
      ],
    },
    {
      id: 'kelompok-5',
      name: 'Kelompok Pentashihan V',
      members: [
        'Ami Muftil Anami',
        'Ahmad Akmal Mujaddid',
        'Ali Fitriana Rahmat',
        'Lalu Nuzul Ilham Hadi',
        'Ayun Matsani Rizki Syauqi',
        'Muhamad Hasin Tuba',
        'Hairatu Saleha',
        'Alya Izzat Mulyadi Razak',
        'Afrokhul Banat',
        'Alkurni Isnaeni',
      ],
    },
    {
      id: 'kelompok-6',
      name: 'Kelompok Pentashihan VI',
      members: [
        'Fuadiyati Firdausiana',
        'Maria Ulfah',
        'Mohammad Adi Junanto',
        'Salaful Amin',
        'Meyke Alif Alviani',
        'Muhammad Azzam',
        'Ivva Amalia',
        'Siti Aisyah Fatihaturrizqiyah',
        'Syifa Nasibah Mujahidah',
        'Haiva Satriana Zahrah Siregar',
      ],
    },
  ];

  // Helper normalisasi nama untuk pencocokan dengan pentashih-roster-2025.json
  const normalizeName = (str) =>
    str
      .toLowerCase()
      .replace(/\b(dr|dra|drs|h|hj)\.?\s+/gi, '')
      .replace(/['’`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  for (const grp of cpns2025GroupRoster) {
    const matchedMembers = grp.members
      .map((targetName) => {
        const normTarget = normalizeName(targetName);
        return allPentashihUsers.find((u) => {
          const normUser = normalizeName(u.name);
          return normUser === normTarget || normUser.startsWith(normTarget) || normTarget.startsWith(normUser);
        });
      })
      .filter(Boolean);

    const leaderUser = matchedMembers[0] || allPentashihUsers[0];

    const distTeam = await prisma.distributionTeam.upsert({
      where: { id: grp.id },
      update: {
        name: grp.name,
        decree_no: 'SK-LPMQ/01/2025',
        year: 2025,
        leader_user_id: leaderUser?.id,
        active_from: new Date('2025-01-01'),
        status: 'ACTIVE',
      },
      create: {
        id: grp.id,
        name: grp.name,
        decree_no: 'SK-LPMQ/01/2025',
        year: 2025,
        leader_user_id: leaderUser?.id,
        active_from: new Date('2025-01-01'),
        status: 'ACTIVE',
      },
    });

    // Bersihkan anggota lama di kelompok ini agar tidak tercampur hasil slice() sebelumnya
    await prisma.teamMember.deleteMany({
      where: { team_id: grp.id },
    });

    for (const memberUser of matchedMembers) {
      await prisma.teamMember.upsert({
        where: {
          team_id_user_id: {
            team_id: grp.id,
            user_id: memberUser.id,
          },
        },
        update: {
          role_in_team: memberUser.id === leaderUser?.id ? 'KETUA_KELOMPOK' : 'PENTASHIH',
          status: 'ACTIVE',
        },
        create: {
          team_id: grp.id,
          user_id: memberUser.id,
          role_in_team: memberUser.id === leaderUser?.id ? 'KETUA_KELOMPOK' : 'PENTASHIH',
          status: 'ACTIVE',
        },
      });
    }
  }

  // Pertahankan alias default untuk arsip riwayat lama (status INACTIVE agar tidak muncul di form baru)
  const distributorUser = await prisma.user.findUnique({ where: { email: 'distributor@lpmq.kemenag.go.id' } });
  const pentashihUser = await prisma.user.findUnique({ where: { email: 'pentashih@lpmq.kemenag.go.id' } });
  const defaultTeam = await prisma.distributionTeam.upsert({
    where: { id: 'team-pentashihan-2026-default' },
    update: {
      name: 'Tim Pentashihan Reguler 2026 (Legacy)',
      decree_no: 'SK-LPMQ/01/2026',
      year: 2026,
      leader_user_id: distributorUser?.id,
      active_from: new Date('2026-01-01'),
      status: 'INACTIVE',
    },
    create: {
      id: 'team-pentashihan-2026-default',
      name: 'Tim Pentashihan Reguler 2026 (Legacy)',
      decree_no: 'SK-LPMQ/01/2026',
      year: 2026,
      leader_user_id: distributorUser?.id,
      active_from: new Date('2026-01-01'),
      status: 'INACTIVE',
    },
  });

  if (pentashihUser) {
    await prisma.teamMember.upsert({
      where: {
        team_id_user_id: {
          team_id: defaultTeam.id,
          user_id: pentashihUser.id,
        },
      },
      update: {},
      create: {
        team_id: defaultTeam.id,
        user_id: pentashihUser.id,
        role_in_team: 'PENTASHIH',
        status: 'ACTIVE',
      },
    });

    // Pastikan akun demo pentashih (pentashih@lpmq.kemenag.go.id) juga aktif di Kelompok 1 untuk pengujian alur penugasan & demo
    await prisma.teamMember.upsert({
      where: {
        team_id_user_id: {
          team_id: 'kelompok-1',
          user_id: pentashihUser.id,
        },
      },
      update: { role_in_team: 'PENTASHIH', status: 'ACTIVE' },
      create: {
        team_id: 'kelompok-1',
        user_id: pentashihUser.id,
        role_in_team: 'PENTASHIH',
        status: 'ACTIVE',
      },
    });
  }
  console.log('✅ 6 Kelompok Utama & Default Distribution Team seeded');

  // 7. Working Days (Official Calendar for SLA - SKB 3 Menteri 2026)
  const officialHolidays2026 = {
    '2026-01-01': 'Libur Nasional: Tahun Baru 2026 Masehi',
    '2026-01-16': 'Libur Nasional: Isra Mikraj Nabi Muhammad S.A.W.',
    '2026-02-16': 'Cuti Bersama: Tahun Baru Imlek 2577 Kongzili',
    '2026-02-17': 'Libur Nasional: Tahun Baru Imlek 2577 Kongzili',
    '2026-03-18': 'Cuti Bersama: Hari Suci Nyepi (Tahun Baru Saka 1948)',
    '2026-03-19': 'Libur Nasional: Hari Suci Nyepi (Tahun Baru Saka 1948)',
    '2026-03-20': 'Cuti Bersama: Idul Fitri 1447 Hijriah',
    '2026-03-21': 'Libur Nasional: Idul Fitri 1447 Hijriah',
    '2026-03-22': 'Libur Nasional: Idul Fitri 1447 Hijriah',
    '2026-03-23': 'Cuti Bersama: Idul Fitri 1447 Hijriah',
    '2026-03-24': 'Cuti Bersama: Idul Fitri 1447 Hijriah',
    '2026-04-03': 'Libur Nasional: Wafat Yesus Kristus',
    '2026-04-05': 'Libur Nasional: Kebangkitan Yesus Kristus (Paskah)',
    '2026-05-01': 'Libur Nasional: Hari Buruh Internasional',
    '2026-05-14': 'Libur Nasional: Kenaikan Yesus Kristus',
    '2026-05-15': 'Cuti Bersama: Kenaikan Yesus Kristus',
    '2026-05-27': 'Libur Nasional: Idul Adha 1447 Hijriah',
    '2026-05-28': 'Cuti Bersama: Idul Adha 1447 Hijriah',
    '2026-05-31': 'Libur Nasional: Hari Raya Waisak 2570 BE',
    '2026-06-01': 'Libur Nasional: Hari Lahir Pancasila',
    '2026-06-16': 'Libur Nasional: 1 Muharam Tahun Baru Islam 1448 Hijriah',
    '2026-08-17': 'Libur Nasional: Proklamasi Kemerdekaan RI',
    '2026-08-25': 'Libur Nasional: Maulid Nabi Muhammad S.A.W.',
    '2026-12-24': 'Cuti Bersama: Kelahiran Yesus Kristus',
    '2026-12-25': 'Libur Nasional: Kelahiran Yesus Kristus',
  };

  const startDate = new Date('2025-01-01T00:00:00.000Z');
  const endDate = new Date('2027-12-31T00:00:00.000Z');
  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayOfWeek = d.getUTCDay(); // 0 = Sun, 6 = Sat
    const dateStr = d.toISOString().slice(0, 10);
    const holidayDesc = officialHolidays2026[dateStr];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWorking = !isWeekend && !holidayDesc;

    days.push({
      date: new Date(d),
      is_working_day: isWorking,
      source: 'SKB_3_MENTERI',
      description: holidayDesc || (isWeekend ? 'Akhir Pekan' : 'Hari Kerja Reguler'),
    });
  }
  await prisma.workingDay.createMany({
    data: days,
    skipDuplicates: true,
  });
  console.log('✅ Working Days seeded (termasuk Libur Nasional & Cuti Bersama SKB 3 Menteri 2026)');

  console.log('--- Seeding Selesai Sukses! ---');
}

main()
  .catch((e) => {
    console.error('Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
