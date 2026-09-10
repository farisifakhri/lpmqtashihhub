export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err);

  let statusCode = err.statusCode || err.status || 500;
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) statusCode = 500;
  let message = err.message || 'Permintaan belum dapat diproses. Silakan coba lagi nanti.';

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Data yang dikirim tidak dapat dibaca. Muat ulang formulir, periksa isian, lalu kirim kembali.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = req.path?.endsWith('/uploads')
      ? 'Berkas terlalu besar. Unggah PDF, PNG, atau JPEG berukuran maksimal 10 MB.'
      : 'Data yang dikirim terlalu besar. Kurangi isi formulir; kirim berkas melalui fasilitas unggah.';
  }

  // Tangani error CORS
  if (err.message && err.message.includes('kebijakan CORS')) {
    statusCode = 403;
    message = 'Alamat aplikasi ini belum diizinkan mengakses layanan. Buka aplikasi melalui alamat resmi atau hubungi administrator.';
  }

  // Tangani error Prisma Engine tanpa membocorkan skema/query internal
  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Data yang sama sudah tersimpan. Muat ulang daftar dan gunakan data yang sudah ada. Jika belum terlihat, hubungi administrator sebelum mengirim ulang.';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Data yang dipilih sudah tidak tersedia. Muat ulang daftar, lalu pilih kembali data yang ingin diproses.';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Data terkait tidak tersedia atau masih digunakan oleh data lain. Muat ulang pilihan Anda; hubungi administrator jika masalah berlanjut.';
        break;
      case 'P2034':
        statusCode = 409;
        message = 'Data sedang diproses oleh petugas atau permintaan lain. Muat ulang detail untuk memeriksa hasilnya sebelum mencoba lagi.';
        break;
      case 'P2024':
        statusCode = 503;
        message = 'Layanan sedang sibuk. Tunggu sebentar, lalu muat ulang untuk memeriksa apakah permintaan Anda sudah diproses.';
        break;
      default:
        statusCode = 500;
        message = 'Terjadi kesalahan pada pemrosesan database.';
        break;
    }
  } else if (err.name?.startsWith('Prisma')) {
    statusCode = err.name === 'PrismaClientInitializationError' ? 503 : 500;
    message = 'Layanan data belum dapat diakses. Coba lagi beberapa saat kemudian atau hubungi administrator jika masalah berlanjut.';
  }

  // Detail teknis tetap tersedia di log server, bukan pesan pengguna.
  if (statusCode === 500) {
    message = 'Permintaan belum dapat diproses karena gangguan sistem. Muat ulang untuk memeriksa hasilnya sebelum mencoba lagi. Hubungi administrator jika masalah berlanjut.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      prisma_code: err.code,
    }),
  });
};

export default errorHandler;
