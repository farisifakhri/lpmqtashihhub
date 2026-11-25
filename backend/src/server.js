import app from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/database.js';
import { markOverdue } from './services/sla.service.js';

const startServer = async () => {
  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`🚀 LPMQ Backend Server berjalan di http://localhost:${ENV.PORT}`);
    console.log(`📡 API Base URL: http://localhost:${ENV.PORT}/api/v1`);
    console.log(`🩺 Health Check: http://localhost:${ENV.PORT}/api/v1/health`);
  });

  let checkingSla = false;
  const checkSla = async () => {
    if (checkingSla) return;
    checkingSla = true;
    try { await markOverdue(); } catch (error) { console.error('Pemeriksaan SLA gagal:', error.message); }
    finally { checkingSla = false; }
  };

  try {
    // Verifikasi koneksi basis data
    await prisma.$connect();
    console.log('✅ Database berhasil terhubung via Prisma.');
  } catch (error) {
    console.error('❌ Koneksi database gagal saat startup:', error.message);
    console.warn('⚠️ Server tetap dibuka; endpoint health akan mengembalikan 503 sampai database dapat dijangkau.');
    console.log('💡 Pastikan DATABASE_URL benar dan database dapat dijangkau dari server aplikasi.');
  }

  void checkSla();
  setInterval(checkSla, 60_000).unref();
};

startServer();
