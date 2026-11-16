import { useEffect, useId, useRef, useState } from "react";
import { Clock, MapPin, Search, X } from "lucide-react";
import { Icon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIconRetina from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const pinIcon = new Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
// Pin riwayat dibuat lebih kecil & samar agar lokasi terpilih tetap menonjol.
const recentPinIcon = new Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [18, 30],
    iconAnchor: [9, 30],
    popupAnchor: [1, -26],
    shadowSize: [30, 30],
    className: "opacity-60",
});
const INDONESIA_CENTER = [-2.5, 118];
const BUILDING_ZOOM = 18; // cukup dekat untuk membedakan gedung/persil

// Photon (komoot) = geocoder berbasis OpenStreetMap yang memang mengizinkan search-as-you-type (Nominatim tidak).
// shortcut: server publik Photon tanpa SLA, upgrade ke proxy backend / self-host bila trafik besar.
const PHOTON_URL = "https://photon.komoot.io/api/";
// Nominatim reverse (format geocodejson) memberi jenjang wilayah yang konsisten per admin_level; Photon tidak.
// Kebijakan Nominatim: maks 1 request/detik & dilarang untuk autocomplete, jadi hanya dipanggil saat pin ditetapkan.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_GAP_MS = 1000;
const INDONESIA_BBOX = "95,-11,141,6";
const RECENT_KEY = "lpmq:recent-addresses";
const MAX_RECENT = 5;
const MIN_CHARS = 3;
const DEBOUNCE_MS = 400;

// Riwayat hanya di browser pengguna sendiri: form ini publik, jadi alamat penerbit lain tidak boleh ikut tampil.
// Entri riwayat: { full, lat, lon }. Entri lama berupa string (tanpa koordinat) tetap dibaca, hanya tanpa pin.
const readRecent = () => {
    try {
        const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        if (!Array.isArray(list)) return [];
        return list
            .map((item) => (typeof item === "string" ? { full: item } : item))
            .filter((item) => typeof item?.full === "string");
    } catch {
        return [];
    }
};

const hasCoords = (item) => Number.isFinite(item?.lat) && Number.isFinite(item?.lon);

// Peta bergeser ke lokasi terpilih; komponen kosong karena hanya mengendalikan view Leaflet.
// Pin yang dipindah manual (fly: false) tidak menggeser peta, agar view tidak melompat saat pengguna menyetel titik.
function FlyTo({ target }) {
    const map = useMap();
    useEffect(() => {
        if (hasCoords(target) && target.fly !== false) map.flyTo([target.lat, target.lon], BUILDING_ZOOM);
    }, [map, target]);
    return null;
}

function MapClick({ onPick }) {
    useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
    return null;
}

const writeRecent = (list) => {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
        // storage diblokir (incognito/kebijakan browser): riwayat dilewati, form tetap jalan
    }
};

const unique = (parts) => parts.filter((part, index) => part && parts.indexOf(part) === index);

// OSM di Indonesia hampir tidak punya nomor rumah/blok/RT-RW; ikut dicari malah membuat hasil kosong.
// Bagian itu dipisah dari kata kunci lalu dipasang kembali ke alamat yang dipilih.
const UNIT_PATTERN = /\b(?:no(?:mor)?\.?\s*\d+[a-z]?|blok\s*[a-z]?\d*[a-z]?(?:\s*\/\s*\d+)?|kav(?:ling)?\.?\s*\d+[a-z]?|rt\.?\s*\d+(?:\s*\/\s*rw\.?\s*\d+)?|rw\.?\s*\d+)\b/gi;

export const splitUnit = (text) => {
    const units = text.match(UNIT_PATTERN) || [];
    const query = text.replace(UNIT_PATTERN, " ").replace(/\s*,\s*(,\s*)*/g, ", ").replace(/\s+/g, " ").replace(/^[\s,]+|[\s,]+$/g, "");
    return { query, unit: units.map((part) => part.trim()).join(" ") };
};

// "Griya X, Kel, Kec" + "No.150" -> "Griya X No.150, Kel, Kec"
const withUnit = (full, unit) => {
    if (!unit) return full;
    const [first, ...rest] = full.split(", ");
    return [`${first} ${unit}`, ...rest].join(", ");
};

export const formatPhotonFeature = ({ properties: p = {}, geometry }) => {
    const street = [p.street, p.housenumber].filter(Boolean).join(" ");
    const detail = unique([street, p.locality, p.district, p.city, p.county, p.state, p.postcode]);
    const title = p.name || street || p.city || p.state || "";
    const [lon, lat] = geometry?.coordinates || []; // GeoJSON: [lon, lat]
    return {
        title,
        street,
        detail: detail.filter((part) => part !== title).join(", "),
        full: unique([p.name, ...detail]).join(", "),
        lat,
        lon,
    };
};

