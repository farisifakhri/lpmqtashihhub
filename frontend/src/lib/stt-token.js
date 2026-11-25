const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PLAIN_TOKEN = new RegExp(`^${UUID}$`, 'i');
const STT_LINK = new RegExp(`/verify-documents/(${UUID})(?![0-9a-f-])`, 'i');

// Menerima isi QR STT, link lengkap, atau token UUID polos; selain itu null.
export const sttTokenFromText = (text = '') => {
  const value = String(text ?? '').trim();
  if (PLAIN_TOKEN.test(value)) return value.toLowerCase();
  return value.match(STT_LINK)?.[1]?.toLowerCase() || null;
};
