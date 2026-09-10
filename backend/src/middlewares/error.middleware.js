export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan internal pada server.';

  // Tangani error CORS
  if (err.message && err.message.includes('kebijakan CORS')) {
    statusCode = 403;
  }

  // Tangani error Prisma Engine tanpa membocorkan skema/query internal
  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Data dengan nilai tersebut sudah tersimpan di sistem (duplikasi data).';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Data yang diminta tidak ditemukan atau telah dihapus.';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Relasi referensi data tidak valid.';
        break;
      default:
        statusCode = 500;
        message = 'Terjadi kesalahan pada pemrosesan database.';
        break;
    }
  } else if (err.name?.startsWith('Prisma')) {
    statusCode = 500;
    message = 'Terjadi kesalahan internal koneksi database.';
  }

  // Sembunyikan detail raw error 500 di production
  const isProduction = process.env.NODE_ENV === 'production';
  if (statusCode === 500 && isProduction) {
    message = 'Terjadi kesalahan internal pada server.';
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
