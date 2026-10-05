import { useEffect, useState } from "react";

const STORAGE_KEY = "lpmq-theme";

export default function usedarkmode() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme tetap bekerja tanpa localStorage
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previous) =>
      previous === "dark" ? "light" : "dark"
    );
  };

  return [theme, toggleTheme];
}