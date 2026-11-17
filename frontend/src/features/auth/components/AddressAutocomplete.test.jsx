import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddressAutocomplete, formatAdminAddress, formatNominatimFeature, formatPhotonFeature, splitUnit } from './AddressAutocomplete';

const flyTo = vi.fn();
const mapHandlers = {};

vi.mock('react-leaflet', async () => {
  const { createElement } = await import('react');
  return {
    MapContainer: ({ children }) => createElement('div', { 'data-testid': 'map' }, children),
    TileLayer: () => null,
    Popup: ({ children }) => createElement('div', null, children),
    Marker: ({ children, position, title, draggable, eventHandlers }) =>
      createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'marker',
          'data-position': JSON.stringify(position),
          'data-draggable': String(Boolean(draggable)),
          'aria-label': title,
          onClick: eventHandlers?.click,
          // simulasi drag: geser pin ke titik tetap
          onDoubleClick: () => eventHandlers?.dragend?.({ target: { getLatLng: () => ({ lat: -6.3011, lng: 106.8961 }) } }),
        },
        children
      ),
    useMap: () => ({ flyTo }),
    useMapEvents: (handlers) => Object.assign(mapHandlers, handlers),
  };
});

// Data nyata (dipangkas) dari Photon /api dan Nominatim /reverse?format=geocodejson untuk area TMII.
const tmii = {
  geometry: { type: 'Point', coordinates: [106.895, -6.302] },
  properties: { name: 'Taman Mini Indonesia Indah', street: 'Jalan Taman Mini', locality: 'TMII', district: 'Cipayung', city: 'Jakarta', state: 'Jawa' },
};
const tmiiPhotonFull = 'Taman Mini Indonesia Indah, Jalan Taman Mini, TMII, Cipayung, Jakarta, Jawa';
const tmiiGeocoding = {
  name: 'Dakota RI-001 Seulawah',
  street: 'Jalan Taman Mini',
  postcode: '13810',
  admin: { level7: 'Taman Mini Indonesia Indah (TMII)', level6: 'Cipayung', level5: 'Jakarta Timur', level4: 'Daerah Khusus Ibukota Jakarta' },
};
const tmiiFull = 'Taman Mini Indonesia Indah, Jalan Taman Mini, Taman Mini Indonesia Indah (TMII), Kec. Cipayung, Jakarta Timur, Daerah Khusus Ibukota Jakarta, 13810';

const respond = (body) => ({ ok: true, json: async () => body });
const mockServices = ({ photon = [tmii], geocoding = tmiiGeocoding, nominatimFails = false } = {}) =>
  fetch.mockImplementation(async (url) => {
    if (url.includes('nominatim')) {
      if (nominatimFails) throw new Error('offline');
      return respond({ features: [{ properties: { geocoding } }] });
    }
    return respond({ features: photon });
  });
const nominatimCalls = () => fetch.mock.calls.map(([url]) => url).filter((url) => url.includes('nominatim'));

const Harness = () => {
  const [value, setValue] = useState('');
  return <AddressAutocomplete id="alamat" value={value} onChange={setValue} />;
};

