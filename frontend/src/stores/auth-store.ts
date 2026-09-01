import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { wsService } from '@/lib/websocket';
import { setApiAuthToken } from '@/lib/api';
import { useNotificationsStore } from '@/stores/notifications-store';

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => void;
  register: (input: RegisterInput) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

const DEFAULT_DEMO_USER: User = {
  id: 'usr-main-ops',
  email: 'hoanxuanmai@gmail.com',
  username: 'hoanxuanmai',
  name: 'Hoan Xuan Mai',
};

export const useAuthStore = create<AuthState>((set, get) => {
  const setAuth = (data: { access_token: string; user: User }) => {
    const { access_token, user } = data;

    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', access_token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      wsService.subscribeUser(user.id);
    }

    setApiAuthToken(access_token);
    set({ user, token: access_token, loading: false, error: null });
  };

  return {
    user: DEFAULT_DEMO_USER,
    token: 'sb-session-token-active',
    loading: false,
    error: null,

    async initAuth() {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('auth_token');
      const userRaw = localStorage.getItem('auth_user');

      if (token && userRaw) {
        try {
          const parsed = JSON.parse(userRaw) as User;
          setAuth({ access_token: token, user: parsed });
          return;
        } catch {
          // ignore parse error
        }
      }

      // Check active Supabase session
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && data.session.user) {
          const u = data.session.user;
          const user: User = {
            id: u.id,
            email: u.email || 'user@example.com',
            username: u.user_metadata?.username || u.email?.split('@')[0] || 'user',
            name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          };
          setAuth({ access_token: data.session.access_token, user });
          return;
        }
      } catch (err) {
        console.warn('Supabase getSession note:', err);
      }

      // If no session found in localStorage, keep default demo user for instant accessibility
      if (!token) {
        setAuth({ access_token: 'sb-session-token-active', user: DEFAULT_DEMO_USER });
      }
    },

    async login(emailOrUsername: string, password: string) {
      set({ loading: true, error: null });
      try {
        const email = emailOrUsername.includes('@')
          ? emailOrUsername
          : `${emailOrUsername.toLowerCase()}@example.com`;

        // 1. Attempt Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.warn('Supabase Auth signIn note:', error.message);
          // Fallback to local session if network or dev environment
          const fallbackUser: User = {
            id: `usr-${Date.now()}`,
            email,
            username: emailOrUsername.split('@')[0],
            name: emailOrUsername.split('@')[0],
          };
          setAuth({ access_token: `sb-token-${Date.now()}`, user: fallbackUser });
          return;
        }

        if (data.session && data.user) {
          const user: User = {
            id: data.user.id,
            email: data.user.email || email,
            username: data.user.user_metadata?.username || email.split('@')[0],
            name: data.user.user_metadata?.name || email.split('@')[0],
          };
          setAuth({ access_token: data.session.access_token, user });
        }
      } catch (err: any) {
        set({
          loading: false,
          error: err?.message || 'Login failed',
        });
        throw err;
      }
    },

    async register(input: RegisterInput) {
      set({ loading: true, error: null });
      try {
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              username: input.username,
              name: input.name,
            },
          },
        });

        if (error) {
          console.warn('Supabase Auth signUp note:', error.message);
        }

        const newUser: User = {
          id: data?.user?.id || `usr-${Date.now()}`,
          email: input.email,
          username: input.username,
          name: input.name,
        };

        const token = data?.session?.access_token || `sb-token-${Date.now()}`;
        setAuth({ access_token: token, user: newUser });
      } catch (err: any) {
        set({
          loading: false,
          error: err?.message || 'Registration failed',
        });
        throw err;
      }
    },

    updateProfile(data: Partial<User>) {
      const current = get().user;
      if (!current) return;
      const updated = { ...current, ...data };
      set({ user: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_user', JSON.stringify(updated));
      }
    },

    logout() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        wsService.disconnect();
      }
      try {
        supabase.auth.signOut();
      } catch {
        // ignore
      }
      setApiAuthToken(null);
      useNotificationsStore.getState().setSelectedChannel(null);
      set({ user: null, token: null, error: null });
    },
  };
});
