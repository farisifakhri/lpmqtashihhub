import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublisherStatusAlerts } from './PublisherStatusAlerts';
import { fileApi } from '@/api/file.api';
import * as toast from '@/components/ui/toast';

const letter = (id, version, created_at) => ({ id, version, created_at, document_type: 'REVISION_RETURN_LETTER', document_no: `SPK/${id}`, status: 'DRAFT' });
const renderAlerts = (official_documents, handleTabChange = vi.fn()) => {
  render(
    <MemoryRouter>
      <PublisherStatusAlerts data={{ id: 'reg-1', status: 'REVISION_REQUIRED', official_documents }} handleTabChange={handleTabChange} />
    </MemoryRouter>,
  );
  return handleTabChange;
};
const tombol = () => screen.getByRole('button', { name: 'Unduh Surat Hasil Tashih' });

describe('PublisherStatusAlerts: Unduh Surat Hasil Tashih', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('mengunduh surat pengembalian versi terbaru', () => {
    const unduh = vi.spyOn(fileApi, 'downloadDocument').mockResolvedValue();
    const tab = renderAlerts([letter('lama', 1, '2026-01-01'), letter('baru', 2, '2026-01-02'), { id: 'stt', document_type: 'SURAT_TANDA_TASHIH', version: 9 }]);
    fireEvent.click(tombol());
    expect(unduh).toHaveBeenCalledWith('baru', 'SPK/baru.pdf');
    expect(tab).not.toHaveBeenCalled();
  });

  it('beralih ke tab Dokumen bila surat tidak ada', () => {
    const unduh = vi.spyOn(fileApi, 'downloadDocument');
    const tab = renderAlerts([]);
    fireEvent.click(tombol());
    expect(tab).toHaveBeenCalledWith('dokumen');
    expect(unduh).not.toHaveBeenCalled();
  });

  it('menampilkan galat server lewat toast', async () => {
    vi.spyOn(fileApi, 'downloadDocument').mockRejectedValue(new Error('PDF belum dapat dibuat'));
    const toastSpy = vi.spyOn(toast, 'showToast').mockImplementation(() => 1);
    renderAlerts([letter('a', 1, '2026-01-01')]);
    fireEvent.click(tombol());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('PDF belum dapat dibuat', 'danger'));
  });
});