// geocodejson untuk Indonesia: admin.level7 = kelurahan/desa, level6 = kecamatan, level5 = kab/kota, level4 = provinsi.
export const formatAdminAddress = (geocoding, { name = geocoding.name, street } = {}) => {
    const road = street ?? [geocoding.street, geocoding.housenumber].filter(Boolean).join(" ");
    const admin = geocoding.admin || {};
    return unique([
        name,
        road,
        admin.level7,
        admin.level6 && `Kec. ${admin.level6}`,
        admin.level5,
        admin.level4,
        geocoding.postcode,
    ]).join(", ");
};

// Label jenis tempat seperti daftar hasil di openstreetmap.org; nilai lain ditampilkan apa adanya.
const PLACE_TYPES = {
    motorway: "Jalan Tol",
    trunk: "Jalan Raya",
    primary: "Jalan Utama",
    secondary: "Jalan",
    tertiary: "Jalan",
    unclassified: "Jalan",
    residential: "Jalan Perumahan",
    service: "Jalan Akses",
    living_street: "Gang",
    footway: "Jalan Setapak",
    village: "Desa",
    hamlet: "Dusun",
    suburb: "Kelurahan",
    neighbourhood: "Lingkungan",
    quarter: "Lingkungan",
    city: "Kota",
    town: "Kota",
    administrative: "Wilayah",
    park: "Taman",
    farmland: "Lahan Pertanian",
    building: "Gedung",
    house: "Rumah",
    office: "Kantor",
    government: "Kantor Pemerintah",
    company: "Perusahaan",
    school: "Sekolah",
    university: "Universitas",
    college: "Kampus",
    place_of_worship: "Tempat Ibadah",
    mosque: "Masjid",
    hospital: "Rumah Sakit",
    bus_stop: "Halte",
};

export const formatNominatimFeature = ({ properties, geometry }) => {
    const geocoding = properties?.geocoding || {};
    const full = formatAdminAddress(geocoding);
    const title = geocoding.name || full.split(", ")[0] || "";
    const [lon, lat] = geometry?.coordinates || [];
    return {
        typeLabel: PLACE_TYPES[geocoding.osm_value] || (geocoding.osm_value || "").replace(/_/g, " "),
        title,
        detail: full.startsWith(`${title}, `) ? full.slice(title.length + 2) : full === title ? "" : full,
        full,
        lat,
        lon,
    };
};

