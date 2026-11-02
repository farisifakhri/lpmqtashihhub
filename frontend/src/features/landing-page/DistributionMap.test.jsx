import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import DistributionMap from './DistributionMap';
import { simulatedPublishers } from './distributionPublishers';

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

describe('DistributionMap', () => {
  it('renders the simulation notice, OpenStreetMap tiles, and all dummy publisher markers', () => {
    render(<DistributionMap />);

    expect(
      screen.getByRole('heading', { name: /Peta Persebaran Penerbit Mushaf Al-Qur’an/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/bukan data penerbit resmi/i);
    expect(screen.getByTestId('tile-layer')).toHaveAttribute(
      'data-url',
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    );
    expect(screen.getByTestId('tile-layer')).toHaveAttribute(
      'data-attribution',
      expect.stringContaining('OpenStreetMap')
    );

    const map = screen.getByTestId('map-container');
    expect(map).toHaveAttribute('data-center', JSON.stringify([-2.5, 118]));
    expect(map).toHaveAttribute('data-zoom', '4');
    expect(map).toHaveAttribute('data-scroll-wheel-zoom', 'true');

    const markers = screen.getAllByTestId('publisher-marker');
    expect(markers).toHaveLength(simulatedPublishers.length);

    simulatedPublishers.forEach((publisher, index) => {
      expect(markers[index]).toHaveAttribute(
        'data-position',
        JSON.stringify([publisher.latitude, publisher.longitude])
      );
      const popup = within(markers[index]).getByTestId('publisher-popup');
      expect(popup).toHaveTextContent(publisher.name);
      expect(popup).toHaveTextContent(publisher.address);
    });
  });

  it('accepts publisher records from an API-shaped prop', () => {
    const publishers = [
      {
        id: 'api-publisher-1',
        name: 'Penerbit Uji',
        address: 'Kota Uji, Indonesia',
        latitude: -6.2,
        longitude: 106.8,
      },
    ];

    render(<DistributionMap publishers={publishers} />);

    expect(screen.getAllByTestId('publisher-marker')).toHaveLength(1);
    expect(screen.getByText('Penerbit Uji')).toBeInTheDocument();
    expect(screen.getByText('Kota Uji, Indonesia')).toBeInTheDocument();
  });
});
