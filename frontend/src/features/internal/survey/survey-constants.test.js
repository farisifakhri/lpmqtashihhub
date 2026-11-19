import { describe, expect, it } from 'vitest';
import { unsurForSurvey } from './survey-constants';

const list = [
  { id: 'a', code: 'A', kind: 'IKM', survey_id: null },
  { id: '1', code: '1', kind: 'IPAK', survey_id: null },
  { id: 'x', code: null, kind: 'IPAK', survey_id: 'lain' },
];

describe('unsurForSurvey', () => {
  it('menyaring unsur sesuai jenis survei dan unsur khusus survei', () => {
    expect(unsurForSurvey(list, 's1', 'IKM').map((u) => u.id)).toEqual(['a']);
    expect(unsurForSurvey(list, 's1', 'IPAK').map((u) => u.id)).toEqual(['1']);
    expect(unsurForSurvey(list, 'lain', 'IPAK').map((u) => u.id)).toEqual(['1', 'x']);
    expect(unsurForSurvey(list, 's1', 'LAINNYA').map((u) => u.id)).toEqual(['a', '1']);
    expect(unsurForSurvey(list, '', 'IKM')).toHaveLength(3);
  });
});
