import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { faqApi } from '@/api/faq.api';
import { FaqPage } from './FaqPage';

vi.mock('@/api/faq.api', () => ({
  faqApi: {
    listPublic: vi.fn(),
  },
  FAQ_CATEGORIES_OPTIONS: [
    { value: 'LAYANAN_TASHIH_ONLINE', label: 'Layanan Tashih Online' },
    { value: 'MUSHAF_STANDAR_INDONESIA', label: 'Mushaf Standar Indonesia' },
    { value: 'REGULASI', label: 'Regulasi' },
  ],
}));

const faq = {
  id: 'faq-1',
  category: 'LAYANAN_TASHIH_ONLINE',
  question: 'Bagaimana mengajukan tashih?',
  answer: 'Daftarkan akun terlebih dahulu.\n\nKemudian ajukan naskah melalui portal.',
};

const result = (data = [faq], page = 1, limit = 10, total = 1, totalPages = 1) => ({
  success: true,
  data,
  pagination: { page, limit, total, totalPages },
});

describe('FaqPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faqApi.listPublic.mockResolvedValue(result());
  });

  it('shows public FAQs in a headed table and toggles the answer below its question', async () => {
    render(<MemoryRouter><FaqPage /></MemoryRouter>);

    expect(await screen.findByText(faq.question)).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'No' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Kategori' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'FAQ' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument();

    const answerRow = document.getElementById('faq-answer-faq-1');
    expect(answerRow).toHaveAttribute('aria-hidden', 'true');
    expect(answerRow.querySelector('.grid')).toHaveClass('grid-rows-[0fr]', 'opacity-0');
    fireEvent.click(screen.getByRole('button', { name: 'Lihat Jawaban' }));
    expect(await screen.findByText('Daftarkan akun terlebih dahulu.')).toBeInTheDocument();
    expect(answerRow).toHaveAttribute('aria-hidden', 'false');
    expect(answerRow.querySelector('.grid')).toHaveClass('grid-rows-[1fr]', 'opacity-100');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup Jawaban' }));
    await waitFor(() => expect(answerRow).toHaveAttribute('aria-hidden', 'true'));
    expect(answerRow.querySelector('.grid')).toHaveClass('grid-rows-[0fr]', 'opacity-0');
  });

  it('combines category, search, row limit, and pagination requests', async () => {
    faqApi.listPublic
      .mockResolvedValueOnce(result([faq], 1, 10, 11, 2))
      .mockResolvedValue(result([faq], 1, 5, 11, 3));
    render(<MemoryRouter><FaqPage /></MemoryRouter>);
    await screen.findByText(faq.question);

    fireEvent.change(screen.getByLabelText('Filter kategori'), { target: { value: 'REGULASI' } });
    fireEvent.change(screen.getByLabelText('Baris per halaman'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Cari pertanyaan atau jawaban...'), { target: { value: 'perizinan' } });

    await waitFor(() => {
      expect(faqApi.listPublic).toHaveBeenLastCalledWith({
        page: 1,
        limit: 5,
        search: 'perizinan',
        category: 'REGULASI',
      });
    }, { timeout: 2000 });

    fireEvent.click(screen.getByRole('button', { name: /Berikutnya/ }));
    await waitFor(() => expect(faqApi.listPublic).toHaveBeenLastCalledWith({
      page: 2,
      limit: 5,
      search: 'perizinan',
      category: 'REGULASI',
    }));
  });
});
