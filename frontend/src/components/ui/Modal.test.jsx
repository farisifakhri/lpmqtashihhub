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
});

