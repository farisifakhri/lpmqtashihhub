import { Router } from 'express';
import authRoutes from './auth.routes.js';
import masterRoutes from './master.routes.js';
import publisherRoutes from './publisher.routes.js';
import registrationRoutes from './registration.routes.js';
import publicRoutes from './public.routes.js';
import systemRoutes from './system.routes.js';
import workflowRoutes from './workflow.routes.js';
import verificationRoutes from './verification.routes.js';
import handoverRoutes from './handover.routes.js';
import reportRoutes from './report.routes.js';
import userRoutes from './user.routes.js';
import coreTeamRoutes from './core-team.routes.js';
import { getHealth } from '../controllers/system.controller.js';

const router = Router();

// Root API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Selamat datang di API Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)",
    version: '2.2.0',
    endpoints: {
      health: '/api/v1/health',
      system: {
        health: '/api/v1/system/health',
        tables: '/api/v1/system/tables',
        diagnostics: '/api/v1/system/diagnostics/:module',
      },
      master: {
        categories: '/api/v1/master/categories',
        serviceTypes: '/api/v1/master/service-types',
        addons: '/api/v1/master/addons',
        distributionTeams: '/api/v1/master/distribution-teams',
      },
      auth: {
        login: 'POST /api/v1/auth/login',
        registerPublisher: 'POST /api/v1/auth/register-publisher',
        me: 'GET /api/v1/auth/me',
      },
      publishers: {
        myProfile: 'GET /api/v1/publishers/me',
        list: 'GET /api/v1/publishers',
      },
      registrations: {
        list: 'GET /api/v1/registrations',
        createDraft: 'POST /api/v1/registrations',
        declarePhysicalMaster: 'PUT /api/v1/registrations/:id/physical-master',
        receivePhysicalMaster: 'POST /api/v1/registrations/:id/physical-master/receive',
        receipt: 'GET /api/v1/registrations/:id/receipt',
        assignVerifier: 'POST /api/v1/registrations/:id/verification-assignments',
      },
      verificationAssignments: 'GET /api/v1/verification-assignments',
      public: {
        verifyDocument: 'GET /api/v1/public/verify-document/:token',
      },
    },
  });
});

// Health check endpoint dengan live ping ke MySQL database
router.get('/health', getHealth);

// Domain Routes
router.use('/auth', authRoutes);
router.use(workflowRoutes);
router.use(verificationRoutes);
router.use(handoverRoutes);
router.use(reportRoutes);
router.use('/master', masterRoutes);
router.use('/publishers', publisherRoutes);
router.use('/registrations', registrationRoutes);
router.use('/users', userRoutes);
router.use('/core-teams', coreTeamRoutes);
router.use('/public', publicRoutes);
router.use('/system', systemRoutes);

export default router;
