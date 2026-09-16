import React, { useEffect, useRef } from 'react';
import { X, Filter, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export const FilterDrawer = ({
  isOpen = false,
  onClose,
  title = 'Filter Lanjutan',
  children,
  onApply,
  onReset,
  activeFilterCount = 0,
}) => {
  const drawerRef = useRef(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md bg-white shadow-xl flex flex-col border-l border-slate-200 animate-slideLeft"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-800" />
              <h2 id="filter-drawer-title" className="text-base font-bold text-slate-900">
                {title}
              </h2>
              {activeFilterCount > 0 && (
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-md">
                  {activeFilterCount} aktif
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Tutup panel filter"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {children}
          </div>

          {/* Footer CTA */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs text-slate-600"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Filter
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onApply) onApply();
                onClose();
              }}
              className="text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Terapkan Filter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterDrawer;

