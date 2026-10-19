import { Sun, Moon } from "lucide-react";
import usedarkmode from "./usedarkmode";

export default function Switcher() {
  const [theme, toggleTheme] = usedarkmode();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      aria-pressed={isDark}
      title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-strong/70 border border-line text-xs font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer"
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-brand-fg" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-brand-fg" />
      )}

      <span className="hidden sm:inline">
        {isDark ? "Terang" : "Gelap"}
      </span>
    </button>
  );
};
    