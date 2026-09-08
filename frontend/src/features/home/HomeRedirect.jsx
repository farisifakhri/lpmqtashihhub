import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { PublisherDashboard } from '@/features/registrations/PublisherDashboard';
import { InternalDashboard } from '@/features/internal/InternalDashboard';

export const HomeRedirect = () => {
  const { currentUser } = useAuth();

  if (currentUser.role === 'PUBLISHER') {
    return <PublisherDashboard />;
  }

  return <InternalDashboard />;
};
