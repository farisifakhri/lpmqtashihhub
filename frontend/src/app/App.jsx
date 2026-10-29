import React from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { DensityProvider } from '@/context/DensityContext';
import { AvatarProvider } from '@/context/AvatarContext';
import { AppRouter } from './router';

export const App = () => {
  return (
    <AuthProvider>
      <DensityProvider>
        <AvatarProvider>
          <AppRouter />
        </AvatarProvider>
      </DensityProvider>
    </AuthProvider>
  );
};

export default App;
