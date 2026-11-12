// Pemaraf adalah role tersendiri (bukan Kepala LPMQ), tetapi diberi akses layar & data yang sama
// dengan Kepala dan berdiri sebelum Kepala: pada titik persetujuan, aksinya dicatat sebagai paraf.
// `roles` = hak akses di server (PEMARAF dipetakan ke KEPALA_LPMQ agar semua pemeriksaan Kepala berlaku);
// `identityRoles` = role yang ditampilkan ke pengguna (PEMARAF tetap PEMARAF).
export const withPemaraf = (codes) => {
  const isPemaraf = codes.includes('PEMARAF') && !codes.includes('KEPALA_LPMQ');
  const roles = isPemaraf ? codes.map(code => (code === 'PEMARAF' ? 'KEPALA_LPMQ' : code)) : codes.filter(code => code !== 'PEMARAF');
  return { isPemaraf, roles, identityRoles: isPemaraf ? codes : roles };
};

// Peran aktif dari header X-Active-Role memakai kode identitas; terjemahkan ke kode hak akses.
export const toAccessRole = (role, isPemaraf) => (isPemaraf && role === 'PEMARAF' ? 'KEPALA_LPMQ' : role);
