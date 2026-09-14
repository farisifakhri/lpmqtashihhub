import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { PublisherDashboard } from '@/features/registrations/PublisherDashboard';
import { InternalDashboard } from '@/features/internal/InternalDashboard';
import { LoginPage } from '@/features/auth/LoginPage';

export const HomeRedirect = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginPage />;
  }

  const isPublisher =
    currentUser.role === 'ADMIN_PENERBIT' ||
    currentUser.role === 'PUBLISHER' ||
    currentUser.roles?.includes('ADMIN_PENERBIT');

  if (isPublisher) {
    return <PublisherDashboard />;
  }

  return <InternalDashboard />;
};

export default HomeRedirect;
