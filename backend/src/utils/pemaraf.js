// Pemaraf berfungsi sama seperti Kepala LPMQ (akses layar & data yang sama), tetapi berdiri
// sebelum Kepala: pada titik persetujuan, aksinya dicatat sebagai paraf, bukan pengesahan.
export const withPemaraf = (codes) => {
  const isPemaraf = codes.includes('PEMARAF') && !codes.includes('KEPALA_LPMQ');
  return {
    isPemaraf,
    roles: isPemaraf ? codes.map(code => (code === 'PEMARAF' ? 'KEPALA_LPMQ' : code)) : codes.filter(code => code !== 'PEMARAF'),
  };
};
