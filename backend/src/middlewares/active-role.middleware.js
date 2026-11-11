export const requireActiveRole = (req, res, next) => {
  const activeRole = req.headers?.['x-active-role'];
  if (typeof activeRole !== 'string' || !req.user?.roles?.includes(activeRole)) {
    return res.status(403).json({
      success: false,
      message: 'Peran aktif tidak valid atau tidak dimiliki oleh akun Anda.',
    });
  }

  req.activeRole = activeRole;
  next();
};
