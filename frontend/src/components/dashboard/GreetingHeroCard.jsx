import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Calendar } from 'lucide-react';

export const GreetingHeroCard = ({
  userName = 'Petugas LPMQ',
  roleLabel = 'Petugas',
  subtext = 'Layanan Pentashihan Naskah Mushaf Al-Qur\'an Kementerian Agama RI',
  badgeExtra = null,
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const timeGreeting =
    hours < 11
      ? { text: 'Selamat Pagi', emoji: '☀️' }
      : hours < 15
      ? { text: 'Selamat Siang', emoji: '🌤️' }
      : hours < 18
      ? { text: 'Selamat Sore', emoji: '🌅' }
      : { text: 'Selamat Malam', emoji: '🌙' };

  const timeString = time.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateString = time.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#083224] via-[#0B3F2D] to-[#0E5139] text-white p-6 sm:p-7 shadow-md border border-primary-800">
      {/* Subtle institutional pattern overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#DFB045_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* Sisi Kiri: Sapaan & Wewenang Akun */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 backdrop-blur-xs text-xs font-semibold text-primary-100 border border-white/15 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              <span>{roleLabel}</span>
            </span>
            {badgeExtra && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary-950/60 text-[11px] font-mono text-gold-300 border border-gold-500/30">
                {badgeExtra}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl animate-bounce-short select-none" role="img" aria-label={timeGreeting.text}>
              {timeGreeting.emoji}
            </span>
            <span>{timeGreeting.text}, {userName}!</span>
          </h2>

          <p className="text-xs sm:text-sm text-primary-100/90 leading-relaxed font-normal">
            {subtext}
          </p>
        </div>

        {/* Sisi Kanan: Jam Digital & Tanggal Kedinasan */}
        <div className="flex flex-col md:items-end justify-center pt-3 md:pt-0 border-t border-white/10 md:border-t-0">
          <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-white drop-shadow-sm tabular-nums flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-400 opacity-75 hidden sm:inline-block" />
            <span>{timeString}</span>
          </div>
          <div className="text-xs sm:text-sm font-medium text-primary-200 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gold-400 opacity-75" />
            <span>{dateString}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreetingHeroCard;
