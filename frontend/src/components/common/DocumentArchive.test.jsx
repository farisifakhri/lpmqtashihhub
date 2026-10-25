import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DocumentArchive } from './DocumentArchive';
import { registrationApi } from '@/api/registration.api';

describe('DocumentArchive', () => {
  it('menampilkan metadata surat dan ringkasan disposisi tanpa JSON mentah', async () => {
    vi.spyOn(registrationApi, 'getDocumentArchive').mockResolvedValue({ data: [{
      id: 'nota-1', source: 'VERIFICATION', document_type: 'NOTA_DINAS_VERIFIKASI',
      document_no: 'ND-001', version: 1, status: 'ISSUED', created_at: '2026-09-29T03:00:00.000Z',
      created_by: { name: 'Petugas Admin' }, content_snapshot: { title: 'Mushaf Uji', verifier_name: 'Petugas Verifikator', due_at: '2026-10-01T16:59:59.999Z' },
    }] });
    render(<DocumentArchive registrationId="reg-1" />);
    await waitFor(() => expect(screen.getByText('Tinjau dokumen')).toBeInTheDocument());
    expect(screen.getByText('Nomor surat')).toBeInTheDocument();
    expect(screen.getByText('Petugas Admin')).toBeInTheDocument();
    expect(screen.getByText(/Penugasan verifikasi naskah Mushaf Uji/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lihat Dokumen PDF' })).toBeInTheDocument();
    expect(screen.queryByText(/"verifier_name"/)).not.toBeInTheDocument();
  });

  it('U-05: menampilkan pesan error spesifik dari backend ketika fetch PDF gagal', async () => {
    vi.spyOn(registrationApi, 'getDocumentArchive').mockResolvedValue({ data: [{
      id: 'nota-err-1', source: 'VERIFICATION', document_type: 'NOTA_DINAS_VERIFIKASI',
      document_no: 'ND-002', version: 1, status: 'DRAFT', created_at: '2026-09-29T03:00:00.000Z',
      created_by: { name: 'Petugas Admin' }, content_snapshot: { title: 'Mushaf Error' },
    }] });

    // Mock global fetch to return 403 with custom message
    const customErrorMsg = 'Akses dokumen arsip dibatasi untuk penugasan ini.';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: false, message: customErrorMsg }),
    });

    render(<DocumentArchive registrationId="reg-1" />);
    await waitFor(() => expect(screen.getByText('Tinjau dokumen')).toBeInTheDocument());

    const viewButton = screen.getByRole('button', { name: 'Lihat Dokumen PDF' });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(screen.getByText(customErrorMsg)).toBeInTheDocument();
    });
  });
});
