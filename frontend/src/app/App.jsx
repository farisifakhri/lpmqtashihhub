import React from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { DensityProvider } from '@/context/DensityContext';
import { AppRouter } from './router';
// import LandingPage from '../features/LandingPage/LandingPage';
export const App = () => {
  return (
    <AuthProvider>
      <AppRouter />
      {/* <LandingPage /> */}
    </AuthProvider>
  );
};

export default App;
