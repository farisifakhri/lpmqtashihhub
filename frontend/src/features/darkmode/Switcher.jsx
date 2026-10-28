import React from 'react';
import { Sun, Moon } from 'lucide-react';
import usedarkmode from './usedarkmode';

export default function Switcher() {
  const [theme, toggleTheme] = usedarkmode();

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      aria-pressed={isDark}
      title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-surface-subtle/80 hover:bg-surface-strong/60 border border-line hover:border-brand-500/50 text-xs font-semibold text-ink-muted hover:text-ink transition-all shadow-2xs cursor-pointer group"
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-civicGold-500 group-hover:rotate-45 transition-transform duration-200" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-brand-fg group-hover:-rotate-12 transition-transform duration-200" />
      )}

      <span className="hidden sm:inline">
        {isDark ? 'Terang' : 'Gelap'}
      </span>
    </button>
  );
}
