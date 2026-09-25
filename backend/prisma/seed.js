import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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
      role: 'SUPERADMIN',
    },
    {
      name: 'Budi Santoso, S.Kom (Helper Admin)',
      email: 'admin.internal@lpmq.kemenag.go.id',
      nip: '198701012015011005',
      role: 'HELPER_ADMIN',
    },
    {
      name: 'Ahmad Verifikator, S.Ag',
      email: 'verifikator@lpmq.kemenag.go.id',
      nip: '198502022010011002',
      role: 'VERIFIKATOR',
    },
    {
      name: 'Ust. H. Mahmud Distributor, M.A',
      email: 'distributor@lpmq.kemenag.go.id',
      nip: '197903032008011003',
      role: 'DISTRIBUTOR',
    },
    {
      name: 'Fahmi Distributor Kedua, S.Th.I',
      email: 'distributor2@lpmq.kemenag.go.id',
      nip: '198404042011011007',
      role: 'DISTRIBUTOR',
    },
    {
      name: 'H. Abdul Qadir Pentashih, Lc',
      email: 'pentashih@lpmq.kemenag.go.id',
      nip: '198804042012011004',
      role: 'PENTASHIH',
    },
    {
      name: 'Siti Dokumentator, S.Hum',
      email: 'dokumentator@lpmq.kemenag.go.id',
      nip: '199205052015012005',
      role: 'DOKUMENTATOR',
    },
    {
      name: 'H. Abdul Aziz Sidqi, M.Ag. (Kepala LPMQ)',
      email: 'kepala@lpmq.kemenag.go.id',
      nip: '197106061998031006',
      role: 'KEPALA_LPMQ',
    },
    {
      name: 'Penerbit PT Mushaf Nusantara Mandiri',
      email: 'penerbit@mushafnusantara.com',
      nip: null,
      role: 'ADMIN_PENERBIT',
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

    // Assign role
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: user.id,
          role_id: roles[u.role].id,
        },
      },
      update: {},
      create: {
        user_id: user.id,
        role_id: roles[u.role].id,
      },
    });

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

  // 6. Distribution Team Sample
  const distributorUser = await prisma.user.findUnique({
    where: { email: 'distributor@lpmq.kemenag.go.id' },
  });
  const pentashihUser = await prisma.user.findUnique({
    where: { email: 'pentashih@lpmq.kemenag.go.id' },
  });

  const team = await prisma.distributionTeam.upsert({
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
          team_id: team.id,
          user_id: pentashihUser.id,
        },
      },
      update: {},
      create: {
        team_id: team.id,
        user_id: pentashihUser.id,
        role_in_team: 'PENTASHIH',
        status: 'ACTIVE',
      },
    });
  }
  console.log('✅ Sample Distribution Team seeded');

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
