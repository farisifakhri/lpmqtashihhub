import { prisma } from '../config/database.js';

/**
 * Service untuk agregat statistik publik di Landing Page.
 * Mengembalikan angka agregat (count) tanpa mengekspos data pengguna atau detail internal.
 */

/**
 * 1. Menghitung total data Surat Tanda Tashih yang sudah resmi terbit.
 * Khusus yang memenuhi kriteria filter/tab "STT Terbit" di modul Pengesahan dan Terbit STT.
 * Mengecualikan status/tab lain: "Siap Draf STT" (READY_FOR_STT), "Proses Paraf/Kepala" (WAITING_TU), dan total "Semua".
 */
export const countIssuedStt = async () => {
  return prisma.registration.count({
    where: {
      OR: [
        { status: { in: ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS'] } },
        {
          official_documents: {
            some: {
              document_type: 'SURAT_TANDA_TASHIH',
              status: 'ISSUED',
            },
          },
        },
      ],
    },
  });
};

/**
 * 2. Menghitung jumlah entitas/nama yang memiliki Role sebagai "Penerbit"
 * dari modul Identitas dan Akses (User Management).
 */
export const countPublishers = async () => {
  return prisma.user.count({
    where: {
      roles: {
        some: {
          role: {
            OR: [
              { code: 'PENERBIT' },
              { name: { contains: 'Penerbit' } },
            ],
          },
        },
      },
    },
  });
};

/**
 * 3. Menghitung jumlah entitas/nama yang memiliki Role sebagai "Pentashih"
 * dari modul Identitas dan Akses (User Management).
 */
export const countPentashih = async () => {
  return prisma.user.count({
    where: {
      roles: {
        some: {
          role: {
            OR: [
              { code: 'PENTASHIH' },
              { name: { contains: 'Pentashih' } },
            ],
          },
        },
      },
    },
  });
};

/**
 * Mengambil ringkasan statistik publik untuk Landing Page.
 * Mengembalikan objek angka agregat saja.
 */
export const getPublicLandingStatistics = async () => {
  const [sttIssuedCount, publisherCount, pentashihCount] = await Promise.all([
    countIssuedStt(),
    countPublishers(),
    countPentashih(),
  ]);

  return {
    stt_issued: sttIssuedCount ?? 0,
    publishers: publisherCount ?? 0,
    pentashih: pentashihCount ?? 0,
    // Alias untuk kompatibilitas camelCase
    sttIssued: sttIssuedCount ?? 0,
    publishersCount: publisherCount ?? 0,
    pentashihCount: pentashihCount ?? 0,
  };
};

export default {
  countIssuedStt,
  countPublishers,
  countPentashih,
  getPublicLandingStatistics,
};