describe('AddressAutocomplete', () => {
  beforeEach(() => {
    localStorage.clear();
    flyTo.mockClear();
    vi.stubGlobal('fetch', vi.fn());
    mockServices();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('merangkai fitur Photon menjadi judul, detail, alamat lengkap, dan koordinat', () => {
    expect(formatPhotonFeature(tmii)).toEqual({
      title: 'Taman Mini Indonesia Indah',
      street: 'Jalan Taman Mini',
      detail: 'Jalan Taman Mini, TMII, Cipayung, Jakarta, Jawa',
      full: tmiiPhotonFull,
      lat: -6.302,
      lon: 106.895,
    });
  });

  it('merangkai jenjang wilayah Nominatim sampai kecamatan, termasuk daerah kabupaten', () => {
    expect(formatAdminAddress(tmiiGeocoding)).toBe(
      'Dakota RI-001 Seulawah, Jalan Taman Mini, Taman Mini Indonesia Indah (TMII), Kec. Cipayung, Jakarta Timur, Daerah Khusus Ibukota Jakarta, 13810'
    );
    // Cibinong: desa dan kecamatan bernama sama tetap keduanya tampil
    expect(formatAdminAddress({ postcode: '16911', admin: { level7: 'Cibinong', level6: 'Cibinong', level5: 'Bogor', level4: 'Jawa Barat' } })).toBe(
      'Cibinong, Kec. Cibinong, Bogor, Jawa Barat, 16911'
    );
  });

  it('memilih saran: field terisi, peta terbang, lalu alamat dilengkapi kecamatan dari Nominatim', async () => {
    render(<Harness />);
    const field = screen.getByRole('combobox');

    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'tmii' } });

    const option = await screen.findByRole('option', { name: /Taman Mini Indonesia Indah/ });
    expect(fetch.mock.calls[0][0]).toContain('photon.komoot.io/api/?q=tmii');
    expect(fetch.mock.calls[0][0]).toContain('bbox=95%2C-11%2C141%2C6');

    fireEvent.mouseDown(option);
    expect(field).toHaveValue(tmiiPhotonFull);
    expect(flyTo).toHaveBeenCalledWith([-6.302, 106.895], 18);

    await waitFor(() => expect(field).toHaveValue(tmiiFull));
    expect(nominatimCalls()[0]).toContain('/reverse?format=geocodejson');
    expect(nominatimCalls()[0]).toContain('lat=-6.302&lon=106.895');
    expect(flyTo).toHaveBeenCalledTimes(1); // pelengkapan alamat tidak menggeser peta lagi
    expect(screen.getByRole('button', { name: tmiiFull })).toHaveAttribute('data-draggable', 'true');
    // riwayat menyimpan versi lengkap saja, bukan versi sementara dari Photon
    expect(JSON.parse(localStorage.getItem('lpmq:recent-addresses'))).toEqual([{ full: tmiiFull, lat: -6.302, lon: 106.895 }]);

    // Field dikosongkan: riwayat Terbaru muncul dan bisa dihapus
    fireEvent.change(field, { target: { value: '' } });
    expect(screen.getByText('Terbaru')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: /Hapus dari riwayat/ }));
    expect(localStorage.getItem('lpmq:recent-addresses')).toBe('[]');
  });

  it('tidak menimpa ketikan pengguna bila ia mengedit sebelum kecamatan selesai diambil', async () => {
    let releaseNominatim;
    fetch.mockImplementation(async (url) => {
      if (!url.includes('nominatim')) return respond({ features: [tmii] });
      await new Promise((resolve) => { releaseNominatim = resolve; });
      return respond({ features: [{ properties: { geocoding: tmiiGeocoding } }] });
    });
    render(<Harness />);
    const field = screen.getByRole('combobox');
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'tmii' } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: /Taman Mini Indonesia Indah/ }));

    await waitFor(() => expect(releaseNominatim).toBeTypeOf('function'));
    fireEvent.change(field, { target: { value: `${tmiiPhotonFull} No. 5` } });
    releaseNominatim();

    await waitFor(() => expect(nominatimCalls()).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(field).toHaveValue(`${tmiiPhotonFull} No. 5`);
  });

  it('menampilkan alamat terbaru sebagai pin di peta, dan klik pin mengisi field tanpa request baru', () => {
    localStorage.setItem('lpmq:recent-addresses', JSON.stringify([{ full: tmiiFull, lat: -6.302, lon: 106.895 }, 'Alamat lama tanpa koordinat']));
    render(<Harness />);

    expect(screen.getAllByTestId('marker')).toHaveLength(1); // entri lama tanpa koordinat tidak punya pin
    fireEvent.click(screen.getByRole('button', { name: `Terbaru: ${tmiiFull}` }));

    expect(screen.getByRole('combobox')).toHaveValue(tmiiFull);
    expect(flyTo).toHaveBeenCalledWith([-6.302, 106.895], 18);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('klik peta atau geser pin mengambil alamat sampai kecamatan untuk titik pilihan pengguna, tanpa menggeser peta', async () => {
    render(<Harness />);
    const field = screen.getByRole('combobox');

    mapHandlers.click({ latlng: { lat: -6.30115, lng: 106.89615 } });

    const pinFull = formatAdminAddress(tmiiGeocoding);
    await waitFor(() => expect(field).toHaveValue(pinFull));
    expect(pinFull).toContain('Kec. Cipayung');
    expect(nominatimCalls()[0]).toContain('lat=-6.30115&lon=106.89615');
    expect(flyTo).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('lpmq:recent-addresses'))[0]).toMatchObject({ lat: -6.30115, lon: 106.89615 });

    // geser pin: titik baru dipakai (menunggu jeda 1 detik antar-request Nominatim)
    fireEvent.doubleClick(screen.getByRole('button', { name: pinFull }));
    await waitFor(
      () => expect(JSON.parse(localStorage.getItem('lpmq:recent-addresses'))[0]).toMatchObject({ lat: -6.3011, lon: 106.8961 }),
      { timeout: 2500 }
    );
    expect(nominatimCalls()).toHaveLength(2);
    expect(flyTo).not.toHaveBeenCalled();
  });

  it('klik peta saat layanan gagal: pin tetap pindah, teks alamat tidak ditimpa', async () => {
    mockServices({ nominatimFails: true });
    render(<Harness />);
    const field = screen.getByRole('combobox');
    fireEvent.change(field, { target: { value: 'Jl. Percetakan No. 12' } });

    mapHandlers.click({ latlng: { lat: -6.3, lng: 106.9 } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Jl. Percetakan No. 12' })).toHaveAttribute('data-position', '[-6.3,106.9]'));
    await waitFor(() => expect(nominatimCalls()).toHaveLength(1));
    expect(field).toHaveValue('Jl. Percetakan No. 12');
  });

  it('Enter / tombol cari menampilkan hasil lengkap OpenStreetMap (Nominatim) berlabel jenis tempat sampai kecamatan', async () => {
    // Data nyata (dipangkas) dari Nominatim /search?q=jalan&countrycodes=id
    const searchFeatures = [
      {
        geometry: { coordinates: [106.8362126, -6.1682964] },
        properties: { geocoding: { osm_value: 'park', name: 'Lapangan Kemenkeu', postcode: '10710', admin: { level7: 'Pasar Baru', level6: 'Sawah Besar', level5: 'Jakarta Pusat', level4: 'Daerah Khusus Ibukota Jakarta' } } },
      },
      {
        geometry: { coordinates: [106.7810725, -6.200024] },
        properties: { geocoding: { osm_value: 'residential', name: 'Jalan', postcode: '11540', admin: { level7: 'Kebon Jeruk', level6: 'Kebon Jeruk', level5: 'Jakarta Barat', level4: 'Daerah Khusus Ibukota Jakarta' } } },
      },
    ];
    expect(formatNominatimFeature(searchFeatures[0])).toEqual({
      typeLabel: 'Taman',
      title: 'Lapangan Kemenkeu',
      detail: 'Pasar Baru, Kec. Sawah Besar, Jakarta Pusat, Daerah Khusus Ibukota Jakarta, 10710',
      full: 'Lapangan Kemenkeu, Pasar Baru, Kec. Sawah Besar, Jakarta Pusat, Daerah Khusus Ibukota Jakarta, 10710',
      lat: -6.1682964,
      lon: 106.8362126,
    });

    fetch.mockImplementation(async (url) => respond({ features: url.includes('nominatim') ? searchFeatures : [] }));
    render(<Harness />);
    const field = screen.getByRole('combobox');
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'jalan' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    const kemenkeu = await screen.findByRole('option', { name: /Taman · Lapangan Kemenkeu/ });
    expect(screen.getByRole('listbox', { name: 'Hasil OpenStreetMap' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Jalan Perumahan · Jalan Kebon Jeruk, Kec. Kebon Jeruk/ })).toBeInTheDocument();
    expect(nominatimCalls()[0]).toContain('/search?format=geocodejson&addressdetails=1&accept-language=id&q=jalan&countrycodes=id&limit=10');

    // hasil OSM sudah lengkap: dipilih langsung, tanpa request reverse tambahan
    fireEvent.mouseDown(kemenkeu);
    expect(field).toHaveValue('Lapangan Kemenkeu, Pasar Baru, Kec. Sawah Besar, Jakarta Pusat, Daerah Khusus Ibukota Jakarta, 10710');
    expect(flyTo).toHaveBeenCalledWith([-6.1682964, 106.8362126], 18);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(nominatimCalls()).toHaveLength(1);
  });

  it('memisahkan nomor rumah/blok/RT-RW dari kata kunci, karena OSM jarang memilikinya', () => {
    expect(splitUnit('Griya Rosa Indah No.150')).toEqual({ query: 'Griya Rosa Indah', unit: 'No.150' });
    expect(splitUnit('Jl. Merdeka No. 12, RT 01/RW 02, Bandung')).toEqual({ query: 'Jl. Merdeka, Bandung', unit: 'No. 12 RT 01/RW 02' });
    expect(splitUnit('Perum Griya Blok C2 Nomor 5')).toEqual({ query: 'Perum Griya', unit: 'Blok C2 Nomor 5' });
    expect(splitUnit('Jalan Nogososro')).toEqual({ query: 'Jalan Nogososro', unit: '' }); // "No" di dalam kata tidak terpotong
  });

  it('mencari tanpa nomor rumah, lalu nomor itu dipasang kembali ke alamat yang dipilih', async () => {
    const feature = {
      geometry: { coordinates: [103.61, -1.61] },
      properties: { geocoding: { osm_value: 'residential', name: 'Jalan Griya Indah', admin: { level7: 'Telanaipura', level6: 'Telanaipura', level5: 'Jambi', level4: 'Jambi' } } },
    };
    fetch.mockImplementation(async (url) => respond({ features: url.includes('nominatim') ? [feature] : [] }));
    render(<Harness />);
    const field = screen.getByRole('combobox');
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'Jalan Griya Indah No.150' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    fireEvent.mouseDown(await screen.findByRole('option', { name: /Jalan Griya Indah/ }));
    expect(nominatimCalls()[0]).toContain('q=Jalan+Griya+Indah&');
    expect(field).toHaveValue('Jalan Griya Indah No.150, Telanaipura, Kec. Telanaipura, Jambi');
  });

  it('pencarian OSM tanpa hasil memberi pesan, dan tombol cari bekerja seperti Enter', async () => {
    fetch.mockImplementation(async () => respond({ features: [] }));
    render(<Harness />);
    const field = screen.getByRole('combobox');
    const searchButton = screen.getByRole('button', { name: 'Cari alamat di OpenStreetMap' });
    expect(searchButton).toBeDisabled();

    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'zzzz tidak ada' } });
    fireEvent.click(searchButton);

    expect(await screen.findByText(/“zzzz tidak ada” belum ada di data OpenStreetMap/)).toBeInTheDocument();
  });

  it('melaporkan titik pin ke formulir lewat onLocationChange (pilih alamat maupun klik peta)', async () => {
    const onLocationChange = vi.fn();
    const WithLocation = () => {
      const [value, setValue] = useState('');
      return <AddressAutocomplete id="alamat" value={value} onChange={setValue} onLocationChange={onLocationChange} />;
    };
    localStorage.setItem('lpmq:recent-addresses', JSON.stringify([{ full: tmiiFull, lat: -6.302, lon: 106.895 }]));
    mockServices({ nominatimFails: true });
    render(<WithLocation />);

    fireEvent.click(screen.getByRole('button', { name: `Terbaru: ${tmiiFull}` }));
    expect(onLocationChange).toHaveBeenLastCalledWith({ lat: -6.302, lon: 106.895 });

    mapHandlers.click({ latlng: { lat: -6.31, lng: 106.9 } });
    await waitFor(() => expect(onLocationChange).toHaveBeenLastCalledWith({ lat: -6.31, lon: 106.9 }));
  });

  it('tetap bisa diketik manual tanpa saran saat layanan peta gagal', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    render(<Harness />);
    const field = screen.getByRole('combobox');

    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'Jl. Percetakan' } });

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(field).toHaveValue('Jl. Percetakan');
  });
});
