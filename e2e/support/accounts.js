// Akun uji dari `npm --prefix backend run prisma:seed`.
// Password bawaan seed development adalah "password123"; bisa diganti lewat E2E_PASSWORD.
export const PASSWORD = process.env.E2E_PASSWORD || 'password123';

// `role` = peran aktif yang dipilih di aplikasi (lpmq_active_role), penting untuk akun multi-peran.
export const ACCOUNTS = {
  SUPERADMIN: { email: 'admin@lpmq.kemenag.go.id', role: 'SUPERADMIN', home: '/internal' },
  ADMIN_INTERNAL: { email: 'admin.internal@lpmq.kemenag.go.id', role: 'ADMIN_INTERNAL', home: '/internal' },
  VERIFIKATOR: { email: 'verifikator@lpmq.kemenag.go.id', role: 'VERIFIKATOR', home: '/internal' },
  KEPALA_LPMQ: { email: 'kepala@lpmq.kemenag.go.id', role: 'KEPALA_LPMQ', home: '/internal' },
  DISTRIBUTOR: { email: 'distributor@lpmq.kemenag.go.id', role: 'DISTRIBUTOR', home: '/internal' },
  DOKUMENTATOR: { email: 'dokumentator@lpmq.kemenag.go.id', role: 'DOKUMENTATOR', home: '/internal' },
  // Pentashih umum (tanpa tugas pada data demo)
  PENTASHIH: { email: 'pentashih@lpmq.kemenag.go.id', role: 'PENTASHIH', home: '/internal' },
  // Ketua kelompok-1: pemegang tugas sidang REG-DEMO-08-TASHIH pada seed demo
  PENTASHIH_KETUA: { email: 'anisa.resti.damayanti.s.pd@pentashih.lpmq.go.id', role: 'PENTASHIH', home: '/internal' },
  PENERBIT: { email: 'penerbit@mushafnusantara.com', role: 'PENERBIT', home: '/publisher' },
};

// Nomor registrasi data uji per tahapan (dibuat oleh `npm --prefix backend run seed:demo-stages`).
export const DEMO = {
  DRAFT: 'REG-DEMO-01-DRAFT',
  LOKET: 'REG-DEMO-02-LOKET',
  SIAP_DITUGASKAN: 'REG-DEMO-03-READY',
  SEDANG_VERIFIKASI: 'REG-DEMO-04-VERIF',
  MENUNGGU_PERSETUJUAN: 'REG-DEMO-05-APPROVAL',
  MENUNGGU_PEMBAYARAN: 'REG-DEMO-06-BILLING',
  SERAH_TERIMA: 'REG-DEMO-07-HANDOVER',
  SEDANG_TASHIH: 'REG-DEMO-08-TASHIH',
  PERLU_REVISI: 'REG-DEMO-09-REVISI',
  SIAP_STT: 'REG-DEMO-10-READY-STT',
  STT_TERBIT: 'REG-DEMO-11-STT-ISSUED',
  DOKUMENTASI: 'REG-DEMO-12-DOKUMENTASI',
  SELESAI: 'REG-DEMO-13-SELESAI',
};
