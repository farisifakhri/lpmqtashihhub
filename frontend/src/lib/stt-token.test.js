import { describe, it, expect } from 'vitest';
import { sttTokenFromText } from './stt-token';

const TOKEN = 'b3c0c262-d2e5-427b-a8e9-8a330acd3a96';

describe('sttTokenFromText', () => {
  it('mengambil token dari link QR STT dan token polos', () => {
    expect(sttTokenFromText(`https://tashih.kemenag.go.id/verify-documents/${TOKEN}`)).toBe(TOKEN);
    expect(sttTokenFromText(`  ${TOKEN.toUpperCase()}  `)).toBe(TOKEN);
    expect(sttTokenFromText(`http://localhost:3000/verify-documents/${TOKEN}?x=1`)).toBe(TOKEN);
  });

  it('menolak link lain, token terpotong, atau teks kosong', () => {
    expect(sttTokenFromText(`https://tashih.kemenag.go.id/verify-internal/${TOKEN}`)).toBeNull();
    expect(sttTokenFromText(`https://x/verify-documents/${TOKEN}abc`)).toBeNull();
    expect(sttTokenFromText('https://x/verify-documents/123')).toBeNull();
    expect(sttTokenFromText('')).toBeNull();
    expect(sttTokenFromText(null)).toBeNull();
  });
});
