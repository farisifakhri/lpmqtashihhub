import { describe, it, expect } from 'vitest';
import {
  formatDocumentType,
  formatDocumentStatus,
  formatRegistrationStatus,
  formatHandoverStatus,
  formatRevisionKind,
  formatStage,
  formatRecapScope,
  formatCourier,
  formatFileType,
  formatRole,
  formatUserStatus,
} from './glossary';

describe('Glosarium & Formatters Narasi Resmi (B-12)', () => {
  it('formats document types accurately to friendly Indonesian text', () => {
    expect(formatDocumentType('SURAT_TANDA_TASHIH')).toBe('Surat Tanda Tashih (STT)');
    expect(formatDocumentType('SURAT_HASIL_VERIFIKASI')).toBe('Surat Hasil Verifikasi Berkas & Naskah');
    expect(formatDocumentType('REVISION_RETURN_LETTER')).toBe('Surat Pengembalian Naskah Perbaikan');
    expect(formatDocumentType(null)).toBe('-');
    expect(formatDocumentType('UNKNOWN_DOC')).toBe('UNKNOWN DOC');
  });

  it('formats document status properly without raw system codes', () => {
    expect(formatDocumentStatus('DRAFT')).toBe('Draf Dokumen');
    expect(formatDocumentStatus('ISSUED')).toBe('Resmi Diterbitkan');
    expect(formatDocumentStatus('SUPERSEDED')).toBe('Digantikan Versi Baru');
    expect(formatDocumentStatus(null)).toBe('-');
  });

  it('formats registration status with Indonesian official terms', () => {
    expect(formatRegistrationStatus('READY_FOR_VERIFICATION')).toBe('Menunggu Penugasan Verifikator');
    expect(formatRegistrationStatus('IN_VERIFICATION')).toBe('Sedang Diverifikasi');
    expect(formatRegistrationStatus('AWAITING_PAYMENT')).toBe('Menunggu Pembayaran PNBP');
    expect(formatRegistrationStatus('TASHIH_IN_PROGRESS')).toBe('Sidang Tashih Berjalan');
    expect(formatRegistrationStatus(null)).toBe('Proses Verifikasi');
  });

  it('formats handover status, stage, revision kind and recap scope', () => {
    expect(formatHandoverStatus('CONFIRMED')).toBe('Dikonfirmasi / Selesai');
    expect(formatRevisionKind('NASKAH_DUMI')).toBe('Naskah Dumi (Pra-Cetak)');
    expect(formatStage('DUMMY')).toBe('Tashih Tahap Dumi (Pra-Cetak)');
    expect(formatRecapScope('TEAM')).toBe('Mewakili Tim (Kolektif)');
    expect(formatCourier('LOKET_LPMQ')).toBe('Serah Langsung ke Loket LPMQ');
    expect(formatFileType('COVER')).toBe('Sampul / Cover Naskah');
    expect(formatRole('ADMIN_INTERNAL')).toBe('Helper Admin Loket');
    expect(formatUserStatus('ACTIVE')).toBe('Aktif');
  });
});

