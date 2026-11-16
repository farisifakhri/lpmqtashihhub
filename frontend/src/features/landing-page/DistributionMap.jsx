import { useEffect, useState } from 'react';
import { Icon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { publicApi } from '@/api/public.api';

const publisherMarkerIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Titik berasal dari penerbit yang sudah disetujui admin dan menandai lokasi kantornya saat mendaftar.
// Prop `publishers` dipakai bila data sudah tersedia (mis. tes); tanpa prop, data diambil dari API publik.
export const DistributionMap = ({ publishers: providedPublishers }) => {
  const [fetched, setFetched] = useState({ status: providedPublishers ? 'ready' : 'loading', items: [] });

  useEffect(() => {
    if (providedPublishers) return undefined;
    let active = true;
    publicApi
      .publisherMap()
      .then((response) => active && setFetched({ status: 'ready', items: Array.isArray(response?.data) ? response.data : [] }))
      .catch(() => active && setFetched({ status: 'error', items: [] }));
    return () => {
      active = false;
    };
  }, [providedPublishers]);

  const publishers = providedPublishers || fetched.items;
  const status = providedPublishers ? 'ready' : fetched.status;

  return (
    <section
      id="peta-persebaran-penerbit"
      className="relative isolate z-0 space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-8"
      aria-labelledby="distribution-map-title"
    >
      <div className="border-b border-line pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-fg">
          Sebaran Penerbit
        </span>
        <h2 id="distribution-map-title" className="mt-1 text-2xl font-black text-ink">
          Peta Persebaran Penerbit Mushaf Al-Qur’an
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted sm:text-sm">
          Lokasi penerbit mushaf Al-Qur’an yang telah terverifikasi LPMQ. Pilih penanda untuk melihat nama dan alamat.
        </p>
      </div>

      <p className="text-xs text-ink-muted sm:text-sm" role="status" aria-live="polite">
        {status === 'loading' && 'Memuat peta persebaran penerbit…'}
        {status === 'error' && 'Data persebaran penerbit belum dapat dimuat. Silakan coba beberapa saat lagi.'}
        {status === 'ready' && (publishers.length > 0
          ? `${publishers.length} penerbit terverifikasi ditampilkan pada peta.`
          : 'Belum ada penerbit terverifikasi yang mencantumkan titik lokasi kantor.')}
      </p>

      <div className="distribution-map relative isolate z-0 h-80 w-full min-w-0 overflow-hidden rounded-xl border border-line sm:h-96">
        <MapContainer
          center={[-2.5, 118]}
          zoom={4}
          minZoom={3}
          scrollWheelZoom
          className="relative z-0 h-full w-full"
          aria-label="Peta persebaran penerbit mushaf Al-Qur’an terverifikasi di Indonesia"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {publishers.map((publisher) => (
            <Marker
              key={publisher.id}
              position={[publisher.latitude, publisher.longitude]}
              icon={publisherMarkerIcon}
              title={publisher.name}
            >
              <Popup>
                <div className="space-y-1">
                  <h3 className="font-semibold">{publisher.name}</h3>
                  <p>{publisher.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
};

export default DistributionMap;
