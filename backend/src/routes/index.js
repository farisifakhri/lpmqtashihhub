import { Router } from 'express';
import authRoutes from './auth.routes.js';
import masterRoutes from './master.routes.js';
import publisherRoutes from './publisher.routes.js';
import registrationRoutes from './registration.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

// Root API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Selamat datang di API Sistem Manajemen Layanan Pentashihan Mushaf Al-Qur'an (LPMQ)",
    version: '2.2.0',
    endpoints: {
      health: '/api/v1/health',
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
      },
      public: {
        verifyDocument: 'GET /api/v1/public/verify-document/:token',
      },
    },
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    system: 'LPMQ Backend API',
    version: '2.2.0',
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
router.use('/auth', authRoutes);
router.use('/master', masterRoutes);
router.use('/publishers', publisherRoutes);
router.use('/registrations', registrationRoutes);
router.use('/public', publicRoutes);

export default router;
