import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomeRedirect } from '@/features/home/HomeRedirect';
import { PublisherDashboard } from '@/features/registrations/PublisherDashboard';
import { PublisherRegistrationsPage } from '@/features/registrations/PublisherRegistrationsPage';
import { PublisherRegistrationDetailPage } from '@/features/registrations/PublisherRegistrationDetailPage';
import { NewRegistrationPage } from '@/features/registrations/NewRegistrationPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPublisherPage } from '@/features/auth/RegisterPublisherPage';
import { InternalDashboard } from '@/features/internal/InternalDashboard';
import { PublicDocumentVerification } from '@/features/verification/PublicDocumentVerification';
import { VerifikatorInboxPage } from '@/features/verification/VerifikatorInboxPage';
import { VerificationInspectionPage } from '@/features/verification/VerificationInspectionPage';
import { InternalPaymentQueuePage } from '@/features/verification/InternalPaymentQueuePage';
import { DistributorHandoverInboxPage } from '@/features/distribution/DistributorHandoverInboxPage';
import { PublisherBillingPage } from '@/features/billing/PublisherBillingPage';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { ContentConfiguration } from '@/features/internal/settings/ContentConfiguration';
import { UserManagementPage } from '@/features/internal/users/UserManagementPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  // Rute Autentikasi Mandiri
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPublisherPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomeRedirect />,
      },
      // Rute Portal Penerbit
      {
        path: 'publisher',
        element: (
          <ProtectedRoute portalType="publisher">
            <PublisherDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'publisher/new-registration',
        element: (
          <ProtectedRoute portalType="publisher">
            <NewRegistrationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'publisher/registrations',
        element: (
          <ProtectedRoute portalType="publisher">
            <PublisherRegistrationsPage key="history" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'publisher/registrations/:id',
        element: <ProtectedRoute portalType="publisher"><PublisherRegistrationDetailPage /></ProtectedRoute>,
      },
      {
        path: 'publisher/billing',
        element: (
          <ProtectedRoute portalType="publisher">
            <PublisherBillingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'publisher/documents',
        element: (
          <ProtectedRoute portalType="publisher">
            <PublisherRegistrationsPage key="documents" documents />
          </ProtectedRoute>
        ),
      },

      // Rute Aplikasi Internal LPMQ
      {
        path: 'internal',
        element: (
          <ProtectedRoute portalType="internal">
            <InternalDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/verifications',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}>
            <VerifikatorInboxPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/verifications/:id',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}>
            <VerificationInspectionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/payments',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}>
            <InternalPaymentQueuePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/distributions',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['DISTRIBUTOR', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}>
            <DistributorHandoverInboxPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/tashih',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['PENTASHIH', 'SUPERADMIN']}>
            <ModulePlaceholder
              moduleCode="TSH-01"
              title="Sidang & Catatan Tashih Naskah"
              moduleName="TSH-01/02 Pentashihan Bertahap"
              sprintTarget="Sprint 4"
              description="Pencatatan koreksi lafaz, rasm usmani, harakat, ayat, dan tanda waqaf pada 3 tahap: Awal, Perbaikan, dan Dumi."
              targetTables={['tashih_reviews', 'assignments', 'registrations', 'distribution_teams']}
              apiEndpoints={[
                { method: 'GET', path: '/api/v1/registrations?status=TASHIH_IN_PROGRESS', desc: 'Naskah sedang dalam tahap pentashihan' },
                { method: 'PATCH', path: '/api/v1/registrations/:id/status', desc: 'Rekomendasi lanjut STT / revisi' },
              ]}
              allowedRoles={['PENTASHIH', 'SUPERADMIN']}
              sopReference="SOP Pentashihan Master Mushaf Al-Qur'an - Pelaksanaan Sidang (v2.2)"
              businessRules={[
                'Pencatatan koreksi terbagi menjadi 3 tahap: Awal, Perbaikan, dan Dumi',
                'Riwayat koreksi bersifat append-only dan tidak boleh ditimpa',
                'Rekomendasi pentashih menjadi dasar penetapan STT oleh Kepala LPMQ',
              ]}
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/documents',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}>
            <ModulePlaceholder
              moduleCode="DOC-02"
              title="Pengesahan Berita Acara & Surat Tanda Tashih"
              moduleName="DOC-02/03 Berita Acara & SK Tashih"
              sprintTarget="Sprint 5"
              description="Distributor mereviu rekomendasi pentashih; alur Berita Acara dan penetapan STT menunggu keputusan SOP lanjutan."
              targetTables={['official_documents', 'document_signatories', 'documentation_items', 'registrations']}
              apiEndpoints={[
                { method: 'GET', path: '/api/v1/registrations?status=READY_FOR_STT', desc: 'Naskah siap penetapan STT' },
                { method: 'GET', path: '/api/v1/registrations?status=STT_ISSUED', desc: 'Naskah dengan STT terbit' },
                { method: 'GET', path: '/api/v1/public/verify-document/:token', desc: 'Verifikasi publik keabsahan dokumen QR' },
              ]}
              allowedRoles={['DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}
              sopReference="SOP Dokumentasi & Penetapan STT (v2.2)"
              businessRules={[
                'Distributor mereviu rekomendasi tiap pentashih atau pembaca naskah sebelum pengajuan dokumen',
                'Kepala LPMQ menetapkan Surat Tanda Tashih (STT)',
                'Dokumentator mencatat tanda terima deposit 5 eksemplar setelah STT terbit',
              ]}
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/users',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['SUPERADMIN']}>
            <UserManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/settings',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['SUPERADMIN']}>
            <ContentConfiguration />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/settings/content',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['SUPERADMIN']}>
            <ContentConfiguration />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Rute Verifikasi QR Publik (Tanpa otentikasi/Layout internal)
  {
    path: '/verify-documents/:token',
    element: <PublicDocumentVerification />,
  },
]);
