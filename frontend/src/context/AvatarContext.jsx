import React, { createContext, useContext, useState, useEffect } from 'react';

const AvatarContext = createContext({
  avatarId: null,
  setAvatarId: () => {},
});

const STORAGE_KEY = 'lpmq_user_avatar';

export const AvatarProvider = ({ children }) => {
  const [avatarId, setAvatarIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const setAvatarId = (newId) => {
    setAvatarIdState(newId);
    try {
      if (newId) {
        localStorage.setItem(STORAGE_KEY, newId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  return (
    <AvatarContext.Provider value={{ avatarId, setAvatarId }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => useContext(AvatarContext);

