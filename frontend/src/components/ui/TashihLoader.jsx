import React, { useEffect, useState } from 'react';
import lpmqLogo from '@/assets/lpmq.png';
import './TashihLoader.css';

const LOGO_SIZE = { sm: 24, md: 48, lg: 80 };

/**
 * Indikator memuat dengan logo Tashih LPMQ.
 *
 * - size       : 'sm' (tombol/baris) | 'md' (panel/halaman) | 'lg' (layar penuh)
 * - label      : teks yang dibacakan pembaca layar dan ditampilkan bila showLabel
 * - showLabel  : tampilkan teks di bawah logo
 * - fullScreen : isi seluruh layar (dipakai saat validasi sesi / pemuatan awal)
 * - delayMs    : tunda tampil agar tidak berkedip pada pemuatan yang sangat singkat
 */
export const TashihLoader = ({
  size = 'md',
  label = 'Memuat...',
  showLabel = true,
  fullScreen = false,
  delayMs = 0,
  className = '',
}) => {
  const [visible, setVisible] = useState(delayMs <= 0);

  useEffect(() => {
    if (delayMs <= 0) return undefined;
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const logoPx = LOGO_SIZE[size] ?? LOGO_SIZE.md;
  const classes = [
    'tashih-loader',
    `tashih-loader--${size}`,
    fullScreen ? 'tashih-loader--screen' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      {visible && (
        <>
          <div className="tashih-loader__mark" style={{ '--tl-logo': `${logoPx}px` }}>
            <svg className="tashih-loader__ring" viewBox="0 0 100 100" aria-hidden="true">
              <circle className="tashih-loader__track" cx="50" cy="50" r="46" />
              <circle className="tashih-loader__arc" cx="50" cy="50" r="46" />
            </svg>
            <img
              className="tashih-loader__logo"
              src={lpmqLogo}
              alt=""
              width={logoPx}
              height={logoPx}
              draggable="false"
            />
          </div>
          {showLabel ? (
            <span className="tashih-loader__label">{label}</span>
          ) : (
            <span className="sr-only">{label}</span>
          )}
        </>
      )}
    </div>
  );
};

export default TashihLoader;
