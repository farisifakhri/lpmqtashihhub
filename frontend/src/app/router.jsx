import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomeRedirect } from '@/features/home/HomeRedirect';
import { PublisherDashboard } from '@/features/registrations/PublisherDashboard';
import { NewRegistrationPage } from '@/features/registrations/NewRegistrationPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPublisherPage } from '@/features/auth/RegisterPublisherPage';
import { InternalDashboard } from '@/features/internal/InternalDashboard';
import { PublicDocumentVerification } from '@/features/verification/PublicDocumentVerification';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';

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
        element: <PublisherDashboard />,
      },
      {
        path: 'publisher/new-registration',
        element: <NewRegistrationPage />,
      },
      {
        path: 'publisher/registrations',
        element: (
          <ModulePlaceholder
            title="Daftar Riwayat Pengajuan Naskah"
            moduleName="REG-02 Pemantauan Status"
            sprintTarget="Sprint 2"
            description="Lacak tahapan naskah, timeline status, dan unduh tanda terima pengajuan."
          />
        ),
      },
      {
        path: 'publisher/billing',
        element: (
          <ModulePlaceholder
            title="Billing PNBP & Riwayat Pembayaran"
            moduleName="PAY-01/02 Pembayaran PNBP"
            sprintTarget="Sprint 3"
            description="Informasi kode billing SIMPONI, nominal tarif resmi berdasar snapshot saat pendaftaran, dan unggah bukti transfer."
          />
        ),
      },
      {
        path: 'publisher/documents',
        element: (
          <ModulePlaceholder
            title="Arsip Surat Tanda Tashih"
            moduleName="DOC-01 Surat Tanda Tashih"
            sprintTarget="Sprint 5"
            description="Unduh Surat Tanda Tashih resmi berformat PDF bersertifikat digital dan QR code keabsahan."
          />
        ),
      },

      // Rute Aplikasi Internal LPMQ
      {
        path: 'internal',
        element: <InternalDashboard />,
      },
      {
        path: 'internal/verifications',
        element: (
          <ModulePlaceholder
            title="Antrean Verifikasi Administrasi & Naskah"
            moduleName="VER-01 Verifikasi Naskah"
            sprintTarget="Sprint 2"
            description="Pemeriksaan kelengkapan dokumen penerbit, keabsahan cover, format mushaf, dan pengembalian catatan perbaikan (revisi)."
          />
        ),
      },
      {
        path: 'internal/distributions',
        element: (
          <ModulePlaceholder
            title="Distribusi & Penugasan Tim Pentashih"
            moduleName="DIS-01 Distribusi Tim Tashih"
            sprintTarget="Sprint 3"
            description="Pembagian berkas naskah ke Tim Distribusi pentashih berdasar beban kerja dan jadwal sidang."
          />
        ),
      },
      {
        path: 'internal/tashih',
        element: (
          <ModulePlaceholder
            title="Sidang & Catatan Tashih Naskah"
            moduleName="TSH-01/02 Pentashihan Bertahap"
            sprintTarget="Sprint 4"
            description="Pencatatan koreksi lafaz, rasm usmani, harakat, ayat, dan tanda waqaf pada 3 tahap: Awal, Perbaikan, dan Dumi."
          />
        ),
      },
      {
        path: 'internal/documents',
        element: (
          <ModulePlaceholder
            title="Pengesahan Berita Acara & Surat Tanda Tashih"
            moduleName="DOC-02/03 Berita Acara & SK Tashih"
            sprintTarget="Sprint 5"
            description="Penyusunan Berita Acara oleh Ketua Kelompok Tashih dan penetapan Surat Tanda Tashih oleh Kepala LPMQ."
          />
        ),
      },
      {
        path: 'internal/settings',
        element: (
          <ModulePlaceholder
            title="Master Data & Pengaturan Tarif"
            moduleName="MST-01/02 Master Data Berversi"
            sprintTarget="Sprint 1"
            description="Pengelolaan 17 jenis layanan, SLA hari kerja, tarif PNBP, addon, dan kalender hari libur."
          />
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
