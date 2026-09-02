import { supabase, mapNotificationFromDb } from './supabase';
import type { Notification } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type EventCallback = (...args: any[]) => void;

class SupabaseRealtimeService {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private channel: RealtimeChannel | null = null;
  private subscribedChannels: Set<string> = new Set();
  private currentUserId: string | null = null;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.channel) return;

    try {
      this.channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const notif = mapNotificationFromDb(payload.new);
            this.emit('notification:new', notif);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload) => {
            const notif = mapNotificationFromDb(payload.new);
            this.emit('notification:updated', notif);
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications' },
          (payload) => {
            this.emit('notification:deleted', { id: payload.old.id });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ Connected to Supabase Realtime');
          }
        });
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscribedChannels.clear();
  }

  subscribeUser(userId: string) {
    this.currentUserId = userId;
    this.connect();
  }

  subscribeChannel(channelId: string) {
    this.subscribedChannels.add(channelId);
    this.connect();
  }

  unsubscribeChannel(channelId: string) {
    this.subscribedChannels.delete(channelId);
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  emit(event: string, ...args: any[]) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`Error in realtime event handler for ${event}:`, e);
        }
      });
    }
  }
}

export const wsService = new SupabaseRealtimeService();
