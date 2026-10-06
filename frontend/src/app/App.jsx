import React from 'react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AppRouter } from './router';

export const App = () => {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
};

export default App;
