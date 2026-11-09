import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { notificationApi } from '@/api/notification.api';
import { DATA_MUTATED_EVENT } from '@/api/client';

export const SIDEBAR_BADGE_POLL_MS = 60_000;
const MUTATION_REFRESH_DELAY_MS = 400;

/**
 * Mengambil jumlah pekerjaan yang menunggu tindakan per menu sidebar dari backend.
 * Data dimuat ulang saat user/peran berganti, saat berpindah halaman, saat jendela
 * kembali fokus, setelah ada perubahan data (POST/PUT/PATCH/DELETE), dan tiap 60 detik.
 * Kegagalan diabaikan secara diam-diam: badge terakhir tetap ditampilkan.
 */
export function useSidebarBadges(currentUser) {
  const location = useLocation();
  const [badges, setBadges] = useState({});
  const requestId = useRef(0);
  const userKey = currentUser ? `${currentUser.id ?? currentUser.email ?? ''}:${currentUser.role ?? ''}` : null;

  useEffect(() => {
    if (!userKey) {
      setBadges({});
      return undefined;
    }

    let disposed = false;
    let mutationTimer = null;

    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const request = ++requestId.current;
      try {
        const res = await notificationApi.getSidebarBadges();
        if (!disposed && request === requestId.current && res?.data && typeof res.data === 'object') {
          setBadges(res.data);
        }
      } catch {
        // Badge bersifat informatif; jangan ganggu user bila server sedang tidak tersedia.
      }
    };

    const onMutated = () => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(load, MUTATION_REFRESH_DELAY_MS);
    };

    load();
    const interval = setInterval(load, SIDEBAR_BADGE_POLL_MS);
    window.addEventListener('focus', load);
    window.addEventListener(DATA_MUTATED_EVENT, onMutated);

    return () => {
      disposed = true;
      clearInterval(interval);
      clearTimeout(mutationTimer);
      window.removeEventListener('focus', load);
      window.removeEventListener(DATA_MUTATED_EVENT, onMutated);
    };
  }, [userKey, location.pathname, location.search]);

  return userKey ? badges : {};
}

/** Menjumlahkan satu atau beberapa kunci antrean untuk satu item menu. */
export function getBadgeCount(badges, badgeKey) {
  const keys = Array.isArray(badgeKey) ? badgeKey : badgeKey ? [badgeKey] : [];
  return keys.reduce((sum, key) => sum + (Number(badges?.[key]) || 0), 0);
}

export function formatBadgeCount(count) {
  return count > 99 ? '99+' : String(count);
}
