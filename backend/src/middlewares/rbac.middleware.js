import { roleLabel } from '../utils/user-messages.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        message: 'Akses akun Anda belum dapat diperiksa. Silakan masuk kembali untuk melanjutkan.',
      });
    }

    // SUPERADMIN has access to everything
    if (req.user.roles.includes('SUPERADMIN')) {
      return next();
    }

    const hasPermission = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Tindakan ini hanya tersedia untuk ${allowedRoles.map(roleLabel).join(' atau ')}. Gunakan akun yang sesuai atau hubungi petugas yang berwenang.`,
      });
    }

    // Jika endpoint memerlukan akses PENERBIT, pastikan penerbit berstatus VERIFIED
    if (allowedRoles.includes('PENERBIT') && req.user.roles.includes('PENERBIT')) {
      if (req.user.publisher?.verification_status !== 'VERIFIED') {
        return res.status(403).json({
          success: false,
          code: 'PUBLISHER_NOT_APPROVED',
          message: 'Akun penerbit Anda belum disetujui atau masih dalam proses verifikasi petugas LPMQ.',
        });
      }
    }

    next();
  };
};

export default authorize;
