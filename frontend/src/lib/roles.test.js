import { describe, it, expect } from 'vitest';
import { accessRoles } from './roles';

describe('accessRoles (selaras backend withPemaraf)', () => {
  it('Pemaraf yang aktif sebagai Pemaraf mendapat hak Kepala LPMQ', () => {
    expect(accessRoles(['PENTASHIH', 'PEMARAF'], 'PEMARAF')).toContain('KEPALA_LPMQ');
    expect(accessRoles(['PEMARAF'], 'PEMARAF')).toContain('KEPALA_LPMQ');
  });

  it('akun Pemaraf+Pentashih yang aktif sebagai Pentashih tidak mendapat hak Kepala (mencegah 403 di dashboard)', () => {
    expect(accessRoles(['PENTASHIH', 'PEMARAF'], 'PENTASHIH')).not.toContain('KEPALA_LPMQ');
  });

  it('tanpa peran aktif tetap seperti sebelumnya', () => {
    expect(accessRoles(['PENTASHIH', 'PEMARAF'])).toContain('KEPALA_LPMQ');
    expect(accessRoles(['KEPALA_LPMQ', 'PEMARAF'])).toEqual(['KEPALA_LPMQ', 'PEMARAF']);
  });
});
