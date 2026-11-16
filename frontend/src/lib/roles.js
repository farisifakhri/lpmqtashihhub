// Pemaraf adalah role tersendiri (label & identitas), tetapi mendapat akses layar Kepala LPMQ.
// Pakai helper ini untuk pemeriksaan hak akses, bukan untuk menampilkan nama role.
export const accessRoles = (roles = []) => (roles.includes('PEMARAF') && !roles.includes('KEPALA_LPMQ') ? [...roles, 'KEPALA_LPMQ'] : roles);

export const isHeadRole = (role) => role === 'KEPALA_LPMQ' || role === 'HEAD_OF_LPMQ' || role === 'PEMARAF';
