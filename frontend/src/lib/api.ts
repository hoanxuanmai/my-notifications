import axios from 'axios';
import type {
  Channel,
  Notification,
  NotificationResponse,
  CreateChannelDto,
} from '@/types';
import { get } from 'http';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to set / clear auth token on the shared API client
export const setApiAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Attach JWT token from localStorage on the client side (initial load)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token');
  if (token) {
    setApiAuthToken(token);
  }

  // Global 401 handler: if any authenticated request gets 401,
  // clear local auth data and notify the app so it can show
  // the login modal instead of redirecting to a separate page.
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;

      if (status === 401) {
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        } catch {
          // ignore storage errors
        }
        if (typeof window !== 'undefined') {
          // Fire a custom event so UI can react (e.g. open login modal)
          window.dispatchEvent(new Event('auth-unauthorized'));
        }
      }

      return Promise.reject(error);
    },
  );
}

// Channels API
export const channelsApi = {
  getAll: (): Promise<Channel[]> => {
    return apiClient.get('/channels').then((res) => res.data);
  },

  getById: (id: string): Promise<Channel> => {
    return apiClient.get(`/channels/${id}`).then((res) => res.data);
  },

  create: (data: CreateChannelDto): Promise<Channel> => {
    return apiClient.post('/channels', data).then((res) => res.data);
  },

  update: (id: string, data: Partial<CreateChannelDto>): Promise<Channel> => {
    return apiClient.patch(`/channels/${id}`, data).then((res) => res.data);
  },

  delete: (id: string): Promise<void> => {
    return apiClient.delete(`/channels/${id}`);
  },

  addMember: (channelId: string, email: string): Promise<void> => {
    return apiClient.post(`/channels/${channelId}/members`, { email }).then((res) => res.data);
  },

  getMembers: (channelId: string): Promise<any[]> => {
    return apiClient.get(`/channels/${channelId}/members`).then((res) => res.data);
  },

  removeMember: (channelId: string, userId: string): Promise<void> => {
    return apiClient.delete(`/channels/${channelId}/members/${userId}`);
  },
};

// Notifications API
export const notificationsApi = {
  getAll: (query?: NotificationQueryDto): Promise<NotificationResponse> => {
    return apiClient.get('/notifications', { params: query }).then((res) => res.data);
  },

  getById: (id: string): Promise<Notification> => {
    return apiClient.get(`/notifications/${id}`).then((res) => res.data);
  },

  markAsRead: (id: string): Promise<Notification> => {
    return apiClient.put(`/notifications/${id}/read`).then((res) => res.data);
  },

  markAllAsRead: (channelId?: string): Promise<void> => {
    // Send an empty JSON object as body to avoid sending literal "null"
    // which some parsers may treat as invalid for requests expecting JSON.
    return apiClient.put('/notifications/read-all', {}, {
      params: channelId ? { channelId } : undefined,
    });
  },

  getUnreadCount: (channelId?: string): Promise<number> => {
    return apiClient
      .get('/notifications/unread/count', {
        params: channelId ? { channelId } : undefined,
      })
      .then((res) => res.data);
  },

  getUnreadSummary: (): Promise<Record<string, number>> => {
    return apiClient.get('/notifications/unread/summary').then((res) => res.data);
  },

  delete: (id: string): Promise<void> => {
    return apiClient.delete(`/notifications/${id}`);
  },
};

// Web Push / delivery API
export const pushApi = {
  subscribe: (subscription: any): Promise<{ id: string }> => {
    return apiClient.post('/push/subscribe', subscription).then((res) => res.data);
  },
};

// User me data
export const userMeApi = {
  getMe: (): Promise<any> => {
    return apiClient.get('/users/me').then((res) => res.data);
  },
  getSettings: (): Promise<any> => {
    return apiClient.get('/users/me/settings').then((res) => res.data);
  },
  updateSettings: (settings: any): Promise<any> => {
    return apiClient.put('/users/me/settings', settings).then((res) => res.data);
  },
  getWebPushDevices: (): Promise<any[]> => {
    return apiClient.get('/users/me/webpush-devices').then((res) => res.data);
  },
  deleteWebPushDevice: (id: string): Promise<void> => {
    return apiClient.delete(`/users/me/webpush-devices/${id}`);
  }
};

export interface NotificationQueryDto {
  channelId?: string;
  type?: string;
  priority?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}

