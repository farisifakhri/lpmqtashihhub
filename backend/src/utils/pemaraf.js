// Pemaraf adalah role tersendiri (bukan Kepala LPMQ), tetapi diberi akses layar & data yang sama
// dengan Kepala dan berdiri sebelum Kepala: pada titik persetujuan, aksinya dicatat sebagai paraf.
// `roles` = hak akses di server (PEMARAF dipetakan ke KEPALA_LPMQ agar semua pemeriksaan Kepala berlaku);
// `identityRoles` = role yang ditampilkan ke pengguna (PEMARAF tetap PEMARAF).
export const withPemaraf = (codes, activeRoleHeader = null) => {
  const hasPemaraf = codes.includes('PEMARAF');
  const hasKepala = codes.includes('KEPALA_LPMQ');

  let isPemaraf = false;
  if (hasPemaraf) {
    if (activeRoleHeader === 'PEMARAF') {
      isPemaraf = true;
    } else if (activeRoleHeader === 'KEPALA_LPMQ') {
      isPemaraf = false;
    } else {
      isPemaraf = !hasKepala;
    }
  }

  const roles = isPemaraf
    ? codes.map(code => (code === 'PEMARAF' ? 'KEPALA_LPMQ' : code))
    : (activeRoleHeader ? codes : codes.filter(code => code !== 'PEMARAF'));

  const identityRoles = isPemaraf || activeRoleHeader ? codes : roles;

  return { isPemaraf, roles, identityRoles };
};

// Peran aktif dari header X-Active-Role memakai kode identitas; terjemahkan ke kode hak akses.
export const toAccessRole = (role, isPemaraf) => (isPemaraf && role === 'PEMARAF' ? 'KEPALA_LPMQ' : role);
/**
 * Guard pembatas peran Pemaraf pada rute pengesahan/keputusan definitif.
 * Mencegah Pemaraf mengeksekusi aksi yang merupakan hak prerogatif Kepala LPMQ.
 */
export const forbidPemaraf = (user, action = 'melakukan tindakan ini') => {
  if (user?.isPemaraf) {
    const error = new Error(
      `Akses ditolak. Peran Pemaraf hanya berwenang membubuhkan paraf sebelum pengesahan definitif oleh Kepala LPMQ. Pemaraf tidak berwenang untuk ${action}.`
    );
    error.statusCode = 403;
    throw error;
  }
};
