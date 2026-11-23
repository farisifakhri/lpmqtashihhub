// Pemaraf adalah role tersendiri (label & identitas), tetapi mendapat akses layar Kepala LPMQ.
// Pakai helper ini untuk pemeriksaan hak akses, bukan untuk menampilkan nama role.
export const accessRoles = (roles = []) => (roles.includes('PEMARAF') && !roles.includes('KEPALA_LPMQ') ? [...roles, 'KEPALA_LPMQ'] : roles);

// Dipakai Sidebar: Pemaraf mendapat menu yang sama dengan Kepala LPMQ (tanpa ini sidebar Pemaraf kosong).
export const isHeadRole = (role) => role === 'KEPALA_LPMQ' || role === 'HEAD_OF_LPMQ' || role === 'PEMARAF';

/**
 * Memastikan apakah pengguna saat ini sedang bertindak sebagai Pemaraf.
 * Memprioritaskan peran aktif (activeRole / role) jika pengguna memiliki multi-role.
 */
export const checkIsPemaraf = (user) => {
  const activeRole = user?.activeRole || user?.role;
  if (activeRole === 'PEMARAF') return true;
  if (['KEPALA_LPMQ', 'SUPERADMIN', 'VERIFIKATOR', 'DISTRIBUTOR', 'PENTASHIH', 'DOKUMENTATOR', 'PENERBIT'].includes(activeRole)) {
    return false;
  }
  return Boolean(
    user?.isPemaraf ||
    (Array.isArray(user?.roles) && user.roles.includes('PEMARAF') && !user.roles.includes('KEPALA_LPMQ'))
  );
};