// onLocationChange({ lat, lon }): titik pin terakhir, untuk dikirim bersama formulir (peta persebaran penerbit).
export function AddressAutocomplete({ value, onChange, onLocationChange, id, className = "", ...textareaProps }) {
    const valueRef = useRef(value);
    valueRef.current = value;
    const lastNominatimAt = useRef(0);
    const reverseSeq = useRef(0);
    const listId = useId();
    const [typed, setTyped] = useState("");
    const [results, setResults] = useState([]);
    // Hasil pencarian lengkap OSM (Enter / tombol cari). null = belum mencari untuk teks saat ini.
    const [osmResults, setOsmResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const [recent, setRecent] = useState(readRecent);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [selected, setSelected] = useState(null);

    // Pencarian hanya dipicu oleh ketikan pengguna, bukan oleh pilihan saran yang mengisi field.
    useEffect(() => {
        const { query, unit } = splitUnit(typed);
        if (query.length < MIN_CHARS) {
            setResults([]);
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q: query, limit: "5", bbox: INDONESIA_BBOX });
                const response = await fetch(`${PHOTON_URL}?${params}`, { signal: controller.signal });
                if (!response.ok) throw new Error(`Photon ${response.status}`);
                const data = await response.json();
                const items = (data.features || [])
                    .map((feature) => ({ ...formatPhotonFeature(feature), needsAdmin: true, unit }))
                    .filter((item) => item.full);
                setResults(items);
                setActive(-1);
            } catch {
                // layanan peta gagal/offline: tanpa saran, alamat tetap bisa diketik manual
                if (!controller.signal.aborted) setResults([]);
            }
        }, DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [typed]);

    const showRecent = !osmResults && value.trim().length < MIN_CHARS;
    const options = osmResults
        || (showRecent ? recent.map((item) => ({ ...item, title: item.full, detail: "", recent: true })) : results);
    const expanded = open && (options.length > 0 || searching || osmResults !== null);

    // replaceFull: entri riwayat yang digantikan (alamat sementara dari Photon sebelum dilengkapi kecamatannya).
    const commit = (entry, { fly, replaceFull } = {}) => {
        onChange(entry.full);
        setSelected({ ...entry, fly });
        if (hasCoords(entry)) onLocationChange?.({ lat: entry.lat, lon: entry.lon });
        setRecent((prev) => {
            const next = [entry, ...prev.filter((item) => item.full !== entry.full && item.full !== replaceFull)].slice(0, MAX_RECENT);
            writeRecent(next);
            return next;
        });
    };

    // Ambil jenjang wilayah (kel/desa, kecamatan, kab/kota, provinsi, kode pos) untuk titik pin.
    // Hanya hasil permintaan terakhir yang dipakai, agar respons lama tidak menimpa titik yang lebih baru.
    // Satu pintu ke Nominatim (cari & reverse) agar jeda 1 detik antar-request berlaku untuk keduanya.
    const nominatim = async (path, query) => {
        const gap = lastNominatimAt.current + NOMINATIM_GAP_MS - Date.now();
        if (gap > 0) await new Promise((resolve) => setTimeout(resolve, gap));
        lastNominatimAt.current = Date.now();
        const params = new URLSearchParams({ format: "geocodejson", addressdetails: "1", "accept-language": "id", ...query });
        const response = await fetch(`${NOMINATIM_URL}/${path}?${params}`);
        if (!response.ok) throw new Error(`Nominatim ${response.status}`);
        return (await response.json()).features || [];
    };

    const reverseAdmin = async (lat, lon) => {
        const seq = ++reverseSeq.current;
        const features = await nominatim("reverse", { lat: String(lat), lon: String(lon), zoom: "18" });
        return seq === reverseSeq.current ? features[0]?.properties?.geocoding || null : null;
    };

    // Pencarian lengkap seperti kotak cari openstreetmap.org: dipicu pengguna (Enter/tombol), bukan per ketikan.
    const searchOsm = async () => {
        const typedText = value.trim();
        const { query, unit } = splitUnit(typedText);
        if (query.length < MIN_CHARS || searching) return;
        setTyped(""); // hentikan saran Photon yang tertunda agar tidak menimpa hasil OSM
        setOpen(true);
        setActive(-1);
        setSearching(true);
        try {
            const features = await nominatim("search", { q: query, countrycodes: "id", limit: "10" });
            if (valueRef.current.trim() !== typedText) return; // teks sudah berubah: hasil ini usang
            setOsmResults(
                features
                    .map((feature) => ({ ...formatNominatimFeature(feature), unit }))
                    .filter((item) => item.full && hasCoords(item))
            );
        } catch {
            setOsmResults([]);
        } finally {
            setSearching(false);
        }
    };

    const choose = async (option) => {
        const entry = { full: withUnit(option.full, option.unit), lat: option.lat, lon: option.lon };
        commit(entry);
        setResults([]);
        setOsmResults(null);
        setOpen(false);
        if (!option.needsAdmin || !hasCoords(entry)) return;
        try {
            const geocoding = await reverseAdmin(entry.lat, entry.lon);
            // pengguna sudah mengedit teks selama menunggu: jangan timpa ketikannya
            if (!geocoding || valueRef.current !== entry.full) return;
            const full = withUnit(formatAdminAddress(geocoding, { name: option.title, street: option.street }), option.unit);
            commit({ ...entry, full }, { fly: false, replaceFull: entry.full });
        } catch {
            // tanpa kecamatan: alamat dari saran tetap dipakai
        }
    };

    // Pin digeser/peta diklik: ambil alamat titik itu. Gagal = pin tetap pindah, teks alamat tidak ditimpa.
    const pickPoint = async (lat, lon) => {
        setSelected({ full: selected?.full || value, lat, lon, fly: false });
        onLocationChange?.({ lat, lon }); // pin sudah pindah walau alamat gagal diambil
        try {
            const geocoding = await reverseAdmin(lat, lon);
            if (!geocoding) return;
            // koordinat tetap titik pilihan pengguna, bukan titik objek OSM terdekat
            commit({ full: formatAdminAddress(geocoding), lat, lon }, { fly: false });
        } catch {
            // tanpa alamat dari peta: pengguna melengkapi teks secara manual
        }
    };

    const removeRecent = (full) => {
        const next = recent.filter((item) => item.full !== full);
        setRecent(next);
        writeRecent(next);
    };

    const handleKeyDown = (event) => {
        // Enter tanpa pilihan aktif = cari di OpenStreetMap; Shift+Enter tetap membuat baris baru.
        if (event.key === "Enter" && !event.shiftKey && !(expanded && active >= 0)) {
            event.preventDefault();
            searchOsm();
            return;
        }
        if (!expanded || options.length === 0) {
            if (event.key === "Escape") setOpen(false);
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % options.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index <= 0 ? options.length - 1 : index - 1));
        } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(options[active]);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            <textarea
                {...textareaProps}
                id={id}
                className={`${className} pr-11`}
                value={value}
                autoComplete="street-address"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
                onChange={(event) => {
                    onChange(event.target.value);
                    setTyped(event.target.value);
                    setOsmResults(null);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={handleKeyDown}
            />
            <button
                type="button"
                aria-label="Cari alamat di OpenStreetMap"
                title="Cari di OpenStreetMap (Enter)"
                disabled={value.trim().length < MIN_CHARS || searching}
                // mousedown + preventDefault: fokus tetap di textarea sehingga daftar hasil tidak langsung tertutup
                onMouseDown={(event) => event.preventDefault()}
                onClick={searchOsm}
                className="absolute right-2 top-2 rounded-lg p-1.5 text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
            >
                <Search className="h-4 w-4" aria-hidden="true" />
            </button>
            {expanded && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label={osmResults || searching ? "Hasil OpenStreetMap" : showRecent ? "Alamat terbaru" : "Saran alamat"}
                    aria-busy={searching}
                    className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-line-strong bg-surface shadow-lg"
                >
                    {(showRecent || osmResults || searching) && (
                        <li role="presentation" className="px-3.5 pt-2 pb-1 text-[11px] font-semibold text-ink-muted">
                            {searching ? "Mencari di OpenStreetMap…" : osmResults ? "Hasil OpenStreetMap" : "Terbaru"}
                        </li>
                    )}
                    {osmResults?.length === 0 && !searching && (
                        <li role="presentation" className="px-3.5 py-2 text-xs text-ink-muted">
                            <span className="font-semibold text-ink">“{splitUnit(value).query}” belum ada di data OpenStreetMap.</span>{" "}
                            Banyak perumahan/gedung di Indonesia belum terpetakan. Cari nama jalan, kelurahan, atau kecamatannya,
                            lalu geser pin ke lokasi kantor. Alamat lengkap tetap boleh diketik manual.
                        </li>
                    )}
                    {options.map((option, index) => (
                        <li
                            key={`${option.full}-${index}`}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === active}
                            // mousedown + preventDefault: textarea tidak blur sebelum pilihan tercatat
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(option);
                            }}
                            onMouseEnter={() => setActive(index)}
                            className={`flex cursor-pointer items-start gap-2.5 px-3.5 py-2 text-xs sm:text-sm text-ink ${index === active ? "bg-canvas" : ""}`}
                        >
                            {option.recent ? (
                                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                            ) : (
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                            )}
                            <span className={`min-w-0 flex-1 ${option.typeLabel !== undefined ? "" : "truncate"}`}>
                                {option.typeLabel && <span className="text-ink-muted">{option.typeLabel} · </span>}
                                <span className="font-semibold">{option.title}</span>
                                {option.detail && <span className="text-ink-muted"> {option.detail}</span>}
                            </span>
                            {option.recent && (
                                <button
                                    type="button"
                                    aria-label={`Hapus dari riwayat: ${option.full}`}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        removeRecent(option.full);
                                    }}
                                    className="rounded p-0.5 text-ink-muted hover:text-ink"
                                >
                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    ))}
                    <li role="presentation" className="flex justify-between gap-2 border-t border-line px-3.5 py-1 text-[10px] text-ink-muted">
                        <span>{osmResults || searching ? "" : "Tekan Enter untuk hasil lengkap OpenStreetMap"}</span>
                        <span>Data © OpenStreetMap contributors</span>
                    </li>
                </ul>
            )}
            <div className="relative isolate z-0 mt-2 h-56 w-full overflow-hidden rounded-xl border border-line-strong">
                <MapContainer
                    center={INDONESIA_CENTER}
                    zoom={4}
                    minZoom={3}
                    scrollWheelZoom={false}
                    className="relative z-0 h-full w-full"
                    aria-label="Peta lokasi alamat kantor"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FlyTo target={selected} />
                    <MapClick onPick={pickPoint} />
                    {recent.filter(hasCoords).filter((item) => item.full !== selected?.full).map((item) => (
                        <Marker
                            key={item.full}
                            position={[item.lat, item.lon]}
                            icon={recentPinIcon}
                            title={`Terbaru: ${item.full}`}
                            eventHandlers={{ click: () => choose(item) }}
                        />
                    ))}
                    {hasCoords(selected) && (
                        <Marker
                            position={[selected.lat, selected.lon]}
                            icon={pinIcon}
                            title={selected.full}
                            draggable
                            eventHandlers={{ dragend: (event) => {
                                const { lat, lng } = event.target.getLatLng();
                                pickPoint(lat, lng);
                            } }}
                        >
                            <Popup>{selected.full}</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
                Cari alamat lalu geser pin, atau klik peta, tepat di gedung kantor Anda; alamat diisi otomatis dan tetap bisa diedit (lengkapi nomor/RT/RW). Pin samar = alamat terbaru.
            </p>
        </div>
    );
}
