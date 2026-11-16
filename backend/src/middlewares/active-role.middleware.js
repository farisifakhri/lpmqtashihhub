import { toAccessRole } from '../utils/pemaraf.js';

export const requireActiveRole = (req, res, next) => {
  const headerRole = req.headers?.['x-active-role'];
  // Klien mengirim role identitas (PEMARAF); cocokkan dengan role hak akses server (KEPALA_LPMQ).
  const activeRole = typeof headerRole === 'string' ? toAccessRole(headerRole, req.user?.isPemaraf) : headerRole;
  if (typeof activeRole !== 'string' || !req.user?.roles?.includes(activeRole)) {
    return res.status(403).json({
      success: false,
      message: 'Peran aktif tidak valid atau tidak dimiliki oleh akun Anda.',
    });
  }

  req.activeRole = activeRole;
  next();
};
