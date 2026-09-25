import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { showToast, subscribeToasts } from './toast';

const ToastContext = createContext(showToast);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToasts(toast => {
    setToasts(items => [...items, toast]);
  }), []);

  useEffect(() => {
    if (!toasts.length) return undefined;
    const timer = window.setTimeout(() => setToasts(items => items.slice(1)), 5000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const dismiss = useCallback(id => setToasts(items => items.filter(item => item.id !== id)), []);

  return <ToastContext.Provider value={showToast}>
    {children}
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map(toast => <div key={toast.id} role={toast.variant === 'danger' ? 'alert' : 'status'} className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface px-4 py-3 text-sm text-ink shadow-lg ${toast.variant === 'danger' ? 'border-civic-danger' : 'border-civic-success'}`}>
        <span className="flex-1">{toast.message}</span>
        <button type="button" onClick={() => dismiss(toast.id)} aria-label="Tutup pemberitahuan" className="text-ink-muted hover:text-ink">×</button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
