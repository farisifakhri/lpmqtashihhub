import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, Clock, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { notificationApi } from '@/api/notification.api';

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function resolveLink(item, isPublisher) {
  // 1. Prioritaskan tautan langsung dari backend payload
  if (typeof item.payload?.link === 'string' && item.payload.link.startsWith('/')) {
    return item.payload.link;
  }

  const type = item.type;
  const regId = item.registration_id;

  if (isPublisher) {
    if (type?.includes('PAYMENT')) return '/publisher/billing';
    if (regId) return `/publisher/registrations/${regId}`;
    return '/publisher/registrations';
  }

  // 2. Internal roles: prioritaskan assignment_id untuk deep-link pemeriksaan
  if (item.payload?.assignment_id) {
    return `/internal/verifications/${item.payload.assignment_id}`;
  }

  if (type === 'VERIFICATION_ASSIGNMENT_REQUIRED') {
    return '/internal/verifications?tab=NEED_ASSIGNMENT';
  }
  if (type === 'APPROVAL_REQUEST' || type === 'SIGNATURE_REQUEST') {
    return '/internal/signatures';
  }
  if (
    type === 'ASSIGNMENT' ||
    type === 'DOCUMENT_APPROVED' ||
    type === 'DRAFT_RETURNED' ||
    type === 'READY_TO_SEND'
  ) {
    return regId ? `/internal/verifications?id=${regId}` : '/internal/verifications';
  }
  if (type?.includes('PAYMENT')) {
    return '/internal/payments';
  }
  if (type?.includes('HANDOVER') || type?.includes('DISTRIBUTION')) {
    return '/internal/distributions';
  }
  if (regId) return `/internal/verifications?id=${regId}`;
  return '/internal';
}

function resolveDesc(item) {
  if (item.desc) return item.desc;
  if (item.payload?.notes) return item.payload.notes;
  if (item.payload?.reason) return item.payload.reason;
  if (item.payload?.nota_no) return `Nomor Nota Dinas: ${item.payload.nota_no}`;
  if (item.payload?.receipt_no) return `Nomor Tanda Terima: ${item.payload.receipt_no}`;
  return item.title;
}

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('ACTION_REQUIRED'); // 'ACTION_REQUIRED' | 'INFO'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const { currentUser } = useAuth();

  const role = currentUser?.role || '';
  const isPublisher = role === 'ADMIN_PENERBIT' || currentUser?.roles?.includes('ADMIN_PENERBIT');

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getNotifications();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setNotifications(list);
    } catch (err) {
      console.warn('[NotificationCenter] Gagal mengambil notifikasi:', err.message);
      setError('Gagal memuat pemberitahuan');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh saat panel dibuka
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
    } catch (err) {
      console.warn('[NotificationCenter] Gagal menandai dibaca:', err.message);
    }
  };

  const actionRequiredNotifications = notifications.filter((item) => !item.read_at);
  const infoNotifications = notifications.filter((item) => Boolean(item.read_at));

  const currentItems = tab === 'ACTION_REQUIRED' ? actionRequiredNotifications : infoNotifications;
  const unreadCount = actionRequiredNotifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-ink-muted hover:text-brand-900 hover:bg-surface-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 cursor-pointer"
        aria-label={`Pemberitahuan, ${unreadCount} perlu tindakan`}
        title="Pemberitahuan"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-civic-warningLine opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-civic-warning" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-xl shadow-xl border border-line py-2 z-50 animate-slideUp">
          {/* Header */}
          <div className="px-4 py-2 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                Pemberitahuan
              </h3>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-ink-muted" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                {unreadCount} Perlu Tindakan
              </span>
              <button
                type="button"
                onClick={fetchNotifications}
                disabled={loading}
                className="p-1 text-ink-muted hover:text-brand-900 rounded transition-colors"
                title="Muat ulang pemberitahuan"
              >
                <RefreshCw className={clsx('w-3 h-3', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1.5 mx-2 my-1.5 bg-surface-subtle rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab('ACTION_REQUIRED')}
              className={clsx(
                'py-1.5 rounded-md transition-colors text-center',
                tab === 'ACTION_REQUIRED'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              Perlu Tindakan ({actionRequiredNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('INFO')}
              className={clsx(
                'py-1.5 rounded-md transition-colors text-center',
                tab === 'INFO'
                  ? 'bg-surface text-ink shadow-2xs'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              Informasi ({infoNotifications.length})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-72 overflow-y-auto px-2 py-1 space-y-1">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-700" />
                <span>Memuat pemberitahuan...</span>
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-civic-danger space-y-2">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={fetchNotifications}
                  className="text-xs font-semibold text-brand-700 underline"
                >
                  Coba lagi
                </button>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-muted">
                Tidak ada pemberitahuan pada kategori ini.
              </div>
            ) : (
              currentItems.map((item) => {
                const link = resolveLink(item, isPublisher);
                const desc = resolveDesc(item);
                const timeStr = formatRelativeTime(item.created_at || item.time);
                const isUnread = !item.read_at;

                return (
                  <div
                    key={item.id}
                    className={clsx(
                      'p-3 rounded-lg border transition-colors text-xs space-y-1',
                      isUnread
                        ? 'border-brand-200 bg-brand-50/30 hover:bg-brand-50/50'
                        : 'border-line/60 hover:bg-surface-subtle'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink truncate">{item.title}</span>
                      <span className="text-[10px] text-ink-muted shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeStr}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted leading-relaxed">{desc}</p>
                    <div className="pt-1 flex items-center justify-between">
                      {link ? (
                        <Link
                          to={link}
                          onClick={(e) => {
                            if (isUnread) handleMarkAsRead(e, item.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 hover:underline"
                        >
                          <span>Buka Pekerjaan</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span />
                      )}
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(e, item.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-ink-muted hover:text-brand-700 font-medium px-1.5 py-0.5 rounded hover:bg-surface border border-line/40 transition-colors"
                          title="Tandai sudah dibaca"
                        >
                          <Check className="w-3 h-3" />
                          <span>Tandai dibaca</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
