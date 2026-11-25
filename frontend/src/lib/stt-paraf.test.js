import { describe, expect, it } from 'vitest';
import { sttParafProgress } from './stt-paraf';

describe('sttParafProgress', () => {
  it('belum lengkap sampai seluruh Pemaraf memaraf, urutan bebas', () => {
    const one = sttParafProgress({ submitted_at: 'x', paraf_required: 2, parafs: [{ signed_by: { id: 'b' } }] });
    expect(one).toMatchObject({ done: 1, required: 2, complete: false });
    expect(one.signedBy('b')).toBe(true);
    expect(one.signedBy('a')).toBe(false);

    const two = sttParafProgress({ submitted_at: 'x', paraf_required: 2, parafs: [{ signed_by: { id: 'b' } }, { signed_by: { id: 'a' } }] });
    expect(two).toMatchObject({ done: 2, complete: true });
  });

  it('dokumen lama Paraf 1/Paraf 2 tetap dikenali (wajib 2)', () => {
    expect(sttParafProgress({ paraf_1: { signed_by: { id: 'a' } } })).toMatchObject({ done: 1, required: 2, complete: false });
    expect(sttParafProgress({ paraf_1: {}, paraf_2: {} })).toMatchObject({ done: 2, complete: true });
  });

  it('belum diserahkan = belum lengkap', () => {
    expect(sttParafProgress(undefined)).toMatchObject({ done: 0, required: 2, complete: false });
  });
});
