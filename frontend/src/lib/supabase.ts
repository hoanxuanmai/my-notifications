import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Channel, Notification, NotificationType, NotificationPriority } from '@/types';

// Default / fallback Supabase credentials
const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ihffmhyyvhfwnzdfpndq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZmZtaHl5dmhmd256ZGZwbmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNjYwMTcsImV4cCI6MjA1NTk0MjAxN30.example';

export function getSupabaseConfig(): { url: string; anonKey: string } {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('supabase_url');
    const customKey = localStorage.getItem('supabase_anon_key');
    if (customUrl && customKey) {
      return { url: customUrl, anonKey: customKey };
    }
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const { url, anonKey } = getSupabaseConfig();
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabase();

// Data mappers to convert Supabase snake_case schema to Frontend camelCase types
export function mapChannelFromDb(row: any): Channel {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || '',
    webhookToken: row.webhook_token || '',
    apiKey: row.api_key || '',
    settings: typeof row.settings === 'object' && row.settings !== null ? row.settings : { template: 'default' },
    isActive: row.is_active !== false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    expiresAt: row.expires_at || '',
    notifications: Array.isArray(row.notifications) 
      ? row.notifications.map(mapNotificationFromDb) 
      : [],
  };
}

export function mapNotificationFromDb(row: any): Notification {
  return {
    id: row.id,
    channelId: row.channel_id,
    title: row.title || 'Notification',
    message: row.message || '',
    type: (row.type as NotificationType) || ('info' as NotificationType),
    priority: (row.priority as NotificationPriority) || ('medium' as NotificationPriority),
    read: Boolean(row.read ?? row.is_read ?? false),
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {},
    readAt: row.read_at,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    expiresAt: row.expires_at || '',
    channel: row.channel ? {
      id: row.channel.id,
      name: row.channel.name,
      description: row.channel.description || '',
      webhookToken: row.channel.webhook_token || '',
    } : undefined,
  };
}
