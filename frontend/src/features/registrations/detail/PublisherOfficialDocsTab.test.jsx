import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublisherOfficialDocsTab } from './PublisherOfficialDocsTab';
import { fileApi } from '@/api/file.api';
import { ApiError } from '@/api/client';
import { publisherSurveyApi } from '@/api/publisher-survey.api';

vi.mock('@/components/common/DocumentArchive', () => ({ DocumentArchive: () => null }));
vi.mock('./PrintingReportSection', () => ({ PrintingReportSection: () => null }));

const data = {
  id: 'reg-1', status: 'STT_ISSUED', registration_no: 'REG-1', foreign_metadata: {},
  official_documents: [{ id: 'doc-1', document_type: 'SURAT_TANDA_TASHIH', status: 'ISSUED', document_no: 'STT/1' }],
};

describe('PublisherOfficialDocsTab: banner Unduh STT', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('membuka pop-up survei bila unduhan ditolak karena survei belum diisi', async () => {
    vi.spyOn(fileApi, 'downloadDocument').mockRejectedValue(new ApiError('Isi survei kepuasan layanan terlebih dahulu sebelum mengunduh STT: X.', 409));
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [] });
    render(<PublisherOfficialDocsTab data={data} setPreviewFile={() => {}} setShowReceipt={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Unduh STT Resmi/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(fileApi.downloadDocument).toHaveBeenCalledWith('doc-1', 'STT/1.pdf');
  });
});
