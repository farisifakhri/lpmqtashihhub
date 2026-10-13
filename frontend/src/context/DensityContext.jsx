import React, { createContext, useContext, useState, useEffect } from 'react';

const DensityContext = createContext({
  density: 'comfortable',
  toggleDensity: () => {},
  setDensity: () => {},
  isCompact: false,
  tableCellClass: 'py-3.5 px-4',
  tableHeaderClass: 'py-3 px-4',
  cardPaddingClass: 'p-5 sm:p-6',
});

const STORAGE_KEY = 'lpmq_ui_density';

export const DensityProvider = ({ children }) => {
  const [density, setDensityState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, density);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const toggleDensity = () => {
    setDensityState((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'));
  };

  const setDensity = (newDensity) => {
    if (newDensity === 'compact' || newDensity === 'comfortable') {
      setDensityState(newDensity);
    }
  };

  const isCompact = density === 'compact';

  const value = {
    density,
    isCompact,
    toggleDensity,
    setDensity,
    // Utility classes for tables and lists: compact adjusts padding without shrinking font
    tableCellClass: isCompact ? 'py-2 px-3 text-xs' : 'py-3.5 px-4 text-xs',
    tableHeaderClass: isCompact ? 'py-2 px-3 text-xs' : 'py-3 px-4 text-xs',
    cardPaddingClass: isCompact ? 'p-3.5 sm:p-4' : 'p-5 sm:p-6',
    itemGapClass: isCompact ? 'space-y-1.5' : 'space-y-3',
  };

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
};

export const useDensity = () => useContext(DensityContext);

export default DensityContext;

