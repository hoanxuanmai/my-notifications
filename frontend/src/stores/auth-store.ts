import { create } from 'zustand';
import axios from 'axios';
import { wsService } from '@/lib/websocket';
import { setApiAuthToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface User {
  id: string;
  email: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Create a dedicated axios instance so we can set auth header
  const client = axios.create({ baseURL: API_URL });

  let initialUser: User | null = null;
  let initialToken: string | null = null;

  // Try restore from localStorage on first import (client-side only)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    const userRaw = localStorage.getItem('auth_user');
    if (token) {
      client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      initialToken = token;
      // Sync token for the shared apiClient
      setApiAuthToken(token);
    }
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw) as User;
        initialUser = parsed;
        // Subscribe to user room for unread badge updates
        wsService.subscribeUser(parsed.id);
      } catch {
        // ignore JSON parse error, will require fresh login
      }
    }
  }

  return {
    user: initialUser,
    token: initialToken,
    loading: false,
    error: null,

    async login(emailOrUsername: string, password: string) {
      set({ loading: true, error: null });
      try {
        const res = await client.post('/auth/login', {
          emailOrUsername,
          password,
        });

        const { access_token, user } = res.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }

        client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        // Sync token for the shared apiClient used across the app
        setApiAuthToken(access_token);

        // Subscribe WebSocket to user-level room for unread badge updates
        if (typeof window !== 'undefined') {
          wsService.subscribeUser(user.id);
        }

        set({ user, token: access_token, loading: false });
      } catch (err: any) {
        set({
          loading: false,
          error: err?.response?.data?.message || 'Login failed',
        });
        throw err;
      }
    },

    logout() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
      // Disconnect websocket so old user subscriptions are cleared
      if (typeof window !== 'undefined') {
        wsService.disconnect();
      }
      // Xóa token khỏi apiClient dùng chung
      setApiAuthToken(null);
      delete client.defaults.headers.common['Authorization'];
      set({ user: null, token: null, error: null });
    },
  };
});
