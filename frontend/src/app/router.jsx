import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomeRedirect } from '@/features/home/HomeRedirect';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPublisherPage } from '@/features/auth/RegisterPublisherPage';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Fallback spinner saat modul rute diunduh secara asynchronous (P2-02)
const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Memuat modul...</span>
    </div>
  </div>
);

const withSuspense = (Component) => (props) => (
  <Suspense fallback={<PageFallback />}>
    <Component {...props} />
  </Suspense>
);

// Code-split heavy feature routes (P2-02)
const PublisherDashboard = withSuspense(lazy(() => import('@/features/registrations/PublisherDashboard').then(m => ({ default: m.PublisherDashboard }))));
const PublisherRegistrationsPage = withSuspense(lazy(() => import('@/features/registrations/PublisherRegistrationsPage').then(m => ({ default: m.PublisherRegistrationsPage }))));
const PublisherRegistrationDetailPage = withSuspense(lazy(() => import('@/features/registrations/PublisherRegistrationDetailPage').then(m => ({ default: m.PublisherRegistrationDetailPage }))));
const NewRegistrationPage = withSuspense(lazy(() => import('@/features/registrations/NewRegistrationPage').then(m => ({ default: m.NewRegistrationPage }))));
const PublisherBillingPage = withSuspense(lazy(() => import('@/features/billing/PublisherBillingPage').then(m => ({ default: m.PublisherBillingPage }))));
const InternalDashboard = withSuspense(lazy(() => import('@/features/internal/InternalDashboard').then(m => ({ default: m.InternalDashboard }))));
const VerifikatorInboxPage = withSuspense(lazy(() => import('@/features/verification/VerifikatorInboxPage').then(m => ({ default: m.VerifikatorInboxPage }))));
const VerificationInspectionPage = withSuspense(lazy(() => import('@/features/verification/VerificationInspectionPage').then(m => ({ default: m.VerificationInspectionPage }))));
const InternalPaymentQueuePage = withSuspense(lazy(() => import('@/features/verification/InternalPaymentQueuePage').then(m => ({ default: m.InternalPaymentQueuePage }))));
const DistributorHandoverInboxPage = withSuspense(lazy(() => import('@/features/distribution/DistributorHandoverInboxPage').then(m => ({ default: m.DistributorHandoverInboxPage }))));
const SignatureCenterPage = withSuspense(lazy(() => import('@/features/signatures/SignatureCenterPage').then(m => ({ default: m.SignatureCenterPage }))));
const AdminMasterIntakePage = withSuspense(lazy(() => import('@/features/intake/AdminMasterIntakePage').then(m => ({ default: m.AdminMasterIntakePage }))));
const UserManagementPage = withSuspense(lazy(() => import('@/features/internal/users/UserManagementPage').then(m => ({ default: m.UserManagementPage }))));
const ContentConfiguration = withSuspense(lazy(() => import('@/features/internal/settings/ContentConfiguration').then(m => ({ default: m.ContentConfiguration }))));
const PentashihWorkspacePage = withSuspense(lazy(() => import('@/features/tashih/PentashihWorkspacePage').then(m => ({ default: m.PentashihWorkspacePage }))));
const PublicDocumentVerification = withSuspense(lazy(() => import('@/features/verification/PublicDocumentVerification').then(m => ({ default: m.PublicDocumentVerification }))));

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
        path: 'internal/signatures',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['KEPALA_LPMQ', 'VERIFIKATOR', 'SUPERADMIN']}>
            <SignatureCenterPage />
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
          <ProtectedRoute portalType="internal" allowedRoles={['DISTRIBUTOR', 'ADMIN', 'VERIFIKATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}>
            <DistributorHandoverInboxPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/master-intake',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['ADMIN', 'SUPERADMIN']}>
            <AdminMasterIntakePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'internal/tashih',
        element: (
          <ProtectedRoute portalType="internal" allowedRoles={['PENTASHIH', 'SUPERADMIN']}>
            <PentashihWorkspacePage />
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
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
