export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Pengguna belum memiliki otorisasi.',
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
        message: 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.',
      });
    }

    next();
  };
};

export default authorize;
