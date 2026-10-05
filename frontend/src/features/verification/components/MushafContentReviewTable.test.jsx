import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MushafContentReviewTable } from './MushafContentReviewTable';

describe('MushafContentReviewTable (REV-16)', () => {
  const mockRegistration = {
    id: 'reg-1',
    registration_no: 'REG-2026-001',
    title: "Mushaf Al-Qur'an Standar Kemenag",
    service_type: { name: 'Mushaf Standar' },
    foreign_metadata: {
      jenis_mushaf: 'Mushaf Standar Indonesia (Usmani)',
      jenis_naskah: ['Mushaf Lengkap 30 Juz'],
      materi_tambahan: ['Doa Khatam Al-Qur\'an', 'Tanda Waqaf'],
      sizes: [{ ukuran: 'A5 (14.8 x 21 cm)', oplah: 5000 }],
      penanggung_jawab_produk: 'H. Ahmad Syafii',
      nama_percetakan: 'PT Percetakan Menara Kudus',
    },
  };

  it('merender tabel audit konten dengan klaim penerbit dan counter awal', () => {
    render(
      <MushafContentReviewTable
        registration={mockRegistration}
        contentReview={null}
        onChange={vi.fn()}
        isReadOnly={false}
      />
    );

    expect(screen.getByText(/Verifikasi & Koreksi Konten Mushaf \(REV-16\)/i)).toBeInTheDocument();
    expect(screen.getByText('Standar Rasm & Tanda Baca')).toBeInTheDocument();
    expect(screen.getByText('Cakupan & Kelompok Naskah')).toBeInTheDocument();
    expect(screen.getByText('Materi Tambahan / Suplemen')).toBeInTheDocument();
    expect(screen.getByText('Ukuran Naskah & Oplah Cetak')).toBeInTheDocument();
    expect(screen.getByText('Percetakan & Penanggung Jawab')).toBeInTheDocument();

    expect(screen.getByText(/✓ 5 Sesuai/i)).toBeInTheDocument();
  });

  it('memungkinkan verifikator mengubah status menjadi KOREKSI dan memasukkan nilai penelaahan', () => {
    const handleChange = vi.fn();
    render(
      <MushafContentReviewTable
        registration={mockRegistration}
        contentReview={null}
        onChange={handleChange}
        isReadOnly={false}
      />
    );

    // Click 'Koreksi' button on first item (item-rasm)
    const koreksiButtons = screen.getAllByRole('button', { name: /Koreksi/i });
    fireEvent.click(koreksiButtons[0]);

    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
    expect(lastCall.items[0].status).toBe('KOREKSI');
  });

  it('memungkinkan verifikator mengubah status menjadi KURANG (coret/pengurangan)', () => {
    const handleChange = vi.fn();
    render(
      <MushafContentReviewTable
        registration={mockRegistration}
        contentReview={null}
        onChange={handleChange}
        isReadOnly={false}
      />
    );

    const kurangButtons = screen.getAllByRole('button', { name: /Kurang/i });
    fireEvent.click(kurangButtons[2]); // item-materi

    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
    expect(lastCall.items[2].status).toBe('KURANG');
  });

  it('dapat menambahkan suplemen fisik tambahan yang ditemukan verifikator (TAMBAH)', () => {
    const handleChange = vi.fn();
    render(
      <MushafContentReviewTable
        registration={mockRegistration}
        contentReview={null}
        onChange={handleChange}
        isReadOnly={false}
      />
    );

    // Open add item form
    fireEvent.click(screen.getByRole('button', { name: /Tambah Konten Baru/i }));

    // Fill form
    const input = screen.getByPlaceholderText(/Contoh: Suplemen Do'a Khatmil Qur'an/i);
    fireEvent.change(input, { target: { value: 'Suplemen Dzikir Pagi Petang 16 Halaman' } });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /Simpan ke Lembar Konten/i }));

    expect(handleChange).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Suplemen Dzikir Pagi Petang 16 Halaman')).toBeInTheDocument();
    expect(screen.getByText('Konten Tambahan Verifikator')).toBeInTheDocument();
  });

  it('menonaktifkan seluruh tombol aksi dan form pada mode read-only', () => {
    render(
      <MushafContentReviewTable
        registration={mockRegistration}
        contentReview={null}
        onChange={vi.fn()}
        isReadOnly={true}
      />
    );

    expect(screen.queryByRole('button', { name: /Tambah Konten Baru/i })).not.toBeInTheDocument();
    const sesuaiButtons = screen.getAllByRole('button', { name: /Sesuai/i });
    sesuaiButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
