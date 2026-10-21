import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerificationCalculatorTab } from './VerificationCalculatorTab';

describe('B-01 Sesi 3: Verifier Workbench Calculator Tab (U-14)', () => {
  it('B-01 CALC-1: Menghitung T1 - 30 Juz murni = Rp 1.000.000, 15 HK', () => {
    render(<VerificationCalculatorTab />);

    // Default adalah 30 Juz
    expect(screen.getByTestId('summary-total-fee')).toHaveTextContent(/1\.000\.000/);
    expect(screen.getByTestId('summary-sla-initial')).toHaveTextContent('15'); // SLA Perdana 15 HK
    expect(screen.getByTestId('summary-sla-revision')).toHaveTextContent('7');  // SLA Revisi 7 HK
    expect(screen.getByTestId('summary-sla-dummy')).toHaveTextContent('3');     // SLA Dumi 3 HK
  });

  it('B-01 CALC-2: Menghitung T4 - 30 Juz + Perkata + Transliterasi + Tajwid = Rp 3.000.000, 59 HK', () => {
    render(<VerificationCalculatorTab />);

    // Toggle Perkata (2 unit = Rp 1.000.000, +30 HK)
    const perkataCheckbox = screen.getByRole('checkbox', { name: 'Terjemah/Transliterasi Perkata' });
    fireEvent.click(perkataCheckbox);

    // Toggle Transliterasi (1 unit = Rp 500.000, +7 HK)
    const transliterasiCheckbox = screen.getByRole('checkbox', { name: 'Transliterasi' });
    fireEvent.click(transliterasiCheckbox);

    // Toggle Tajwid (1 unit = Rp 500.000, +7 HK)
    const tajwidCheckbox = screen.getByRole('checkbox', { name: 'Tajwid Warna / Kode Tajwid' });
    fireEvent.click(tajwidCheckbox);

    // Total Fee: 1jt + 1jt + 500k + 500k = Rp 3.000.000
    expect(screen.getByTestId('summary-total-fee')).toHaveTextContent(/3\.000\.000/);
    // SLA Perdana: 15 + 30 + 7 + 7 = 59 HK
    expect(screen.getByTestId('summary-sla-initial')).toHaveTextContent('59');
    // SLA Revisi: 7 + 15 + 5 + 5 = 32 HK
    expect(screen.getByTestId('summary-sla-revision')).toHaveTextContent('32');
    // SLA Dumi: 3 + 9 + 4 + 4 = 20 HK
    expect(screen.getByTestId('summary-sla-dummy')).toHaveTextContent('20');
  });

  it('B-01 CALC-3: Menghitung T5 - Absorpsi Terjemah oleh Perkata/Tafsir (Terjemah Rp 0 & 0 HK)', () => {
    render(<VerificationCalculatorTab />);

    // Pilih Terjemah
    const terjemahCheckbox = screen.getByRole('checkbox', { name: 'Terjemah' });
    fireEvent.click(terjemahCheckbox);

    // Pilih Perkata -> Terjemah harus diserap
    const perkataCheckbox = screen.getByRole('checkbox', { name: 'Terjemah/Transliterasi Perkata' });
    fireEvent.click(perkataCheckbox);

    // Total tetap Rp 2.000.000 (Terjemah tidak ditagih ganda)
    expect(screen.getByTestId('summary-total-fee')).toHaveTextContent(/2\.000\.000/);
    expect(screen.getByTestId('summary-sla-initial')).toHaveTextContent('45'); // 15 + 30 = 45 HK

    // Muncul indikator absorpsi
    expect(
      screen.getByText(/Terjemah diserap \(Rp 0 & 0 HK\) oleh Perkata\/Tafsir/i)
    ).toBeInTheDocument();
  });

  it('B-01 CALC-4: Menghitung T6 & T5 Plafon - SLA perdana dibatasi maksimal 60 HK', () => {
    render(<VerificationCalculatorTab />);

    // 30 Juz (15) + Tafsir (30) + Perkata (30) -> Raw SLA = 75 HK -> Dicap 60 HK
    const tafsirCheckbox = screen.getByRole('checkbox', { name: 'Tafsir' });
    fireEvent.click(tafsirCheckbox);

    const perkataCheckbox = screen.getByRole('checkbox', { name: 'Terjemah/Transliterasi Perkata' });
    fireEvent.click(perkataCheckbox);

    expect(screen.getByTestId('summary-sla-initial')).toHaveTextContent('60');
    expect(screen.getByText('(Maksimal 60 HK per aturan)')).toBeInTheDocument();

    // SLA Revisi tidak dicap (7 + 15 + 15 = 37 HK)
    expect(screen.getByTestId('summary-sla-revision')).toHaveTextContent('37');
  });

  it('B-01 CALC-5: Multi-naskah simulasi menjumlahkan tarif dan mengambil SLA terpanjang', () => {
    render(<VerificationCalculatorTab />);

    // Naskah 1: 30 Juz = Rp 1.000.000, 15 HK
    // Tambah naskah 2
    const addBtn = screen.getByRole('button', { name: /Tambah Naskah/i });
    fireEvent.click(addBtn);

    // Ubah naskah 2 jadi Yasin (Rp 500.000, 5 HK)
    const yasinButtons = screen.getAllByRole('button', { name: 'Surah Yasin dan Bacaan Tahlil' });
    fireEvent.click(yasinButtons[1]); // Klik tombol Yasin pada naskah ke-2

    // Total Tarif Pengajuan = 1.000.000 + 500.000 = Rp 1.500.000
    expect(screen.getByTestId('summary-total-fee')).toHaveTextContent(/1\.500\.000/);

    // SLA Pengajuan memakai naskah terpanjang = max(15, 5) = 15 HK
    expect(screen.getByTestId('summary-sla-initial')).toHaveTextContent('15');
  });
});
