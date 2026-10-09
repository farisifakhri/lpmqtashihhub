import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database LPMQ v2.2 ---');

  // 1. Roles
  const rolesData = [
    { code: 'SUPERADMIN', name: 'Administrator Sistem LPMQ' },
    { code: 'HELPER_ADMIN', name: 'Helper Admin LPMQ' },
    { code: 'ADMIN_PENERBIT', name: 'Penerbit / Pemohon Pentashihan' },
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
      roles: ['HELPER_ADMIN', 'PENTASHIH'],
    },
    {
      name: 'Muhammad Zamroni Ahbab, S.S.I., M.Ag. (Akun Pribadi)',
      email: 'zamroni@lpmq.kemenag.go.id',
      nip: '198810302023211018',
      roles: ['HELPER_ADMIN', 'PENTASHIH'],
    },
    {
      name: 'Mustakim, Lc., M.Ag.',
      email: 'mustakim@lpmq.kemenag.go.id',
      nip: '198807152023211024',
      roles: ['HELPER_ADMIN', 'PENTASHIH'],
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
      roles: ['ADMIN_PENERBIT'],
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
    } else {
      // Pastikan peran PENTASHIH juga aktif pada akun yang bersangkutan (peran ganda)
      await prisma.userRole.upsert({
        where: { user_id_role_id: { user_id: pUser.id, role_id: roles['PENTASHIH'].id } },
        update: {},
        create: { user_id: pUser.id, role_id: roles['PENTASHIH'].id },
      });
    }
    allPentashihUsers.push(pUser);
  }
  console.log(`✅ 90 Personil Pentashih resmi LPMQ (SK 2025) berhasil diselaraskan`);

  // Konfigurasi 6 Kelompok Utama (masing-masing 10-11 pentashih)
  const sixGroups = [
    { id: 'kelompok-1', name: 'Kelompok Pentashihan I', leaderIdx: 0, start: 0, end: 11 },
    { id: 'kelompok-2', name: 'Kelompok Pentashihan II', leaderIdx: 15, start: 11, end: 22 },
    { id: 'kelompok-3', name: 'Kelompok Pentashihan III', leaderIdx: 30, start: 22, end: 33 },
    { id: 'kelompok-4', name: 'Kelompok Pentashihan IV', leaderIdx: 45, start: 33, end: 44 },
    { id: 'kelompok-5', name: 'Kelompok Pentashihan V', leaderIdx: 60, start: 44, end: 55 },
    { id: 'kelompok-6', name: 'Kelompok Pentashihan VI', leaderIdx: 75, start: 55, end: 66 },
  ];

  for (const grp of sixGroups) {
    const leader = allPentashihUsers[grp.leaderIdx] || allPentashihUsers[0];
    const distTeam = await prisma.distributionTeam.upsert({
      where: { id: grp.id },
      update: {
        name: grp.name,
        decree_no: 'SK-LPMQ/01/2025',
        year: 2025,
        leader_user_id: leader?.id,
        active_from: new Date('2025-01-01'),
        status: 'ACTIVE',
      },
      create: {
        id: grp.id,
        name: grp.name,
        decree_no: 'SK-LPMQ/01/2025',
        year: 2025,
        leader_user_id: leader?.id,
        active_from: new Date('2025-01-01'),
        status: 'ACTIVE',
      },
    });

    const membersChunk = allPentashihUsers.slice(grp.start, grp.end);
    for (const m of membersChunk) {
      if (m) {
        await prisma.teamMember.upsert({
          where: {
            team_id_user_id: {
              team_id: distTeam.id,
              user_id: m.id,
            },
          },
          update: { role_in_team: m.id === leader?.id ? 'KETUA_KELOMPOK' : 'PENTASHIH' },
          create: {
            team_id: distTeam.id,
            user_id: m.id,
            role_in_team: m.id === leader?.id ? 'KETUA_KELOMPOK' : 'PENTASHIH',
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  // Pertahankan alias default untuk kompatibilitas test lama
  const distributorUser = await prisma.user.findUnique({ where: { email: 'distributor@lpmq.kemenag.go.id' } });
  const pentashihUser = await prisma.user.findUnique({ where: { email: 'pentashih@lpmq.kemenag.go.id' } });
  const defaultTeam = await prisma.distributionTeam.upsert({
    where: { id: 'team-pentashihan-2026-default' },
    update: {
      name: 'Tim Pentashihan Reguler 2026',
      decree_no: 'SK-LPMQ/01/2026',
      year: 2026,
      leader_user_id: distributorUser?.id,
      active_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    },
    create: {
      id: 'team-pentashihan-2026-default',
      name: 'Tim Pentashihan Reguler 2026',
      decree_no: 'SK-LPMQ/01/2026',
      year: 2026,
      leader_user_id: distributorUser?.id,
      active_from: new Date('2026-01-01'),
      status: 'ACTIVE',
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
