import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [], portalType = null }) => {
  const { currentUser, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div role="status" aria-live="polite">Memverifikasi sesi pengguna...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = currentUser.roles || (currentUser.role ? [currentUser.role] : []);
  const isPublisher = userRoles.includes('ADMIN_PENERBIT') || currentUser.role === 'ADMIN_PENERBIT';
  const isAdmin = userRoles.includes('SUPERADMIN') || currentUser.role === 'SUPERADMIN';

  // Proteksi portal: Penerbit vs Petugas Internal
  if (portalType === 'publisher' && !isPublisher && !isAdmin) {
    return <Navigate to="/internal" replace />;
  }

  if (portalType === 'internal' && isPublisher && !isAdmin) {
    return <Navigate to="/publisher" replace />;
  }

  // Proteksi role spesifik (misal hanya SUPERADMIN untuk master settings)
  if (allowedRoles.length > 0) {
    const hasRole = isAdmin || allowedRoles.some((r) => userRoles.includes(r) || currentUser.role === r);
    if (!hasRole) {
      return <Navigate to={isPublisher ? '/publisher' : '/internal'} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
