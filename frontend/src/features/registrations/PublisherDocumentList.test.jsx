import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublisherDocumentList } from './PublisherDocumentList';
import { fileApi } from '@/api/file.api';
const doc = { id: 'stt-1', document_type: 'SURAT_TANDA_TASHIH', document_no: 'STT-001', status: 'ISSUED', file_id: 'pdf-1' };
describe('Issued publisher STT', () => {
  it('does not display draft documents', () => {
    render(<PublisherDocumentList documents={[{ ...doc, status: 'DRAFT' }]} />);
    expect(screen.queryByText('STT-001')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unduh STT' })).not.toBeInTheDocument();
  });
  it('disables download if an issued PDF is absent or expired', () => {
    render(<PublisherDocumentList documents={[{ ...doc, file_id: null }, { ...doc, id: 'expired', document_no: 'STT-002', valid_until: '2000-01-01T00:00:00Z' }]} />);
    for (const button of screen.getAllByRole('button', { name: 'Unduh STT' })) expect(button).toBeDisabled();
  });
  it('uses authenticated download and displays a server failure', async () => {
    vi.spyOn(fileApi, 'downloadDocument').mockRejectedValue(new Error('Berkas belum tersedia'));
    render(<PublisherDocumentList documents={[doc]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Unduh STT' }));
    await waitFor(() => expect(fileApi.downloadDocument).toHaveBeenCalledWith('stt-1', 'STT-001.pdf'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Berkas belum tersedia');
  });
});
