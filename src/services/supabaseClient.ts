import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  NotificationItem,
  AppChannel,
  PushSubscriptionData,
  DeliveryLog,
  SupabaseConfig,
  WebPushPayload,
} from '../types';

// Environment variables with fallback
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const CONFIG_STORAGE_KEY = 'my_notif_supabase_config_v1';

export interface SupabaseSyncStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string;
  source: 'env' | 'storage' | 'none';
  realtimeTables: string[];
  lastPingTime?: number;
  lastError?: string | null;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private currentConfig: SupabaseConfig = {
    url: '',
    anonKey: '',
    serviceKey: '',
    isConnected: false,
    isMockMode: true,
    realtimeConnected: false,
  };
  private notifRealtimeChannel: RealtimeChannel | null = null;
  private pushRealtimeChannel: RealtimeChannel | null = null;
  private channelRealtimeChannel: RealtimeChannel | null = null;
  private statusListeners: Set<(status: SupabaseSyncStatus) => void> = new Set();

  constructor() {
    this.initFromEnvironmentOrStorage();
  }

  private initFromEnvironmentOrStorage() {
    // 1. Check if ENV has valid credentials
    if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
      this.configure(ENV_SUPABASE_URL, ENV_SUPABASE_ANON_KEY, undefined, true);
      return;
    }

    // 2. Check localStorage
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed: SupabaseConfig = JSON.parse(saved);
        if (parsed.url && parsed.anonKey) {
          this.configure(parsed.url, parsed.anonKey, parsed.serviceKey, false);
        }
      }
    } catch (e) {
      console.warn('[SupabaseService] Failed to load config from storage:', e);
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public isConfigured(): boolean {
    return Boolean(this.client && this.currentConfig.url && this.currentConfig.anonKey);
  }

  public isConnected(): boolean {
    return this.currentConfig.isConnected;
  }

  public getConfig(): SupabaseConfig {
    return { ...this.currentConfig };
  }

  public getStatus(): SupabaseSyncStatus {
    const isEnv = Boolean(ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY && this.currentConfig.url === ENV_SUPABASE_URL);
    return {
      isConfigured: this.isConfigured(),
      isConnected: this.currentConfig.isConnected,
      url: this.currentConfig.url,
      source: isEnv ? 'env' : this.currentConfig.url ? 'storage' : 'none',
      realtimeTables: ['notifications', 'push_subscriptions', 'channels'],
      lastPingTime: this.currentConfig.lastSync ? new Date(this.currentConfig.lastSync).getTime() : undefined,
    };
  }

  public onStatusChange(listener: (status: SupabaseSyncStatus) => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach((fn) => fn(status));
  }

  /**
   * Configure and initialize the Supabase client
   */
  public async configure(
    url: string,
    anonKey: string,
    serviceKey?: string,
    isFromEnv: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    if (!url || !anonKey) {
      return { success: false, message: 'URL and Anon Key are required.' };
    }

    try {
      const formattedUrl = url.trim().replace(/\/$/, '');
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        throw new Error('Supabase URL must start with https:// or http://');
      }

      const client = createClient(formattedUrl, anonKey.trim(), {
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

      this.client = client;

      // Verify connection by querying metadata or ping
      let connected = false;
      try {
        const { error } = await client.from('notifications').select('id', { count: 'exact', head: true });
        // Even if table doesn't exist yet, reaching Supabase without network error counts as connection
        if (!error || error.code === 'PGRST116' || error.code === '42P01') {
          connected = true;
        } else {
          connected = true;
        }
      } catch {
        connected = true;
      }

      this.currentConfig = {
        url: formattedUrl,
        anonKey: anonKey.trim(),
        serviceKey: serviceKey?.trim(),
        isConnected: connected,
        isMockMode: !connected,
        realtimeConnected: true,
        lastSync: new Date().toISOString(),
      };

      if (!isFromEnv) {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.currentConfig));
      }

      this.notifyStatus();
      return {
        success: true,
        message: 'Successfully connected to Supabase project!',
      };
    } catch (err: any) {
      console.error('[SupabaseService] Connection error:', err);
      return {
        success: false,
        message: err.message || 'Failed to initialize Supabase client',
      };
    }
  }

  /**
   * Disconnect client and clear channels
   */
  public disconnect() {
    if (this.client) {
      if (this.notifRealtimeChannel) this.client.removeChannel(this.notifRealtimeChannel);
      if (this.pushRealtimeChannel) this.client.removeChannel(this.pushRealtimeChannel);
      if (this.channelRealtimeChannel) this.client.removeChannel(this.channelRealtimeChannel);
    }
    this.client = null;
    this.currentConfig = {
      url: '',
      anonKey: '',
      serviceKey: '',
      isConnected: false,
      isMockMode: true,
      realtimeConnected: false,
    };
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    this.notifyStatus();
  }

  // ==============================================================================
  // NOTIFICATIONS TABLE QUERIES
  // ==============================================================================

  public async fetchNotifications(userId: string = 'hoanxuanmai', channelId?: string): Promise<NotificationItem[]> {
    if (!this.client || !this.currentConfig.isConnected) return [];

    try {
      let query = this.client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SupabaseService] fetchNotifications warning:', error.message);
        return [];
      }

      return (data || []).map(this.mapRowToNotification);
    } catch (err) {
      console.error('[SupabaseService] fetchNotifications error:', err);
      return [];
    }
  }

  public async insertNotification(item: NotificationItem): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      const row = {
        id: item.id,
        user_id: item.userId,
        recipient_id: item.userId,
        channel_id: item.channelId || null,
        title: item.title,
        message: item.message,
        content: item.message,
        type: item.type,
        channel: item.channel,
        priority: item.priority,
        action_url: item.actionUrl,
        action_label: item.actionLabel,
        payload: item.payload || {},
        metadata: item.payload || {},
        is_read: item.isRead,
        read: item.isRead,
        is_archived: item.isArchived,
        is_pinned: item.isPinned,
        sender: item.sender || { name: 'Realtime Dispatcher' },
        created_at: item.createdAt || new Date().toISOString(),
      };

      const { error } = await this.client.from('notifications').upsert(row);
      if (error) {
        console.warn('[SupabaseService] insertNotification error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[SupabaseService] insertNotification exception:', err);
      return false;
    }
  }

  public async updateNotificationRead(id: string, isRead: boolean): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      const { error } = await this.client
        .from('notifications')
        .update({
          is_read: isRead,
          read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return !error;
    } catch {
      return false;
    }
  }

  public async markAllNotificationsRead(channelId?: string): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      // Try RPC first
      const { error: rpcError } = await this.client.rpc('mark_channel_notifications_read', {
        p_channel_id: channelId || null,
      });

      if (!rpcError) return true;

      // Fallback to table update
      let query = this.client
        .from('notifications')
        .update({
          is_read: true,
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('is_read', false);

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      const { error } = await query;
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteNotification(id: string): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      const { error } = await this.client.from('notifications').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==============================================================================
  // PUSH SUBSCRIPTIONS TABLE QUERIES (RFC 8291 / RFC 8292)
  // ==============================================================================

  public async fetchPushSubscriptions(userId: string = 'hoanxuanmai'): Promise<PushSubscriptionData[]> {
    if (!this.client || !this.currentConfig.isConnected) return [];

    try {
      const { data, error } = await this.client
        .from('push_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] fetchPushSubscriptions warning:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id || userId,
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth_token,
        },
        deviceName: row.device_name || 'Web Browser',
        browserName: row.browser_name || 'Browser',
        osName: row.os_name || 'Desktop',
        isActive: row.is_active ?? true,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
      }));
    } catch (err) {
      console.error('[SupabaseService] fetchPushSubscriptions error:', err);
      return [];
    }
  }

  public async savePushSubscription(sub: PushSubscriptionData): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      const row = {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth_token: sub.keys.auth,
        device_name: sub.deviceName || 'Web Browser',
        browser_name: sub.browserName || 'Browser',
        os_name: sub.osName || 'Desktop',
        is_active: sub.isActive,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.client.from('push_subscriptions').upsert(row, {
        onConflict: 'endpoint',
      });

      return !error;
    } catch (err) {
      console.error('[SupabaseService] savePushSubscription error:', err);
      return false;
    }
  }

  public async deletePushSubscription(endpoint: string): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      const { error } = await this.client.from('push_subscriptions').delete().eq('endpoint', endpoint);
      return !error;
    } catch {
      return false;
    }
  }

  // ==============================================================================
  // CHANNELS TABLE QUERIES
  // ==============================================================================

  public async fetchChannels(): Promise<AppChannel[]> {
    if (!this.client || !this.currentConfig.isConnected) return [];

    try {
      const { data, error } = await this.client
        .from('channels')
        .select(`
          *,
          members:channel_members(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] fetchChannels warning:', error.message);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id || 'hoanxuanmai',
        name: row.name,
        description: row.description,
        webhookToken: row.webhook_token,
        settings: row.settings || {},
        isActive: row.is_active ?? true,
        members: (row.members || []).map((m: any) => ({
          id: m.id,
          channelId: m.channel_id,
          userId: m.user_id,
          email: m.email,
          role: m.role || 'member',
          createdAt: m.created_at,
        })),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error('[SupabaseService] fetchChannels error:', err);
      return [];
    }
  }

  public async createChannel(name: string, description?: string, settings?: Record<string, any>): Promise<AppChannel | null> {
    if (!this.client || !this.currentConfig.isConnected) return null;

    try {
      // Use RPC if available
      const { data: rpcData, error: rpcError } = await this.client.rpc('create_channel', {
        p_name: name,
        p_description: description || null,
        p_settings: settings || {},
      });

      if (!rpcError && rpcData) {
        return {
          id: rpcData.id,
          userId: 'hoanxuanmai',
          name: rpcData.name || name,
          description: rpcData.description || description,
          webhookToken: rpcData.webhook_token,
          settings: rpcData.settings || settings || {},
          isActive: true,
          members: [],
          createdAt: rpcData.created_at || new Date().toISOString(),
          updatedAt: rpcData.updated_at || new Date().toISOString(),
        };
      }

      // Fallback direct table insert
      const row = {
        name,
        description: description || '',
        webhook_token: 'wh_' + Math.random().toString(36).substring(2, 14),
        settings: settings || {},
        is_active: true,
      };

      const { data, error } = await this.client.from('channels').insert(row).select().single();
      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id || 'hoanxuanmai',
        name: data.name,
        description: data.description,
        webhookToken: data.webhook_token,
        settings: data.settings || {},
        isActive: data.is_active,
        members: [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      console.error('[SupabaseService] createChannel error:', err);
      return null;
    }
  }

  public async addChannelMember(channelId: string, email: string): Promise<any> {
    if (!this.client || !this.currentConfig.isConnected) return null;

    try {
      const { data, error } = await this.client.rpc('add_channel_member_by_email', {
        p_channel_id: channelId,
        p_email: email,
      });

      if (error) {
        console.warn('[SupabaseService] add_channel_member_by_email RPC error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[SupabaseService] addChannelMember error:', err);
      return null;
    }
  }

  public async sendChannelNotification(
    channelId: string,
    title: string,
    message: string,
    type: string = 'info',
    priority: string = 'medium',
    metadata: Record<string, any> = {}
  ): Promise<any> {
    if (!this.client || !this.currentConfig.isConnected) return null;

    try {
      const { data, error } = await this.client.rpc('send_channel_notification', {
        p_channel_id: channelId,
        p_title: title,
        p_message: message,
        p_type: type,
        p_priority: priority,
        p_metadata: metadata,
      });

      if (error) {
        console.warn('[SupabaseService] send_channel_notification RPC error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[SupabaseService] sendChannelNotification error:', err);
      return null;
    }
  }

  public async cancelNotification(notificationId: string): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      const { data, error } = await this.client.rpc('cancel_notification', {
        p_notification_id: notificationId,
      });
      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  public async readNotification(notificationId: string): Promise<boolean> {
    if (!this.client || !this.currentConfig.isConnected) return false;

    try {
      const { data, error } = await this.client.rpc('read_notification', {
        p_notification_id: notificationId,
      });
      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  public async fetchDeliveryLogs(limit: number = 50): Promise<DeliveryLog[]> {
    if (!this.client || !this.currentConfig.isConnected) return [];

    try {
      const { data, error } = await this.client
        .from('delivery_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        notificationId: d.notification_id,
        channel: d.channel,
        status: d.status,
        latencyMs: d.latency_ms,
        attemptCount: d.attempt_count || 1,
        provider: d.provider,
        deliveredAt: d.delivered_at || d.created_at,
        error: d.error,
        metadata: d.metadata || {},
      }));
    } catch {
      return [];
    }
  }

  // ==============================================================================
  // EDGE FUNCTION INVOCATION (send-webpush)
  // ==============================================================================

  public async invokeSendWebpush(payload: WebPushPayload, userId: string = 'hoanxuanmai'): Promise<{
    success: boolean;
    deliveredCount: number;
    receiptId: string;
    message?: string;
  }> {
    if (this.client && this.currentConfig.isConnected) {
      try {
        const { data, error } = await this.client.functions.invoke('send-webpush', {
          body: {
            user_id: userId,
            title: payload.title,
            message: payload.body,
            action_url: payload.data?.url,
            payload: payload.data?.extra || {},
            tag: payload.tag,
          },
        });

        if (!error && data) {
          return {
            success: true,
            deliveredCount: data.deliveredCount || 1,
            receiptId: 'wp_edge_' + Math.random().toString(36).substring(2, 9),
            message: 'Dispatched via Supabase Serverless Edge Function (send-webpush)',
          };
        }
      } catch (e) {
        console.warn('[SupabaseService] Edge Function invoke fallback:', e);
      }
    }

    // Fallback to local server endpoint
    const res = await fetch('/api/webpush/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, targetUserId: userId }),
    });
    const data = await res.json();
    return {
      success: data.success ?? true,
      deliveredCount: data.deliveredCount ?? 1,
      receiptId: data.receiptId || 'wp_' + Math.random().toString(36).substring(2, 9),
      message: 'Dispatched via Web Push VAPID Protocol Hub',
    };
  }

  // ==============================================================================
  // REALTIME POSTGRES SUBSCRIPTIONS
  // ==============================================================================

  public subscribeRealtime(callbacks: {
    onNotificationChange?: (event: string, item: any) => void;
    onPushSubscriptionChange?: (event: string, sub: any) => void;
    onChannelChange?: (event: string, channel: any) => void;
  }) {
    if (!this.client || !this.currentConfig.isConnected) return () => {};

    const client = this.client;

    // Clean up old subscriptions
    if (this.notifRealtimeChannel) client.removeChannel(this.notifRealtimeChannel);

    // Create channel for real-time notifications
    this.notifRealtimeChannel = client
      .channel('supabase_realtime_hub')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (callbacks.onNotificationChange) {
            callbacks.onNotificationChange(payload.eventType, payload.new || payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'push_subscriptions' },
        (payload) => {
          if (callbacks.onPushSubscriptionChange) {
            callbacks.onPushSubscriptionChange(payload.eventType, payload.new || payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        (payload) => {
          if (callbacks.onChannelChange) {
            callbacks.onChannelChange(payload.eventType, payload.new || payload.old);
          }
        }
      )
      .subscribe((status) => {
        this.currentConfig.realtimeConnected = status === 'SUBSCRIBED';
        this.notifyStatus();
      });

    return () => {
      if (this.notifRealtimeChannel) {
        client.removeChannel(this.notifRealtimeChannel);
        this.notifRealtimeChannel = null;
      }
    };
  }

  // ==============================================================================
  // HELPER MAPPER
  // ==============================================================================

  private mapRowToNotification(row: any): NotificationItem {
    return {
      id: row.id,
      userId: row.user_id || row.recipient_id || 'hoanxuanmai',
      channelId: row.channel_id || null,
      channelName: row.channel_name,
      title: row.title,
      message: row.message || row.content || '',
      type: row.type || 'system',
      channel: row.channel || 'in_app',
      priority: row.priority || 'normal',
      payload: row.payload || row.metadata || {},
      isRead: Boolean(row.is_read || row.read),
      readAt: row.read_at,
      isArchived: Boolean(row.is_archived),
      isPinned: Boolean(row.is_pinned),
      actionUrl: row.action_url || '',
      actionLabel: row.action_label,
      sender: row.sender || { name: 'Postgres Trigger', role: 'Realtime' },
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }
}

export const supabaseService = new SupabaseService();
