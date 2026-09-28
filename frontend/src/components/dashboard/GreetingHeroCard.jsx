import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Calendar, Activity, Globe } from 'lucide-react';

const TIME_ZONES = {
  WIB: {
    code: 'WIB',
    name: 'Waktu Indonesia Barat (UTC+7)',
    iana: 'Asia/Jakarta',
    description: 'Kantor Pusat LPMQ Jakarta (TMII)',
  },
  WITA: {
    code: 'WITA',
    name: 'Waktu Indonesia Tengah (UTC+8)',
    iana: 'Asia/Makassar',
    description: 'Zona Waktu Indonesia Tengah',
  },
  WIT: {
    code: 'WIT',
    name: 'Waktu Indonesia Timur (UTC+9)',
    iana: 'Asia/Jayapura',
    description: 'Zona Waktu Indonesia Timur',
  },
};

export const GreetingHeroCard = ({
  userName = 'Petugas LPMQ',
  roleLabel = 'Petugas',
  subtext = 'Layanan Surat Tanda Tashih Mushaf Al-Quran Kementerian Agama RI',
  badgeExtra = null,
}) => {
  const [time, setTime] = useState(new Date());
  const [selectedZone, setSelectedZone] = useState('WIB');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeZoneConfig = TIME_ZONES[selectedZone] || TIME_ZONES.WIB;

  // Format waktu lokal sesuai zona yang dipilih
  const timeFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: activeZoneConfig.iana,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: activeZoneConfig.iana,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: activeZoneConfig.iana,
    hour: 'numeric',
    hour12: false,
  });

  const minuteFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: activeZoneConfig.iana,
    minute: 'numeric',
  });

  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: activeZoneConfig.iana,
    weekday: 'short',
  });

  const localHour = parseInt(hourFormatter.format(time), 10);
  const localMinute = parseInt(minuteFormatter.format(time), 10);
  const localWeekday = weekdayFormatter.format(time); // 'Mon', 'Tue', ... 'Sat', 'Sun'

  const timeGreeting =
    localHour < 11
      ? { text: 'Selamat pagi' }
      : localHour < 15
      ? { text: 'Selamat siang' }
      : localHour < 18
      ? { text: 'Selamat sore' }
      : { text: 'Selamat malam' };

  // Jam kerja kedinasan Kemenag RI: Senin - Jumat, 07:30 - 16:00 waktu setempat
  const isWeekend = localWeekday === 'Sat' || localWeekday === 'Sun';
  const timeInMinutes = localHour * 60 + localMinute;
  const isWorkingHours = !isWeekend && timeInMinutes >= 7 * 60 + 30 && timeInMinutes <= 16 * 60;

  const timeString = timeFormatter.format(time);
  const dateString = dateFormatter.format(time);

  return (
    <section
      className="relative overflow-hidden rounded-xl bg-brand-900 text-white p-5 sm:p-7 shadow-2xs border border-brand-800"
      aria-labelledby="dashboard-greeting"
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* Sisi Kiri: Sapaan & Wewenang Akun */}
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-civicGold-500 text-brand-950 text-xs font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" /> Pusat Kendali
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-xs font-semibold text-brand-100 border border-white/20 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-civicGold-700" />
              <span>{roleLabel}</span>
            </span>
            {badgeExtra && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-950/70 text-xs font-mono text-civicGold-700 border border-civicGold-700/30">
                {badgeExtra}
              </span>
            )}
            {/* Status Jam Kerja Kedinasan Sesuai Zona Waktu Lokal */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                isWorkingHours
                  ? 'bg-brand-700/20 text-brand-100 border-brand-700/40'
                  : 'bg-civic-warning/20 text-civic-warning border-civic-warningLine/40'
              }`}
              title="Jam kerja resmi Kemenag RI: Senin-Jumat 07.30 - 16.00 waktu setempat"
            >
              <span className={`w-2 h-2 rounded-full ${isWorkingHours ? 'bg-brand-700 animate-pulse' : 'bg-civic-warningLine'}`} />
              {isWorkingHours ? 'Jam Layanan Aktif (07.30 - 16.00)' : 'Di Luar Jam Layanan'}
            </span>
          </div>

          <h2 id="dashboard-greeting" className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>{timeGreeting.text}, {userName}!</span>
          </h2>

          <p className="text-xs sm:text-sm text-brand-100/90 leading-relaxed font-normal">
            {subtext}
          </p>
        </div>

        {/* Sisi Kanan: Jam Digital 3 Zona Waktu Indonesia (WIB, WITA, WIT) */}
        <div className="flex flex-col md:items-end justify-center pt-3 md:pt-0 border-t border-white/10 md:border-t-0 space-y-2">
          {/* Zona Waktu Selector */}
          <div className="flex items-center gap-1 bg-brand-950/80 p-1 rounded-lg border border-white/10" role="tablist" aria-label="Pilih Zona Waktu Indonesia">
            {Object.keys(TIME_ZONES).map((zoneKey) => (
              <button
                key={zoneKey}
                type="button"
                role="tab"
                aria-selected={selectedZone === zoneKey}
                onClick={() => setSelectedZone(zoneKey)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedZone === zoneKey
                    ? 'bg-civicGold-500 text-brand-950 shadow-xs'
                    : 'text-brand-100 hover:text-white hover:bg-white/10'
                }`}
                title={TIME_ZONES[zoneKey].description}
              >
                {zoneKey}
              </button>
            ))}
          </div>

          <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-white drop-shadow-xs tabular-nums flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-civicGold-700 opacity-85 hidden sm:inline-block" />
            <span>{timeString}</span>
            <span className="text-xs font-mono font-bold text-civicGold-700 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
              {selectedZone}
            </span>
          </div>

          <div className="text-xs sm:text-sm font-medium text-brand-100 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-civicGold-700 opacity-85" />
            <span>{dateString}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GreetingHeroCard;
