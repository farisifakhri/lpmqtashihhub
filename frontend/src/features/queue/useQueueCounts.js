import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { queueApi, queueCountsInvalidatedEvent } from '@/api/queue.api';

const EMPTY_COUNTS = {};

export function useQueueCounts() {
  const { currentUser } = useAuth();
  const activeRole = currentUser?.role || '';
  const userId = currentUser?.id || '';
  const [snapshot, setSnapshot] = useState({ userId: '', activeRole: '', counts: EMPTY_COUNTS, error: null });

  useEffect(() => {
    if (!activeRole || !userId) {
      setSnapshot({ userId: '', activeRole: '', counts: EMPTY_COUNTS, error: null });
      return undefined;
    }

    let active = true;
    let requestId = 0;
    setSnapshot({ userId, activeRole, counts: EMPTY_COUNTS, error: null });

    const refetch = async () => {
      const currentRequestId = ++requestId;
      try {
        const response = await queueApi.getCounts(activeRole);
        if (active && currentRequestId === requestId) {
          setSnapshot({
            userId,
            activeRole,
            counts: response?.data || EMPTY_COUNTS,
            error: null,
          });
        }
      } catch (error) {
        if (active && currentRequestId === requestId) {
          setSnapshot({ userId, activeRole, counts: EMPTY_COUNTS, error });
        }
      }
    };

    const handleFocus = () => { void refetch(); };
    const handleInvalidation = () => { void refetch(); };
    const intervalId = window.setInterval(() => { void refetch(); }, 30000);

    window.addEventListener('focus', handleFocus);
    window.addEventListener(queueCountsInvalidatedEvent, handleInvalidation);
    void refetch();

    return () => {
      active = false;
      requestId += 1;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(queueCountsInvalidatedEvent, handleInvalidation);
    };
  }, [activeRole, userId]);

  if (snapshot.userId !== userId || snapshot.activeRole !== activeRole) {
    return { counts: EMPTY_COUNTS, error: null };
  }
  return { counts: snapshot.counts, error: snapshot.error };
}
