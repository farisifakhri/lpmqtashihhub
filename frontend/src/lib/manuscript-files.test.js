import { describe, it, expect } from 'vitest';
import { latestManuscriptFiles } from './manuscript-files';

describe('latestManuscriptFiles', () => {
  it('menyisakan versi tertinggi per jenis berkas, urutan kemunculan jenis dipertahankan', () => {
    const result = latestManuscriptFiles([
      { id: 'c1', type: 'COVER', version: 1 },
      { id: 's2', type: 'SAMPLE_PAGE_1_5', version: 2 },
      { id: 'c2', type: 'COVER', version: 2 },
      { id: 's1', type: 'SAMPLE_PAGE_1_5', version: 1 },
      { id: 'p', type: 'SURAT_PERMOHONAN' },
    ]);
    expect(result.map((f) => f.id)).toEqual(['c2', 's2', 'p']);
  });

  it('aman untuk input kosong', () => {
    expect(latestManuscriptFiles(undefined)).toEqual([]);
    expect(latestManuscriptFiles(null)).toEqual([]);
  });
});
