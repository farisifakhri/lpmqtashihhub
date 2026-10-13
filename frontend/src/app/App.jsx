import React from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { DensityProvider } from '@/context/DensityContext';
import { AppRouter } from './router';

export const App = () => {
  return (
    <AuthProvider>
      <DensityProvider>
        <AppRouter />
      </DensityProvider>
    </AuthProvider>
  );
};

export default App;
