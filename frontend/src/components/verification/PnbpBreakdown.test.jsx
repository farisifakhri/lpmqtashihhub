import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PnbpBreakdown } from './PnbpBreakdown';

describe('B-22: PnbpBreakdown Component', () => {
  it('B22-T1 & B22-T2: Menampilkan tabel rincian tarif dan label resmi Rp 0 (Bebas Tarif)', () => {
    const zeroSnapshot = {
      base_fee: 0,
      total_fee: 0,
      sla_initial_days: 15,
      manuscripts: [
        {
          seq_number: 1,
          title: "Mushaf Khusus Hafalan",
          dasar: "JUZ30",
          fee: 0,
          sla_initial: 15,
        },
      ],
    };

    render(<PnbpBreakdown feeSlaSnapshot={zeroSnapshot} />);

    expect(screen.getByTestId('pnbp-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('pnbp-breakdown-total')).toHaveTextContent('Rp 0 (Bebas Tarif)');
    expect(
      screen.getByText(/Tarif PNBP dikalikan dengan jumlah ukuran naskah sesuai PP No\. 59 Tahun 2020/i)
    ).toBeInTheDocument();
  });

  it('Menampilkan rincian naskah multi-ukuran dengan subtotal dan total akurat', () => {
    const multiSnapshot = {
      base_fee: 2500000,
      total_fee: 2500000,
      sla_initial_days: 30,
      manuscripts: [
        {
          seq_number: 1,
          title: "Mushaf Standar Indonesia Ukuran A4",
          dasar: "JUZ30",
          fee: 1500000,
          sla_initial: 20,
          variants: [{ ukuran: 'A4 (21 x 29,7 cm)', oplah: 5000 }],
        },
        {
          seq_number: 2,
          title: "Mushaf Standar Indonesia Ukuran B5",
          dasar: "JUZ30",
          fee: 1000000,
          sla_initial: 15,
          variants: [{ ukuran: 'B5 (17,6 x 25 cm)', oplah: 3000 }],
        },
      ],
    };

    render(<PnbpBreakdown feeSlaSnapshot={multiSnapshot} />);

    expect(screen.getByText('Mushaf Standar Indonesia Ukuran A4')).toBeInTheDocument();
    expect(screen.getByText('Mushaf Standar Indonesia Ukuran B5')).toBeInTheDocument();
    expect(screen.getByText(/Ukuran: A4 \(21 x 29,7 cm\) \(5000 ekspl\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('pnbp-breakdown-total')).toHaveTextContent(/Rp\s*2\.500\.000/);
  });
});
