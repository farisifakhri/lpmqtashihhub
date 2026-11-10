import React from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AvatarProvider } from '@/context/AvatarContext';
import { AppRouter } from './router';

export const App = () => {
  return (
    <AuthProvider>
      <AvatarProvider>
        <AppRouter />
      </AvatarProvider>
    </AuthProvider>
  );
};

export default App;
