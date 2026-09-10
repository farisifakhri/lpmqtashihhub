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
            moduleCode="REG-02"
            title="Daftar Riwayat Pengajuan Naskah"
            moduleName="REG-02 Pemantauan Status"
            sprintTarget="Sprint 2"
            description="Lacak tahapan naskah, timeline status, dan unduh tanda terima pengajuan."
            targetTables={['registrations', 'status_histories', 'registration_addons', 'manuscript_files']}
            apiEndpoints={[
              { method: 'GET', path: '/api/v1/registrations', desc: 'Daftar pengajuan naskah terdaftar' },
              { method: 'GET', path: '/api/v1/registrations?status=DRAFT', desc: 'Filter status Draf' },
              { method: 'POST', path: '/api/v1/registrations', desc: 'Buat draf pengajuan baru' },
            ]}
            allowedRoles={['ADMIN_PENERBIT', 'SUPERADMIN']}
            sopReference="SOP Pendaftaran Mushaf Al-Qur'an (Kemenag RI v2.2)"
            businessRules={[
              'Penerbit hanya dapat melihat pengajuan miliknya sendiri (data isolation)',
              'Unggah berkas awal hanya cover dan halaman 1-5 sebagai penanda',
              'Pengajuan dapat dibatalkan hanya saat berstatus DRAFT atau REVISION_REQUIRED',
            ]}
          />
        ),
      },
      {
        path: 'publisher/billing',
        element: (
          <ModulePlaceholder
            moduleCode="PAY-01"
            title="Billing PNBP & Riwayat Pembayaran"
            moduleName="PAY-01/02 Pembayaran PNBP"
            sprintTarget="Sprint 3"
            description="Informasi kode billing SIMPONI, nominal tarif resmi berdasar snapshot saat pendaftaran, dan unggah bukti transfer."
            targetTables={['payment_records', 'registrations', 'service_types']}
            apiEndpoints={[
              { method: 'GET', path: '/api/v1/registrations?status=AWAITING_PAYMENT', desc: 'Daftar tagihan menunggu pembayaran' },
              { method: 'GET', path: '/api/v1/registrations?status=PAYMENT_VERIFICATION', desc: 'Daftar tagihan dalam verifikasi bukti bayar' },
            ]}
            allowedRoles={['ADMIN_PENERBIT', 'SUPERADMIN', 'VERIFIKATOR']}
            sopReference="SOP Pendaftaran & Pentashihan Mushaf Al-Qur'an (Tarif PNBP PP No. 59/2020)"
            businessRules={[
              'Nominal tarif dan durasi SLA disimpan sebagai snapshot permanen saat pengajuan disubmit',
              'Pembayaran MVP dicatat manual oleh verifikator (SIMPONI adapter di fase lanjut)',
              'Distribusi naskah dilarang sebelum pembayaran dikonfirmasi lunas (PAYMENT_VERIFIED)',
            ]}
          />
        ),
      },
      {
        path: 'publisher/documents',
        element: (
          <ModulePlaceholder
            moduleCode="DOC-01"
            title="Arsip Surat Tanda Tashih"
            moduleName="DOC-01 Surat Tanda Tashih"
            sprintTarget="Sprint 5"
            description="Unduh Surat Tanda Tashih resmi berformat PDF bersertifikat digital dan QR code keabsahan."
            targetTables={['official_documents', 'document_signatories', 'registrations']}
            apiEndpoints={[
              { method: 'GET', path: '/api/v1/registrations?status=STT_ISSUED', desc: 'Daftar naskah dengan STT terbit' },
              { method: 'GET', path: '/api/v1/registrations?status=COMPLETED', desc: 'Daftar naskah selesai seluruhnya' },
            ]}
            allowedRoles={['ADMIN_PENERBIT', 'SUPERADMIN']}
            sopReference="SOP Penatausahaan dan Penerbitan STT Mushaf Al-Qur'an (Kemenag RI v2.2)"
            businessRules={[
              'Dokumen PDF resmi wajib di-generate server-side dengan hash integritas',
              'Setiap dokumen memiliki token verifikasi publik untuk validasi QR tanpa login',
              'Masa berlaku STT adalah 2 tahun dan dapat diajukan perpanjangan',
            ]}
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
            moduleCode="VER-01"
            title="Antrean Verifikasi Administrasi & Naskah"
            moduleName="VER-01 Verifikasi Naskah"
            sprintTarget="Sprint 2"
            description="Pemeriksaan kelengkapan dokumen penerbit, keabsahan cover, format mushaf, dan pengembalian catatan perbaikan (revisi)."
            targetTables={['verification_assignments', 'registrations', 'manuscript_files', 'status_histories']}
            apiEndpoints={[
              { method: 'GET', path: '/api/v1/registrations?status=READY_FOR_VERIFICATION', desc: 'Antrean berkas baru masuk' },
              { method: 'GET', path: '/api/v1/registrations?status=IN_VERIFICATION', desc: 'Berkas sedang diperiksa verifikator' },
              { method: 'PATCH', path: '/api/v1/registrations/:id/status', desc: 'Transisi status (Lanjut / Revisi)' },
            ]}
            allowedRoles={['VERIFIKATOR', 'SUPERADMIN']}
            sopReference="SOP Pendaftaran Mushaf Al-Qur'an - Tahap Verifikasi Dokumen & Naskah (v2.2)"
            businessRules={[
              'Verifikator memeriksa cover, halaman Al-Qur\'an 1-5, dan legalitas penerbit',
              'Penerimaan master fisik dicatat beserta nomor tanda terima',
              'Keputusan revisi mengembalikan naskah ke penerbit dengan status REVISION_REQUIRED',
            ]}
          />
        ),
      },
      {
        path: 'internal/distributions',
        element: (
          <ModulePlaceholder
            moduleCode="DIS-01"
            title="Distribusi & Penugasan Tim Pentashih"
            moduleName="DIS-01 Distribusi Tim Tashih"
            sprintTarget="Sprint 3"
            description="Pembagian berkas naskah ke Tim Distribusi pentashih berdasar beban kerja dan jadwal sidang."
            targetTables={['distribution_teams', 'team_members', 'assignments', 'registrations']}
            apiEndpoints={[
              { method: 'GET', path: '/api/v1/master/distribution-teams', desc: 'Daftar Tim Distribusi SK Aktif' },
              { method: 'GET', path: '/api/v1/registrations?status=WAITING_DISTRIBUTION', desc: 'Naskah siap sidang pentashihan' },
            ]}
            allowedRoles={['DISTRIBUTOR', 'SUPERADMIN']}
            sopReference="SOP Pentashihan Master Mushaf Al-Qur'an - Distribusi Naskah (v2.2)"
            businessRules={[
              'Tim dipilih dari SK Tim Distribusi aktif yang telah disahkan',
              'Penugasan mencakup seluruh pentashih dalam tim dengan due date',
              'Distributor memantau beban kerja antar tim pentashih',
            ]}
          />
        ),
      },
      {
        path: 'internal/tashih',
        element: (
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
        ),
      },
      {
        path: 'internal/documents',
        element: (
          <ModulePlaceholder
            moduleCode="DOC-02"
            title="Pengesahan Berita Acara & Surat Tanda Tashih"
            moduleName="DOC-02/03 Berita Acara & SK Tashih"
            sprintTarget="Sprint 5"
            description="Penyusunan Berita Acara oleh Ketua Kelompok Tashih dan penetapan Surat Tanda Tashih oleh Kepala LPMQ."
            targetTables={['official_documents', 'document_signatories', 'documentation_items', 'registrations']}
            apiEndpoints={[
              { method: 'GET', path: '/api/v1/registrations?status=READY_FOR_STT', desc: 'Naskah siap penetapan STT' },
              { method: 'GET', path: '/api/v1/registrations?status=STT_ISSUED', desc: 'Naskah dengan STT terbit' },
              { method: 'GET', path: '/api/v1/public/verify-document/:token', desc: 'Verifikasi publik keabsahan dokumen QR' },
            ]}
            allowedRoles={['DOKUMENTATOR', 'KEPALA_LPMQ', 'SUPERADMIN']}
            sopReference="SOP Dokumentasi & Penetapan STT (v2.2)"
            businessRules={[
              'Ketua Kelompok Tashih menandatangani Berita Acara Tashih',
              'Kepala LPMQ menetapkan Surat Tanda Tashih (STT)',
              'Dokumentator mencatat tanda terima deposit 5 eksemplar setelah STT terbit',
            ]}
          />
        ),
      },
      {
        path: 'internal/settings',
        element: (
          <ModulePlaceholder
            moduleCode="MST-01"
            title="Master Data & Pengaturan Tarif"
            moduleName="MST-01/02 Master Data Berversi"
            sprintTarget="Sprint 1"
            description="Pengelolaan 17 jenis layanan, SLA hari kerja, tarif PNBP, addon, dan kalender hari libur."
            targetTables={['mushaf_categories', 'service_types', 'service_addons', 'distribution_teams', 'working_days']}
            apiEndpoints={[
              { method: 'GET', path: '/api/v1/master/categories', desc: '4 Kategori Mushaf (Mushaf, Juz Amma, Terjemah, Braille)' },
              { method: 'GET', path: '/api/v1/master/service-types', desc: '17 Profil Layanan & Tarif Dasar PNBP' },
              { method: 'GET', path: '/api/v1/master/addons', desc: '4 Layanan Tambahan (Addon)' },
              { method: 'GET', path: '/api/v1/master/distribution-teams', desc: 'Tim Distribusi & Anggota Pentashih' },
            ]}
            allowedRoles={['SUPERADMIN']}
            sopReference="SOP Manajemen Master Data Tarif & Layanan Pentashihan LPMQ (v2.2)"
            businessRules={[
              'Master data berversi dengan masa berlaku effective_from dan effective_to',
              'Dilarang menghapus fisik master data yang sudah direferensikan pengajuan',
              'Nilai tarif dan SLA dilarang di-hardcode pada aplikasi',
            ]}
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
