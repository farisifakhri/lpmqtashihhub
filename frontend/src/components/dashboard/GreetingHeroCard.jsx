import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

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
      ? { text: 'Selamat Pagi', icon: '☀️' }
      : hours < 15
      ? { text: 'Selamat Siang', icon: '☀️' }
      : hours < 18
      ? { text: 'Selamat Sore', icon: '🌅' }
      : { text: 'Selamat Malam', icon: '🌙' };

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
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0F4C3A] via-[#145C48] to-[#008b84] text-white p-6 sm:p-7 shadow-lg shadow-primary-900/10 border border-emerald-700/30">
      {/* Decorative background circles */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none blur-sm" />
      <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-emerald-400/10 pointer-events-none blur-md" />
      <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-teal-300/5 pointer-events-none blur-xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* Left Side: Greeting & Role Info */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-white/20 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              <span>{roleLabel}</span>
            </span>
            {badgeExtra && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-900/40 text-[11px] font-mono text-emerald-200 border border-emerald-700/50">
                {badgeExtra}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{timeGreeting.icon}</span>
            <span>{timeGreeting.text}, {userName}!</span>
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
            {subtext}
          </p>
        </div>

        {/* Right Side: Live Monospace Digital Clock & Date */}
        <div className="flex flex-col md:items-end justify-center pt-2 md:pt-0 border-t border-white/10 md:border-t-0">
          <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-white drop-shadow-sm tabular-nums">
            {timeString}
          </div>
          <div className="text-xs sm:text-sm font-medium text-emerald-200/90 mt-0.5 flex items-center gap-1.5">
            <span>{dateString}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreetingHeroCard;

