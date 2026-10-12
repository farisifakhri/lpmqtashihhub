import React from 'react';
import { Navigate } from 'react-router-dom';

export const HomeRedirect = () => {
  // Default masuk aplikasi diarahkan ke halaman login
  return <Navigate to="/login" replace />;
};

export default HomeRedirect;
