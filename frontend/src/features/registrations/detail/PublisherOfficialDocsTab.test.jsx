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
const survei = { id: 's1', name: 'Survei', answered: false, items: [] };
const renderTab = () => render(<PublisherOfficialDocsTab data={data} setPreviewFile={() => {}} setShowReceipt={() => {}} />);

describe('PublisherOfficialDocsTab: banner STT terkunci survei', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('menyembunyikan nomor STT dan membuka pop-up survei selama survei belum diisi', async () => {
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [survei] });
    const unduh = vi.spyOn(fileApi, 'downloadDocument');
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: /Isi Survei untuk Membuka Surat Tanda Tashih/ }));
    expect(screen.queryByText('STT/1')).not.toBeInTheDocument();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(unduh).not.toHaveBeenCalled();
  });

  it('setelah survei terisi, nomor STT tampil dan tombol langsung mengunduh', async () => {
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [{ ...survei, answered: true }] });
    vi.spyOn(fileApi, 'downloadDocument').mockResolvedValue();
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: /Unduh Surat Tanda Tashih Resmi/ }));
    expect(screen.getByText('STT/1')).toBeInTheDocument();
    expect(fileApi.downloadDocument).toHaveBeenCalledWith('doc-1', 'STT/1.pdf');
  });

  it('bila backend tetap menolak karena survei (409), pop-up survei dibuka', async () => {
    vi.spyOn(publisherSurveyApi, 'listForRegistration').mockResolvedValue({ data: [] });
    vi.spyOn(fileApi, 'downloadDocument').mockRejectedValue(new ApiError('Isi survei kepuasan layanan terlebih dahulu sebelum mengunduh STT: X.', 409));
    renderTab();

    fireEvent.click(await screen.findByRole('button', { name: /Unduh Surat Tanda Tashih Resmi/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
