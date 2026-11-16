// Pemaraf berfungsi sama seperti Kepala LPMQ (akses layar & data yang sama), tetapi berdiri
// sebelum Kepala: pada titik persetujuan, aksinya dicatat sebagai paraf, bukan pengesahan.
export const withPemaraf = (codes) => {
  const isPemaraf = codes.includes('PEMARAF') && !codes.includes('KEPALA_LPMQ');
  return {
    isPemaraf,
    roles: isPemaraf ? codes.map(code => (code === 'PEMARAF' ? 'KEPALA_LPMQ' : code)) : codes.filter(code => code !== 'PEMARAF'),
  };
};

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
