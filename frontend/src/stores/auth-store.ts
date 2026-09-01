import { create } from 'zustand';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { wsService } from '@/lib/websocket';
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
  /** true until the first initAuth() resolves — used to gate route guards */
  loading: boolean;
  initialized: boolean;
  /** set by register() when sign-up succeeded but needs email confirmation */
  pendingConfirmation: boolean;
  error: string | null;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

// Legacy keys written by older builds that faked a session. They must never
// be treated as authoritative again — initAuth() deletes them on every load.
const LEGACY_KEYS = ['auth_token', 'auth_user'];

function mapUser(u: SupabaseUser): User {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const emailLocal = u.email?.split('@')[0];
  return {
    id: u.id,
    email: u.email ?? '',
    username: (meta.username as string) || emailLocal || 'user',
    name: (meta.name as string) || (meta.username as string) || emailLocal || 'User',
    avatar: (meta.avatar_url as string) ?? null,
  };
}

let authListenerBound = false;

export const useAuthStore = create<AuthState>((set, get) => {
  const applySession = (session: Session | null) => {
    if (session?.user) {
      const user = mapUser(session.user);
      if (typeof window !== 'undefined') {
        try {
          wsService.subscribeUser(user.id);
        } catch {
          /* realtime is best-effort */
        }
      }
      set({
        user,
        token: session.access_token,
        loading: false,
        initialized: true,
        pendingConfirmation: false,
        error: null,
      });
    } else {
      set({ user: null, token: null, loading: false, initialized: true });
    }
  };

  return {
    user: null,
    token: null,
    loading: true,
    initialized: false,
    pendingConfirmation: false,
    error: null,

    async initAuth() {
      if (typeof window === 'undefined') return;

      // Drop any fake-session leftovers from older builds.
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));

      if (!authListenerBound) {
        authListenerBound = true;
        supabase.auth.onAuthStateChange((_event, session) => {
          applySession(session ?? null);
        });
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        applySession(data.session ?? null);
      } catch (err) {
        console.warn('Supabase getSession failed:', err);
        set({ user: null, token: null, loading: false, initialized: true });
      }
    },

    async login(email: string, password: string) {
      set({ loading: true, error: null });

      const normalized = email.trim().toLowerCase();
      if (!normalized.includes('@') || !/^\S+@\S+\.\S+$/.test(normalized)) {
        const msg = 'Please sign in with your email address.';
        set({ loading: false, error: msg });
        throw new Error(msg);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (error) {
        set({ loading: false, error: error.message });
        throw error;
      }

      applySession(data.session ?? null);
    },

    async register(input: RegisterInput) {
      set({ loading: true, error: null, pendingConfirmation: false });

      const email = input.email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        const msg = 'A valid email address is required.';
        set({ loading: false, error: msg });
        throw new Error(msg);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          data: {
            username: input.username.trim(),
            name: input.name.trim(),
          },
        },
      });

      if (error) {
        set({ loading: false, error: error.message });
        throw error;
      }

      if (data.session) {
        applySession(data.session);
        return;
      }

      // Sign-up succeeded but the project requires email confirmation — there
      // is no session yet. Never fabricate one; let the UI ask the user to
      // confirm their email and then sign in.
      set({ loading: false, pendingConfirmation: true, error: null });
    },

    updateProfile(data: Partial<User>) {
      const current = get().user;
      if (!current) return;
      const updated = { ...current, ...data };
      set({ user: updated });
      // Persist display fields to Supabase auth metadata (best-effort).
      supabase.auth
        .updateUser({ data: { username: updated.username, name: updated.name } })
        .catch((err) => console.warn('updateUser metadata failed:', err));
    },

    async logout() {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined') {
        LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
        try {
          wsService.disconnect();
        } catch {
          /* ignore */
        }
      }
      useNotificationsStore.getState().setSelectedChannel(null);
      set({
        user: null,
        token: null,
        error: null,
        loading: false,
        initialized: true,
        pendingConfirmation: false,
      });
    },
  };
});
