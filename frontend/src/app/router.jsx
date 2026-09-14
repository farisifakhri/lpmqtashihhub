import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomeRedirect } from '@/features/home/HomeRedirect';
import { PublisherDashboard } from '@/features/registrations/PublisherDashboard';
import { InternalDashboard } from '@/features/internal/InternalDashboard';
import { PublicDocumentVerification } from '@/features/verification/PublicDocumentVerification';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { ContentConfiguration } from '@/features/internal/settings/ContentConfiguration';

export const router = createBrowserRouter([
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
        element: (
          <ModulePlaceholder
            title="Formulir Pengajuan Pentashihan Baru"
            moduleName="REG-01/04 Pendaftaran Naskah"
            sprintTarget="Sprint 2"
            description="Unggah cover mushaf, halaman 1–5 naskah penanda, pemilihan kategori mushaf, dan rincian varian layanan."
          />
        ),
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
        element: <Navigate to="/internal/settings/content" replace />,
      },
      {
        path: 'internal/settings/content',
        element: <ContentConfiguration />,
      },
      {
        path: 'internal/settings/categories',
        element: (
          <ModulePlaceholder
            title="Konfigurasi Kategori Mushaf"
            moduleName="MST-02 Kategori Mushaf"
            sprintTarget="Sprint 2"
            description="Pengelolaan kategori dan sub-kategori jenis mushaf yang tersedia untuk layanan pentashihan."
          />
        ),
      },
      {
        path: 'internal/settings/users',
        element: (
          <ModulePlaceholder
            title="Konfigurasi Pengguna"
            moduleName="MST-03 Manajemen User"
            sprintTarget="Sprint 2"
            description="Kelola akun petugas internal, penerbit terdaftar, dan penetapan hak akses berdasarkan peran."
          />
        ),
      },
      {
        path: 'internal/settings/service-managers',
        element: (
          <ModulePlaceholder
            title="Konfigurasi Pengelola Layanan"
            moduleName="MST-04 Pengelola Layanan"
            sprintTarget="Sprint 2"
            description="Penetapan penanggung jawab layanan, Tim Distribusi pentashih, dan kalender hari kerja."
          />
        ),
      },
      {
        path: 'internal/settings/security',
        element: (
          <ModulePlaceholder
            title="Konfigurasi PIN & Pemulihan Akun"
            moduleName="MST-05 Keamanan Akun"
            sprintTarget="Sprint 2"
            description="Pengaturan kebijakan PIN, mekanisme pemulihan akun, dan log aktivitas keamanan."
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
