import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DistributionMap from './DistributionMap';
import { publicApi } from '@/api/public.api';

vi.mock('@/api/public.api', () => ({ publicApi: { publisherMap: vi.fn() } }));

vi.mock('react-leaflet', async () => {
  const { createElement } = await import('react');

  return {
    MapContainer: ({ children, center, zoom, scrollWheelZoom, ...props }) =>
      createElement(
        'div',
        {
          ...props,
          'data-testid': 'map-container',
          'data-center': JSON.stringify(center),
          'data-zoom': zoom,
          'data-scroll-wheel-zoom': scrollWheelZoom,
        },
        children
      ),
    Marker: ({ children, position }) =>
      createElement(
        'div',
        { 'data-testid': 'publisher-marker', 'data-position': JSON.stringify(position) },
        children
      ),
    Popup: ({ children }) => createElement('div', { 'data-testid': 'publisher-popup' }, children),
    TileLayer: ({ attribution, url }) =>
      createElement('div', {
        'data-testid': 'tile-layer',
        'data-attribution': attribution,
        'data-url': url,
      }),
  };
});

const verifiedPublishers = [
  { id: 'pub-1', name: 'PT Pustaka Uji', address: 'Kec. Cipayung, Jakarta Timur', latitude: -6.30115, longitude: 106.89615 },
  { id: 'pub-2', name: 'Yayasan Mushaf Uji', address: 'Kec. Sumur Bandung, Kota Bandung', latitude: -6.9147, longitude: 107.6098 },
];

describe('DistributionMap', () => {
  beforeEach(() => {
    publicApi.publisherMap.mockReset();
  });

  it('memuat penerbit terverifikasi dari API publik dan menampilkan penanda beserta nama & alamat', async () => {
    publicApi.publisherMap.mockResolvedValue({ success: true, data: verifiedPublishers });
    render(<DistributionMap />);

    expect(screen.getByRole('status')).toHaveTextContent(/Memuat peta/);
    expect(await screen.findByText('2 penerbit terverifikasi ditampilkan pada peta.')).toBeInTheDocument();
    expect(screen.queryByText(/simulasi/i)).not.toBeInTheDocument();
    expect(publicApi.publisherMap).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-attribution', expect.stringContaining('OpenStreetMap'));
    const map = screen.getByTestId('map-container');
    expect(map).toHaveAttribute('data-center', JSON.stringify([-2.5, 118]));
    expect(map).toHaveAttribute('data-zoom', '4');

    const markers = screen.getAllByTestId('publisher-marker');
    expect(markers).toHaveLength(2);
    verifiedPublishers.forEach((publisher, index) => {
      expect(markers[index]).toHaveAttribute('data-position', JSON.stringify([publisher.latitude, publisher.longitude]));
      const popup = within(markers[index]).getByTestId('publisher-popup');
      expect(popup).toHaveTextContent(publisher.name);
      expect(popup).toHaveTextContent(publisher.address);
    });
  });

  it('memberi keterangan saat belum ada penerbit bertitik', async () => {
    publicApi.publisherMap.mockResolvedValue({ success: true, data: [] });
    render(<DistributionMap />);

    expect(await screen.findByText(/Belum ada penerbit terverifikasi/)).toBeInTheDocument();
    expect(screen.queryAllByTestId('publisher-marker')).toHaveLength(0);
  });

  it('peta tetap tampil dengan pesan saat API gagal', async () => {
    publicApi.publisherMap.mockRejectedValue(new Error('network'));
    render(<DistributionMap />);

    expect(await screen.findByText(/belum dapat dimuat/)).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('memakai data dari prop tanpa memanggil API', () => {
    render(<DistributionMap publishers={[verifiedPublishers[0]]} />);

    expect(screen.getAllByTestId('publisher-marker')).toHaveLength(1);
    expect(screen.getByText('PT Pustaka Uji')).toBeInTheDocument();
    expect(publicApi.publisherMap).not.toHaveBeenCalled();
  });
});
