import React from 'react';
import { Sun, Moon } from 'lucide-react';
import usedarkmode from './usedarkmode';

export default function Switcher({ showLabel = false, className = '' }) {
  const [theme, toggleTheme] = usedarkmode();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      aria-pressed={isDark}
      title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      className={`h-9 w-9 rounded-lg flex items-center justify-center bg-surface-subtle/80 hover:bg-surface-strong/60 border border-line hover:border-brand-500/50 text-ink-muted hover:text-ink transition-all shadow-2xs cursor-pointer group focus:outline-none focus:ring-2 focus:ring-brand-700/20 active:scale-95 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-civicGold-500 group-hover:rotate-45 transition-transform duration-200" />
      ) : (
        <Moon className="h-4 w-4 text-brand-fg group-hover:-rotate-12 transition-transform duration-200" />
      )}

      {showLabel && (
        <span className="text-xs font-semibold ml-1.5">
          {isDark ? 'Terang' : 'Gelap'}
        </span>
      )}
    </button>
  );
}
