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
        className="
            flex items-center gap-2
            rounded-lg
            border border-line
            px-3 py-2
            text-ink
            hover:bg-surface-subtle
            focus-visible:outline
            focus-visible:outline-2
            focus-visible:outline-brand-700
        "
        >
        {isDark ? (
            <Sun className="h-4 w-4" />
        ) : (
            <Moon className="h-4 w-4" />
        )}

        <span className="hidden sm:inline">
            {isDark ? "Terang" : "Gelap"}
        </span>
    </button>
  );
};
    