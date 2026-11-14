import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { faqApi } from '@/api/faq.api';
import { FaqManagement } from './FaqManagement';

vi.mock('@/api/faq.api', () => ({
  faqApi: {
    listAdmin: vi.fn(),
    getAdmin: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  FAQ_CATEGORIES_OPTIONS: [
    { value: 'LAYANAN_TASHIH_ONLINE', label: 'Layanan Tashih Online' },
    { value: 'MUSHAF_STANDAR_INDONESIA', label: 'Mushaf Standar Indonesia' },
    { value: 'REGULASI', label: 'Regulasi' },
  ],
}));

const draftFaq = {
  id: 'faq-1',
  category: 'REGULASI',
  question: 'Apa dasar regulasi layanan?',
  answer: 'Jawaban draft FAQ.',
  is_published: false,
  created_at: '2026-11-10T09:00:00.000Z',
};

const adminResult = (data = []) => ({
  success: true,
  data,
  pagination: { page: 1, limit: 10, total: data.length, totalPages: 1 },
});

describe('FaqManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    faqApi.listAdmin.mockResolvedValue(adminResult([draftFaq]));
    faqApi.getAdmin.mockResolvedValue({ success: true, data: draftFaq });
    faqApi.create.mockResolvedValue({ success: true, data: draftFaq });
    faqApi.update.mockResolvedValue({ success: true, data: draftFaq });
    faqApi.delete.mockResolvedValue({ success: true });
  });

  it('adds a draft or published FAQ through the protected admin API', async () => {
    render(<FaqManagement />);
    expect(await screen.findByText(draftFaq.question)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tambah FAQ' }));
    const dialog = screen.getByRole('dialog', { name: 'Tambah FAQ' });
    fireEvent.change(within(dialog).getByLabelText('Kategori'), { target: { value: 'MUSHAF_STANDAR_INDONESIA' } });
    fireEvent.change(within(dialog).getByLabelText('Judul Pertanyaan'), { target: { value: 'Bagaimana memperoleh MSI?' } });
    fireEvent.change(within(dialog).getByPlaceholderText('Tulis jawaban dengan paragraf yang jelas...'), { target: { value: 'Ajukan permohonan kepada LPMQ.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publikasikan' }));

    await waitFor(() => expect(faqApi.create).toHaveBeenCalledWith({
      category: 'MUSHAF_STANDAR_INDONESIA',
      question: 'Bagaimana memperoleh MSI?',
      answer: 'Ajukan permohonan kepada LPMQ.',
      is_published: true,
    }));
  });

  it('edits, filters, and confirms deletion of an FAQ', async () => {
    render(<FaqManagement />);
    await screen.findByText(draftFaq.question);

    fireEvent.change(screen.getByLabelText('Status Publikasi'), { target: { value: 'false' } });
    await waitFor(() => expect(faqApi.listAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ is_published: 'false' })));

    fireEvent.click(screen.getByRole('button', { name: `Edit ${draftFaq.question}` }));
    const editDialog = await screen.findByRole('dialog', { name: 'Edit FAQ' });
    fireEvent.change(within(editDialog).getByLabelText('Judul Pertanyaan'), { target: { value: 'Regulasi layanan tashih' } });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Simpan Draft' }));
    await waitFor(() => expect(faqApi.update).toHaveBeenCalledWith('faq-1', expect.objectContaining({
      question: 'Regulasi layanan tashih',
      is_published: false,
    })));

    fireEvent.click(screen.getByRole('button', { name: `Hapus ${draftFaq.question}` }));
    const deleteDialog = screen.getByRole('dialog', { name: 'Hapus FAQ?' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(faqApi.delete).toHaveBeenCalledWith('faq-1'));
  });
});
