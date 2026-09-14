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

    app.listen(ENV.PORT, '0.0.0.0', () => {
      console.log(`🚀 LPMQ Backend Server berjalan di http://localhost:${ENV.PORT}`);
      console.log(`📡 API Base URL: http://localhost:${ENV.PORT}/api/v1`);
      console.log(`🩺 Health Check: http://localhost:${ENV.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('❌ Gagal menyalakan server atau koneksi database gagal:', error.message);
    console.log('💡 Catatan: Pastikan MySQL di Laragon aktif dan DATABASE_URL pada backend/.env sudah sesuai.');

    // Production must fail startup instead of exposing a seemingly live API.
    if (ENV.NODE_ENV === 'production') {
      process.exitCode = 1;
      return;
    }

    // Development fallback keeps health available; its database check returns 503.
    app.listen(ENV.PORT, '0.0.0.0', () => {
      console.log(`⚠️ LPMQ Backend Server berjalan (mode fallback tanpa DB) di http://localhost:${ENV.PORT}`);
    });
  }
};

startServer();
