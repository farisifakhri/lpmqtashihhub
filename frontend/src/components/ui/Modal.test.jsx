import React, { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal Component', () => {
  it('merender dialog modal saat isOpen=true dengan atribut aksesibilitas', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Uji Modal" description="Deskripsi uji">
        <p>Konten modal</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Uji Modal')).toBeInTheDocument();
    expect(screen.getByText('Deskripsi uji')).toBeInTheDocument();
    expect(screen.getByText('Konten modal')).toBeInTheDocument();
  });

  it('tidak merender konten saat isOpen=false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Uji Modal">
        <p>Konten modal tersembunyi</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('memanggil onClose saat tombol Escape ditekan', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Uji Escape">
        <button type="button">Aksi</button>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('memanggil onClose saat tombol tutup diklik', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Uji Tombol Tutup">
        <p>Konten</p>
      </Modal>
    );

    const closeBtn = screen.getByRole('button', { name: 'Tutup dialog' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('mengunci scroll body saat terbuka dan mengembalikannya saat ditutup', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={() => {}} title="Uji Scroll">
        <p>Konten</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('tidak memindahkan fokus ke tombol Tutup saat pengguna mengetik dengan onClose inline', async () => {
    vi.useFakeTimers();
    const Form = () => {
      const [name, setName] = useState('');
      return (
        // onClose inline = fungsi baru tiap render, seperti pemakaian umum di halaman.
        <Modal isOpen onClose={() => setName('')} title="Buat Survei">
          <input aria-label="Nama survei" value={name} onChange={(e) => setName(e.target.value)} />
        </Modal>
      );
    };
    render(<Form />);
    vi.advanceTimersByTime(100); // fokus awal saat modal dibuka

    const input = screen.getByLabelText('Nama survei');
    input.focus();
    fireEvent.change(input, { target: { value: 'S' } });
    vi.advanceTimersByTime(100);
    fireEvent.change(input, { target: { value: 'Su' } });
    vi.advanceTimersByTime(100);

    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue('Su');
    vi.useRealTimers();
  });
});

