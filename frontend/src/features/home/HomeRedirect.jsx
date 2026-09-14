import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export const HomeRedirect = () => {
  // Default masuk aplikasi selalu diarahkan ke halaman login
  return <Navigate to="/login" replace />;
};

export default HomeRedirect;
