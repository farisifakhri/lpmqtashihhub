import app from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/database.js';
import { markOverdue } from './services/sla.service.js';

const startServer = async () => {
  try {
    // Verifikasi koneksi basis data
    await prisma.$connect();
    let checkingSla = false;
    const checkSla = async () => {
      if (checkingSla) return;
      checkingSla = true;
      try { await markOverdue(); } catch (error) { console.error('Pemeriksaan SLA gagal:', error.message); }
      finally { checkingSla = false; }
    };
    void checkSla();
    setInterval(checkSla, 60_000).unref();
    console.log('✅ Database MySQL (Laragon) berhasil terhubung via Prisma.');

    app.listen(ENV.PORT, () => {
      console.log(`🚀 LPMQ Backend Server berjalan di http://localhost:${ENV.PORT}`);
      console.log(`📡 API Base URL: http://localhost:${ENV.PORT}/api/v1`);
      console.log(`🩺 Health Check: http://localhost:${ENV.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('❌ Gagal menyalakan server atau koneksi database gagal:', error.message);
    console.log('💡 Catatan: Pastikan MySQL di Laragon aktif dan DATABASE_URL pada backend/.env sudah sesuai.');
    
    // Tetap jalankan server HTTP agar endpoint health / info tetap bisa merespon
    app.listen(ENV.PORT, () => {
      console.log(`⚠️ LPMQ Backend Server berjalan (mode fallback tanpa DB) di http://localhost:${ENV.PORT}`);
    });
  }
};

startServer();
