import React from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';

export const SearchField = ({
  value,
  onChange,
  placeholder = 'Cari berdasarkan nomor, judul, atau kata kunci...',
  onClear,
  shortcut,
  className,
  id = 'search-input',
  'aria-label': ariaLabel = 'Pencarian',
  ...props
}) => {
  return (
    <div className={clsx('relative flex items-center w-full', className)}>
      <Search
        className="absolute left-3.5 w-4 h-4 text-ink-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full pl-10 pr-16 py-2.5 min-h-[44px] text-sm bg-surface border border-line rounded-lg text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:border-brand-700 transition-colors"
        {...props}
      />
      <div className="absolute right-2.5 flex items-center gap-1.5">
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
            aria-label="Bersihkan pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {shortcut && !value && (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-ink-muted bg-surface-subtle border border-line rounded">
            {shortcut}
          </kbd>
        )}
      </div>
    </div>
  );
};

export default SearchField;

