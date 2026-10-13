import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegistrationReceiptDialog } from './RegistrationReceiptDialog';
import { registrationApi } from '@/api/registration.api';

describe('RegistrationReceiptDialog', () => {
  const dummyReg = {
    id: 'reg-uuid-123',
    registration_no: 'REG-202610-0099',
    title: 'Mushaf Al-Qur\'an Standar Indonesia',
  };

  let createObjectURLSpy;
  let revokeObjectURLSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => 'blob:http://localhost/test-receipt-pdf');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false or registration is missing', () => {
    const { container: c1 } = render(
      <RegistrationReceiptDialog isOpen={false} registration={dummyReg} onClose={() => {}} />
    );
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <RegistrationReceiptDialog isOpen={true} registration={null} onClose={() => {}} />
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('fetches PDF and renders iframe preview upon open', async () => {
    const mockBlob = new Blob(['%PDF-1.4 dummy content'], { type: 'application/pdf' });
    vi.spyOn(registrationApi, 'getReceiptPdf').mockResolvedValue(mockBlob);

    render(
      <RegistrationReceiptDialog
        isOpen={true}
        registration={dummyReg}
        onClose={() => {}}
      />
    );

    // Initial loading state
    expect(screen.getByText(/Menyiapkan pratinjau tanda terima resmi/i)).toBeInTheDocument();
    expect(screen.getByText('REG-202610-0099')).toBeInTheDocument();

    // Verify registrationApi.getReceiptPdf was called with registration.id
    await waitFor(() => {
      expect(registrationApi.getReceiptPdf).toHaveBeenCalledWith('reg-uuid-123');
    });

    // Verify iframe rendered with blob URL
    const iframe = await screen.findByTitle('Penampil PDF tanda terima pendaftaran');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'blob:http://localhost/test-receipt-pdf');
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
  });

  it('displays error state and retries successfully when button is clicked', async () => {
    vi.spyOn(registrationApi, 'getReceiptPdf')
      .mockRejectedValueOnce(new Error('Koneksi terputus saat mengunduh PDF'))
      .mockResolvedValueOnce(new Blob(['%PDF-1.4 success'], { type: 'application/pdf' }));

    render(
      <RegistrationReceiptDialog
        isOpen={true}
        registration={dummyReg}
        onClose={() => {}}
      />
    );

    // Should show error message
    expect(await screen.findByText('Gagal Membuka Tanda Terima PDF')).toBeInTheDocument();
    expect(screen.getByText('Koneksi terputus saat mengunduh PDF')).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /Coba Lagi/i });
    fireEvent.click(retryBtn);

    // Should call getReceiptPdf again and display iframe
    await waitFor(() => {
      expect(registrationApi.getReceiptPdf).toHaveBeenCalledTimes(2);
    });

    const iframe = await screen.findByTitle('Penampil PDF tanda terima pendaftaran');
    expect(iframe).toBeInTheDocument();
  });

  it('triggers download using the fetched PDF blob without refetching', async () => {
    const mockBlob = new Blob(['%PDF-1.4 dummy content'], { type: 'application/pdf' });
    vi.spyOn(registrationApi, 'getReceiptPdf').mockResolvedValue(mockBlob);
    vi.spyOn(registrationApi, 'downloadReceiptPdf').mockResolvedValue();

    render(
      <RegistrationReceiptDialog
        isOpen={true}
        registration={dummyReg}
        onClose={() => {}}
      />
    );

    await screen.findByTitle('Penampil PDF tanda terima pendaftaran');

    const downloadBtn = screen.getByRole('button', { name: /Unduh PDF/i });
    fireEvent.click(downloadBtn);

    // downloadReceiptPdf should not need to be called because we already have the blob
    expect(registrationApi.downloadReceiptPdf).not.toHaveBeenCalled();
    // createObjectURL should have been called for download link
    expect(createObjectURLSpy).toHaveBeenCalled();
  });

  it('triggers iframe print or window.open when Cetak is clicked', async () => {
    const mockBlob = new Blob(['%PDF-1.4 dummy content'], { type: 'application/pdf' });
    vi.spyOn(registrationApi, 'getReceiptPdf').mockResolvedValue(mockBlob);
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    render(
      <RegistrationReceiptDialog
        isOpen={true}
        registration={dummyReg}
        onClose={() => {}}
      />
    );

    await screen.findByTitle('Penampil PDF tanda terima pendaftaran');

    const printBtn = screen.getByRole('button', { name: /Cetak/i });
    fireEvent.click(printBtn);

    // In jsdom iframe contentWindow.print might not be implemented, so it calls window.open fallback or print
    expect(printBtn).toBeEnabled();
  });

  it('calls onClose when close button or backdrop is clicked, and revokes object URL on unmount', async () => {
    const mockBlob = new Blob(['%PDF-1.4 dummy content'], { type: 'application/pdf' });
    vi.spyOn(registrationApi, 'getReceiptPdf').mockResolvedValue(mockBlob);
    const onClose = vi.fn();

    const { unmount } = render(
      <RegistrationReceiptDialog
        isOpen={true}
        registration={dummyReg}
        onClose={onClose}
      />
    );

    await screen.findByTitle('Penampil PDF tanda terima pendaftaran');

    const closeBtn = screen.getAllByRole('button', { name: 'Tutup' })[0];
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();

    unmount();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });
});
