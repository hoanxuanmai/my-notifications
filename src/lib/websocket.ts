import { supabase, mapNotificationFromDb } from './supabase';
import type { Notification } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RealtimeStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

type EventCallback = (...args: any[]) => void;

class SupabaseRealtimeService {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private channel: RealtimeChannel | null = null;
  private subscribedChannels: Set<string> = new Set();
  private currentUserId: string | null = null;
  private status: RealtimeStatus = 'DISCONNECTED';

  getStatus(): RealtimeStatus {
    return this.status;
  }

  private setStatus(newStatus: RealtimeStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.emit('status:change', newStatus);
    }
  }

  connect() {
    if (typeof window === 'undefined') return;
    if (this.channel) return;

    this.setStatus('CONNECTING');

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
            this.setStatus('CONNECTED');
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.warn('Realtime subscription status:', status);
            this.setStatus('ERROR');
          } else if (status === 'CLOSED') {
            this.setStatus('DISCONNECTED');
          }
        });
    } catch (err) {
      console.warn('Realtime subscription error:', err);
      this.setStatus('ERROR');
    }
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscribedChannels.clear();
    this.setStatus('DISCONNECTED');
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
