import { Icon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { simulatedPublishers } from './distributionPublishers';

const publisherMarkerIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const DistributionMap = ({ publishers = simulatedPublishers }) => (
  <section
    id="peta-persebaran-penerbit"
    className="rounded-2xl border border-line bg-surface p-6 sm:p-8 space-y-5"
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
        Jelajahi lokasi penerbit pada peta. Pilih penanda untuk melihat nama dan alamat.
      </p>
    </div>

    <p
      className="rounded-lg border border-civic-warningLine bg-civic-warningSoft px-4 py-3 text-xs text-civic-warning sm:text-sm"
      role="note"
    >
      Data simulasi untuk demonstrasi. Nama dan lokasi di peta bukan data penerbit resmi LPMQ.
    </p>

    <div className="distribution-map h-80 overflow-hidden rounded-xl border border-line sm:h-96">
      <MapContainer
        center={[-2.5, 118]}
        zoom={4}
        minZoom={3}
        scrollWheelZoom
        className="h-full w-full"
        aria-label="Peta simulasi persebaran penerbit di Indonesia"
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

export default DistributionMap;
