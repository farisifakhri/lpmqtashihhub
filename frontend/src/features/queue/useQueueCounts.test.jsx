import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as AuthContext from '@/features/auth/AuthContext';
import { queueApi, queueCountsInvalidatedEvent } from '@/api/queue.api';
import { useQueueCounts } from './useQueueCounts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useQueueCounts', () => {
  it('refetches after invalidation and hides counts when the active role changes', async () => {
    let activeRole = 'ADMIN_INTERNAL';
    vi.spyOn(AuthContext, 'useAuth').mockImplementation(() => ({
      currentUser: { id: 'user-1', role: activeRole },
    }));
    const getCounts = vi.spyOn(queueApi, 'getCounts')
      .mockResolvedValueOnce({ data: { master_intake_pending: 2 } })
      .mockResolvedValueOnce({ data: { master_intake_pending: 1 } })
      .mockResolvedValueOnce({ data: {} });

    const { result, rerender, unmount } = renderHook(() => useQueueCounts());
    await waitFor(() => {
      expect(result.current.counts).toEqual({ master_intake_pending: 2 });
    });

    await act(async () => {
      window.dispatchEvent(new Event(queueCountsInvalidatedEvent));
    });
    await waitFor(() => {
      expect(result.current.counts).toEqual({ master_intake_pending: 1 });
    });

    activeRole = 'PENERBIT';
    rerender();
    expect(result.current.counts).toEqual({});
    await waitFor(() => {
      expect(getCounts).toHaveBeenLastCalledWith('PENERBIT');
      expect(result.current.counts).toEqual({});
    });
    unmount();
  });
});
