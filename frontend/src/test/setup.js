import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@/api/notification.api', () => ({
  notificationApi: {
    getNotifications: vi.fn().mockResolvedValue({ data: [] }),
    markAsRead: vi.fn().mockResolvedValue({ success: true }),
  },
  default: {
    getNotifications: vi.fn().mockResolvedValue({ data: [] }),
    markAsRead: vi.fn().mockResolvedValue({ success: true }),
  },
}));
