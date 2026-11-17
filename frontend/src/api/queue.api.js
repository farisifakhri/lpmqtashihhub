import apiClient from './client';

const QUEUE_COUNTS_INVALIDATED_EVENT = 'lpmq:queue-counts-invalidated';

export const queueApi = {
  getCounts: (activeRole) => apiClient('/me/queue-counts', {
    headers: { 'X-Active-Role': activeRole },
  }),
};

export const invalidateQueueCounts = () => {
  window.dispatchEvent(new Event(QUEUE_COUNTS_INVALIDATED_EVENT));
};

export const queueCountsInvalidatedEvent = QUEUE_COUNTS_INVALIDATED_EVENT;
