import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { accessRoles } from '@/lib/roles';

export const ProtectedRoute = ({ children, allowedRoles = [], portalType = null }) => {
  const { currentUser, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div role="status" aria-live="polite">Memverifikasi sesi pengguna...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const activeRole = currentUser.activeRole || currentUser.role;
  const userRoles = accessRoles(
    currentUser.roles || (activeRole ? [activeRole] : []),
    activeRole
  );
  const isPublisher = userRoles.includes('PENERBIT') || currentUser.role === 'PENERBIT';
  const isAdmin = userRoles.includes('SUPERADMIN') || currentUser.role === 'SUPERADMIN';

  // Proteksi portal: Penerbit vs Petugas Internal
  if (portalType === 'publisher') {
    if (!isPublisher && !isAdmin) {
      return <Navigate to="/403" replace />;
    }
    const status = currentUser.publisher?.verification_status || currentUser.verificationStatus;
    if (isPublisher && !isAdmin && status !== 'VERIFIED') {
      return <Navigate to="/login" state={{ error: 'Akun penerbit Anda belum disetujui atau masih dalam proses verifikasi petugas LPMQ.' }} replace />;
    }
  }

  if (portalType === 'internal' && isPublisher && !isAdmin) {
    return <Navigate to="/403" replace />;
  }

  // Proteksi role spesifik (misal hanya SUPERADMIN untuk master settings)
  if (allowedRoles.length > 0) {
    const hasRole = isAdmin || allowedRoles.some((r) => r === activeRole);
    if (!hasRole) {
      return <Navigate to="/403" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
