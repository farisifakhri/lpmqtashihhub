import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lpmq-theme';

// Pages where dark mode is allowed on <html>
const DARK_MODE_ALLOWED_PATHS = ['/login', '/register', '/', '/landing'];

export default function usedarkmode() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const currentPath = window.location.pathname;
    const isDarkAllowed = DARK_MODE_ALLOWED_PATHS.some(
      (p) => currentPath === p || currentPath.startsWith(p + '/')
    );

    // Only apply dark class on allowed pages (login, register, landing)
    // On dashboard and internal pages, always remove dark to prevent theme leak
    if (isDarkAllowed && theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme tetap bekerja tanpa localStorage
    }
  }, [theme]);

  // Also clean up dark class on every path change (e.g., after login redirect)
  useEffect(() => {
    const cleanup = () => {
      const currentPath = window.location.pathname;
      const isDarkAllowed = DARK_MODE_ALLOWED_PATHS.some(
        (p) => currentPath === p || currentPath.startsWith(p + '/')
      );
      if (!isDarkAllowed) {
        document.documentElement.classList.remove('dark');
      }
    };
    window.addEventListener('popstate', cleanup);
    return () => window.removeEventListener('popstate', cleanup);
  }, []);

  const toggleTheme = () => {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'));
  };

  return [theme, toggleTheme];
}