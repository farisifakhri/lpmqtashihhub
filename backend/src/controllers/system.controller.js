import { prisma } from '../config/database.js';

/**
 * Controller untuk diagnostik sistem, pemeriksaan kesehatan BE dan DB (MySQL Laragon)
 */
export const getHealth = async (req, res, next) => {
  const startTime = Date.now();
  let dbStatus = 'DISCONNECTED';
  let dbLatency = null;
  let dbError = null;

  try {
    const dbCheckStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbCheckStart;
    dbStatus = 'CONNECTED';
  } catch (err) {
    dbError = err.message;
  }

  const isHealthy = dbStatus === 'CONNECTED';
  const totalLatency = Date.now() - startTime;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'UP' : 'DEGRADED',
    system: 'LPMQ Backend API',
    version: '2.2.0',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    latency_ms: totalLatency,
    database: {
      provider: 'mysql',
      database_name: 'lpmq_db',
      status: dbStatus,
      latency_ms: dbLatency,
      error: dbError,
    },
  });
};

/**
 * Mengambil ringkasan jumlah baris data di tabel-tabel utama LPMQ
 */
export const getTableCounts = async (req, res, next) => {
  try {
    const startTime = Date.now();

    const [
      users,
      roles,
      publishers,
      mushafCategories,
      serviceTypes,
      serviceAddons,
      distributionTeams,
      registrations,
      statusHistories,
      verificationAssignments,
      paymentRecords,
      assignments,
      tashihReviews,
      officialDocuments,
      auditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.publisher.count(),
      prisma.mushafCategory.count(),
      prisma.serviceType.count(),
      prisma.serviceAddon.count(),
      prisma.distributionTeam.count(),
      prisma.registration.count(),
      prisma.statusHistory.count(),
      prisma.verificationAssignment.count(),
      prisma.paymentRecord.count(),
      prisma.assignment.count(),
      prisma.tashihReview.count(),
      prisma.officialDocument.count(),
      prisma.auditLog.count(),
    ]);

    const queryLatency = Date.now() - startTime;

    res.status(200).json({
      success: true,
      query_latency_ms: queryLatency,
      database: 'lpmq_db',
      counts: {
        users,
        roles,
        publishers,
        mushaf_categories: mushafCategories,
        service_types: serviceTypes,
        service_addons: serviceAddons,
        distribution_teams: distributionTeams,
        registrations,
        status_histories: statusHistories,
        verification_assignments: verificationAssignments,
        payment_records: paymentRecords,
        assignments,
        tashih_reviews: tashihReviews,
        official_documents: officialDocuments,
        audit_logs: auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mengambil detail diagnostik dan sampel data untuk modul tertentu
 */
export const getModuleDiagnostics = async (req, res, next) => {
  const { module } = req.params;
  const upperCode = (module || '').toUpperCase();

  try {
    const startTime = Date.now();
    let moduleData = {
      module_code: upperCode,
      tables: [],
      sample_records: [],
      endpoints: [],
      rbac_roles: [],
    };

    switch (upperCode) {
      case 'MST-01':
      case 'MST':
      case 'MASTER': {
        const [categories, serviceTypes, addons] = await Promise.all([
          prisma.mushafCategory.count(),
          prisma.serviceType.count(),
          prisma.serviceAddon.count(),
        ]);
        const sample = await prisma.serviceType.findMany({
          take: 5,
          include: { category: { select: { code: true, name: true } } },
          orderBy: { created_at: 'desc' },
        });

        moduleData = {
          module_code: 'MST-01',
          name: 'Master Data & Pengaturan Tarif',
          sprint: 'Sprint 1',
          tables: [
            { name: 'mushaf_categories', row_count: categories, status: 'READY' },
            { name: 'service_types', row_count: serviceTypes, status: 'READY' },
            { name: 'service_addons', row_count: addons, status: 'READY' },
          ],
          endpoints: [
            { method: 'GET', path: '/api/v1/master/categories', desc: 'Daftar Kategori Naskah' },
            { method: 'GET', path: '/api/v1/master/service-types', desc: '17 Profil Layanan & Tarif' },
            { method: 'GET', path: '/api/v1/master/addons', desc: 'Layanan Tambahan (Addon)' },
            { method: 'GET', path: '/api/v1/master/distribution-teams', desc: 'SK Tim Distribusi' },
          ],
          rbac_roles: ['SUPERADMIN'],
          sample_records: sample,
        };
        break;
      }

      case 'REG-02':
      case 'REG':
      case 'REGISTRATIONS': {
        const [regCount, historyCount] = await Promise.all([
          prisma.registration.count(),
          prisma.statusHistory.count(),
        ]);
        const sample = await prisma.registration.findMany({
          take: 5,
          include: {
            publisher: { select: { legal_name: true } },
            service_type: { select: { name: true, service_kind: true } },
          },
          orderBy: { created_at: 'desc' },
        });

        moduleData = {
          module_code: 'REG-02',
          name: 'Daftar Riwayat Pengajuan Naskah',
          sprint: 'Sprint 2',
          tables: [
            { name: 'registrations', row_count: regCount, status: 'READY' },
            { name: 'status_histories', row_count: historyCount, status: 'READY' },
          ],
          endpoints: [
            { method: 'GET', path: '/api/v1/registrations', desc: 'Daftar Pengajuan dengan Filter & Search' },
            { method: 'GET', path: '/api/v1/registrations/:id', desc: 'Detail Pengajuan & Timeline' },
            { method: 'POST', path: '/api/v1/registrations', desc: 'Buat Draf Pengajuan Baru' },
            { method: 'POST', path: '/api/v1/registrations/:id/submit', desc: 'Submit ke Verifikasi' },
          ],
          rbac_roles: ['ADMIN_PENERBIT', 'SUPERADMIN'],
          sample_records: sample,
        };
        break;
      }

      case 'VER-01':
      case 'VER':
      case 'VERIFICATION': {
        const [waitingVerif, inVerif, assignmentCount] = await Promise.all([
          prisma.registration.count({ where: { status: 'READY_FOR_VERIFICATION' } }),
          prisma.registration.count({ where: { status: 'IN_VERIFICATION' } }),
          prisma.verificationAssignment.count(),
        ]);
        const sample = await prisma.registration.findMany({
          where: { status: { in: ['READY_FOR_VERIFICATION', 'IN_VERIFICATION', 'WAITING_VERIFICATION_APPROVAL'] } },
          take: 5,
          include: {
            publisher: { select: { legal_name: true } },
            service_type: { select: { name: true } },
          },
          orderBy: { updated_at: 'desc' },
        });

        moduleData = {
          module_code: 'VER-01',
          name: 'Antrean Verifikasi Administrasi & Naskah',
          sprint: 'Sprint 2',
          tables: [
            { name: 'verification_assignments', row_count: assignmentCount, status: 'READY' },
            { name: 'registrations (Antrean)', row_count: waitingVerif + inVerif, status: 'READY' },
          ],
          endpoints: [
            { method: 'GET', path: '/api/v1/registrations?status=READY_FOR_VERIFICATION', desc: 'Antrean Naskah Masuk' },
            { method: 'PATCH', path: '/api/v1/registrations/:id/status', desc: 'Transisi Status Verifikasi' },
          ],
          rbac_roles: ['VERIFIKATOR', 'SUPERADMIN'],
          sample_records: sample,
        };
        break;
      }

      case 'PAY-01':
      case 'PAY':
      case 'BILLING': {
        const [awaitingPay, payRecords] = await Promise.all([
          prisma.registration.count({ where: { status: { in: ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'] } } }),
          prisma.paymentRecord.count(),
        ]);
        const sample = await prisma.registration.findMany({
          where: { status: { in: ['AWAITING_PAYMENT', 'PAYMENT_VERIFICATION'] } },
          take: 5,
          include: {
            publisher: { select: { legal_name: true } },
            service_type: { select: { name: true, base_fee: true } },
          },
        });

        moduleData = {
          module_code: 'PAY-01',
          name: 'Billing PNBP & Riwayat Pembayaran',
          sprint: 'Sprint 3',
          tables: [
            { name: 'payment_records', row_count: payRecords, status: 'READY' },
            { name: 'registrations (Menunggu Bayar)', row_count: awaitingPay, status: 'READY' },
          ],
          endpoints: [
            { method: 'GET', path: '/api/v1/registrations?status=AWAITING_PAYMENT', desc: 'Daftar Tagihan PNBP' },
            { method: 'PATCH', path: '/api/v1/registrations/:id/status', desc: 'Konfirmasi Verifikasi Pembayaran' },
          ],
          rbac_roles: ['ADMIN_PENERBIT', 'SUPERADMIN', 'VERIFIKATOR'],
          sample_records: sample,
        };
        break;
      }

      case 'DIS-01':
      case 'DIS':
      case 'DISTRIBUTION': {
        const [waitingDist, teamsCount, assignmentsCount] = await Promise.all([
          prisma.registration.count({ where: { status: 'WAITING_DISTRIBUTION' } }),
          prisma.distributionTeam.count(),
          prisma.assignment.count(),
        ]);
        const sample = await prisma.distributionTeam.findMany({
          take: 5,
          include: {
            leader: { select: { name: true, nip: true } },
            members: { include: { user: { select: { name: true } } } },
          },
        });

        moduleData = {
          module_code: 'DIS-01',
          name: 'Distribusi & Penugasan Tim Pentashih',
          sprint: 'Sprint 3',
          tables: [
            { name: 'distribution_teams', row_count: teamsCount, status: 'READY' },
            { name: 'assignments', row_count: assignmentsCount, status: 'READY' },
            { name: 'registrations (Siap Distribusi)', row_count: waitingDist, status: 'READY' },
          ],
          endpoints: [
            { method: 'GET', path: '/api/v1/master/distribution-teams', desc: 'Daftar Tim SK Aktif' },
            { method: 'GET', path: '/api/v1/registrations?status=WAITING_DISTRIBUTION', desc: 'Naskah Siap Sidang' },
          ],
          rbac_roles: ['DISTRIBUTOR', 'SUPERADMIN'],
          sample_records: sample,
        };
        break;
      }

      case 'TSH-01':
      case 'TSH':
      case 'TASHIH': {
        const [inTashih, reviewsCount, assignmentsCount] = await Promise.all([
          prisma.registration.count({ where: { status: 'TASHIH_IN_PROGRESS' } }),
          prisma.tashihReview.count(),
          prisma.assignment.count(),
        ]);
        const sample = await prisma.registration.findMany({
          where: { status: 'TASHIH_IN_PROGRESS' },
          take: 5,
          include: {
            publisher: { select: { legal_name: true } },
            service_type: { select: { name: true } },
          },
        });

        moduleData = {
          module_code: 'TSH-01',
          name: 'Sidang & Catatan Tashih Naskah',
          sprint: 'Sprint 4',
          tables: [
            { name: 'tashih_reviews', row_count: reviewsCount, status: 'READY' },
            { name: 'assignments', row_count: assignmentsCount, status: 'READY' },
            { name: 'registrations (Dalam Sidang)', row_count: inTashih, status: 'READY' },
          ],
          endpoints: [
            { method: 'GET', path: '/api/v1/registrations?status=TASHIH_IN_PROGRESS', desc: 'Naskah Sedang Ditashih' },
            { method: 'PATCH', path: '/api/v1/registrations/:id/status', desc: 'Rekomendasi / Lanjut STT' },
          ],
          rbac_roles: ['PENTASHIH', 'SUPERADMIN'],
          sample_records: sample,
        };
        break;
      }

      case 'DOC-01':
      case 'DOC-02':
      case 'DOC':
      case 'DOCUMENTS': {
        const [sttIssued, readyForStt, docCount] = await Promise.all([
          prisma.registration.count({ where: { status: { in: ['STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'] } } }),
          prisma.registration.count({ where: { status: 'READY_FOR_STT' } }),
          prisma.officialDocument.count(),
        ]);
        const sample = await prisma.registration.findMany({
          where: { status: { in: ['READY_FOR_STT', 'STT_ISSUED', 'DOCUMENTATION_IN_PROGRESS', 'COMPLETED'] } },
          take: 5,
          include: {
            publisher: { select: { legal_name: true } },
            service_type: { select: { name: true } },
          },
        });

        moduleData = {
          module_code: upperCode === 'DOC-01' ? 'DOC-01' : 'DOC-02',
          name: 'Pengesahan Berita Acara & Surat Tanda Tashih',
          sprint: 'Sprint 5',
          tables: [
            { name: 'official_documents', row_count: docCount, status: 'READY' },
            { name: 'registrations (Siap / Terbit STT)', row_count: readyForStt + sttIssued, status: 'READY' },
          ],
          endpoints: [
            { method: 'GET', path: '/api/v1/registrations?status=READY_FOR_STT', desc: 'Naskah Siap Penetapan STT' },
            { method: 'GET', path: '/api/v1/public/verify-document/:token', desc: 'Verifikasi Publik Keabsahan QR' },
          ],
          rbac_roles: ['DOKUMENTATOR', 'KEPALA_LPMQ', 'ADMIN_PENERBIT', 'SUPERADMIN'],
          sample_records: sample,
        };
        break;
      }

      default: {
        const regCount = await prisma.registration.count();
        moduleData = {
          module_code: upperCode,
          name: `Modul ${upperCode}`,
          sprint: 'MVP',
          tables: [{ name: 'registrations', row_count: regCount, status: 'READY' }],
          endpoints: [{ method: 'GET', path: '/api/v1/registrations', desc: 'Registrations API' }],
          rbac_roles: ['SUPERADMIN'],
          sample_records: [],
        };
      }
    }

    const latency = Date.now() - startTime;

    res.status(200).json({
      success: true,
      latency_ms: latency,
      database: {
        name: 'lpmq_db',
        status: 'CONNECTED',
      },
      ...moduleData,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getHealth,
  getTableCounts,
  getModuleDiagnostics,
};
