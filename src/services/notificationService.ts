import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  NotificationItem,
  DeliveryLog,
  UserPreferences,
  NotificationTemplate,
  SupabaseConfig,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  AppChannel,
  ChannelMember,
} from '../types';
import { INITIAL_NOTIFICATIONS, INITIAL_PREFERENCES, INITIAL_TEMPLATES, INITIAL_CHANNELS } from '../data/mockData';
import { playNotificationSound } from '../utils/audio';
import { webPushService } from './webPushService';
import { supabaseService } from './supabaseClient';

const STORAGE_KEYS = {
  NOTIFICATIONS: 'my_notif_items_v1',
  CHANNELS: 'my_notif_channels_v1',
  PREFERENCES: 'my_notif_preferences_v1',
  TEMPLATES: 'my_notif_templates_v1',
  DELIVERY_LOGS: 'my_notif_delivery_logs_v1',
  CONFIG: 'my_notif_supabase_config_v1',
};

class NotificationService {
  private notifications: NotificationItem[] = [];
  private channels: AppChannel[] = INITIAL_CHANNELS;
  private preferences: UserPreferences = INITIAL_PREFERENCES;
  private templates: NotificationTemplate[] = INITIAL_TEMPLATES;
  private deliveryLogs: DeliveryLog[] = [];
  private config: SupabaseConfig = {
    url: '',
    anonKey: '',
    serviceKey: '',
    isConnected: false,
    isMockMode: true,
    realtimeConnected: false,
  };
  private supabaseClient: SupabaseClient | null = null;
  private listeners: Set<() => void> = new Set();
  private realtimeChannel: any = null;

  constructor() {
    this.loadFromStorage();
    this.initSupabaseFromEnvOrService();
  }

  private initSupabaseFromEnvOrService() {
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (envUrl && envAnon) {
      this.initSupabase(envUrl, envAnon);
    } else if (this.config.url && this.config.anonKey && this.config.isConnected) {
      this.initSupabase(this.config.url, this.config.anonKey, this.config.serviceKey);
    }
  }

  private loadFromStorage() {
    try {
      const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notifications = savedNotifs ? JSON.parse(savedNotifs) : INITIAL_NOTIFICATIONS;

      const savedChannels = localStorage.getItem(STORAGE_KEYS.CHANNELS);
      this.channels = savedChannels ? JSON.parse(savedChannels) : INITIAL_CHANNELS;

      const savedPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      this.preferences = savedPrefs ? JSON.parse(savedPrefs) : INITIAL_PREFERENCES;

      const savedTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      this.templates = savedTemplates ? JSON.parse(savedTemplates) : INITIAL_TEMPLATES;

      const savedLogs = localStorage.getItem(STORAGE_KEYS.DELIVERY_LOGS);
      this.deliveryLogs = savedLogs ? JSON.parse(savedLogs) : [];

      const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      }
    } catch (e) {
      console.warn('Failed to load from storage, using initial mock data', e);
      this.notifications = INITIAL_NOTIFICATIONS;
      this.channels = INITIAL_CHANNELS;
      this.preferences = INITIAL_PREFERENCES;
      this.templates = INITIAL_TEMPLATES;
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
      localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(this.channels));
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(this.templates));
      localStorage.setItem(STORAGE_KEYS.DELIVERY_LOGS, JSON.stringify(this.deliveryLogs.slice(0, 100)));
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.error('Storage save error', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: (notifications?: NotificationItem[]) => void) {
    const wrapped = () => listener(this.notifications);
    this.listeners.add(wrapped);
    return () => {
      this.listeners.delete(wrapped);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  public getChannels(): AppChannel[] {
    return [...this.channels];
  }

  public getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  public getTemplates(): NotificationTemplate[] {
    return [...this.templates];
  }

  public getDeliveryLogs(): DeliveryLog[] {
    return [...this.deliveryLogs];
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public getSupabaseConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public isLiveConnected(): boolean {
    return this.config.isConnected;
  }

  public async testSupabaseConnection(params: { url: string; anonKey: string; serviceKey?: string }) {
    return this.initSupabase(params.url, params.anonKey, params.serviceKey);
  }

  public getUnreadCount(channelId?: string): number {
    return this.notifications.filter((n) => {
      if (channelId && n.channelId !== channelId) return false;
      return !n.isRead && !n.isArchived;
    }).length;
  }

  // Create Channel
  public async createChannel(params: { name: string; description?: string; settings?: Record<string, any> }): Promise<AppChannel> {
    const id = 'ch-' + Math.random().toString(36).substring(2, 9);
    const webhookToken = 'wh_' + Math.random().toString(36).substring(2, 14);
    const now = new Date().toISOString();

    const newChannel: AppChannel = {
      id,
      userId: this.preferences.userId,
      name: params.name,
      description: params.description || '',
      webhookToken,
      settings: params.settings || { template: 'default' },
      isActive: true,
      members: [
        {
          id: 'mem-' + Math.random().toString(36).substring(2, 7),
          channelId: id,
          userId: this.preferences.userId,
          email: `${this.preferences.userId}@gmail.com`,
          role: 'owner',
        },
      ],
      _count: { notifications: 0 },
      createdAt: now,
      updatedAt: now,
    };

    if (this.supabaseClient && this.config.isConnected) {
      try {
        const { data, error } = await this.supabaseClient.rpc('create_channel', {
          p_name: params.name,
          p_description: params.description || null,
          p_settings: params.settings || {},
        });
        if (!error && data) {
          newChannel.id = data.id || newChannel.id;
          newChannel.webhookToken = data.webhook_token || newChannel.webhookToken;
        }
      } catch (err) {
        console.warn('RPC create_channel fallback to local store:', err);
      }
    }

    this.channels = [newChannel, ...this.channels];
    this.persist();
    return newChannel;
  }

  // Add Member by Email
  public async addChannelMember(channelId: string, email: string): Promise<ChannelMember> {
    const channel = this.channels.find((c) => c.id === channelId);
    if (!channel) throw new Error('Channel not found');

    const newMember: ChannelMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 7),
      channelId,
      userId: email.split('@')[0],
      email,
      role: 'member',
      createdAt: new Date().toISOString(),
    };

    if (this.supabaseClient && this.config.isConnected) {
      try {
        await this.supabaseClient.rpc('add_channel_member_by_email', {
          p_channel_id: channelId,
          p_email: email,
        });
      } catch (err) {
        console.warn('RPC add_channel_member_by_email fallback:', err);
      }
    }

    if (!channel.members) channel.members = [];
    if (!channel.members.some((m) => m.email === email)) {
      channel.members.push(newMember);
      this.persist();
    }

    return newMember;
  }

  // Remove Channel Member
  public async removeChannelMember(channelId: string, memberUserId: string): Promise<boolean> {
    const channel = this.channels.find((c) => c.id === channelId);
    if (channel && channel.members) {
      channel.members = channel.members.filter((m) => m.userId !== memberUserId && m.id !== memberUserId);
      if (this.supabaseClient && this.config.isConnected) {
        try {
          await this.supabaseClient.rpc('remove_channel_member', {
            p_channel_id: channelId,
            p_member_user_id: memberUserId,
          });
        } catch (err) {
          console.warn('RPC remove_channel_member fallback:', err);
        }
      }
      this.persist();
      return true;
    }
    return false;
  }

  // Mark single as read
  public async markAsRead(id: string) {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();

      if (this.supabaseClient && this.config.isConnected) {
        await this.supabaseClient.from('notifications').update({ is_read: true, read: true, read_at: item.readAt }).eq('id', id);
      }
      this.persist();
    }
  }

  // Toggle read status
  public async toggleRead(id: string) {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.isRead = !item.isRead;
      item.readAt = item.isRead ? new Date().toISOString() : null;
      item.updatedAt = new Date().toISOString();

      if (this.supabaseClient && this.config.isConnected) {
        await this.supabaseClient.from('notifications').update({ is_read: item.isRead, read: item.isRead, read_at: item.readAt }).eq('id', id);
      }
      this.persist();
    }
  }

  // Mark all as read (or channel specific)
  public async markAllAsRead(channelId?: string) {
    const now = new Date().toISOString();
    this.notifications.forEach((n) => {
      if (channelId && n.channelId !== channelId) return;
      if (!n.isArchived) {
        n.isRead = true;
        n.readAt = now;
      }
    });

    if (this.supabaseClient && this.config.isConnected) {
      try {
        await this.supabaseClient.rpc('mark_channel_notifications_read', {
          p_channel_id: channelId || null,
        });
      } catch (err) {
        console.warn('RPC mark_channel_notifications_read fallback:', err);
      }
    }
    this.persist();
  }

  // Archive
  public async toggleArchive(id: string) {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.isArchived = !item.isArchived;
      item.updatedAt = new Date().toISOString();
      if (this.supabaseClient && this.config.isConnected) {
        await this.supabaseClient.from('notifications').update({ is_archived: item.isArchived }).eq('id', id);
      }
      this.persist();
    }
  }

  // Pin
  public async togglePin(id: string) {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.isPinned = !item.isPinned;
      this.persist();
    }
  }

  // Delete
  public async deleteNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    if (this.supabaseClient && this.config.isConnected) {
      await this.supabaseClient.from('notifications').delete().eq('id', id);
    }
    this.persist();
  }

  // Clear all read notifications
  public clearAllRead(channelId?: string) {
    this.notifications = this.notifications.filter((n) => {
      if (channelId && n.channelId !== channelId) return true;
      return !n.isRead || n.isPinned;
    });
    this.persist();
  }

  // Reset to initial mock
  public resetToInitialData() {
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.channels = [...INITIAL_CHANNELS];
    this.preferences = { ...INITIAL_PREFERENCES };
    this.templates = [...INITIAL_TEMPLATES];
    this.deliveryLogs = [];
    this.persist();
  }

  // Dispatch / Send a new Notification
  public async dispatchNotification(params: {
    title: string;
    message: string;
    type?: NotificationCategory;
    channel?: NotificationChannel;
    channelId?: string;
    channelName?: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    actionLabel?: string;
    payload?: Record<string, any>;
    senderName?: string;
    senderRole?: string;
    targetUserId?: string;
  }): Promise<NotificationItem> {
    const id = 'notif-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const priority = params.priority || 'normal';
    const channel = params.channel || 'in_app';
    const type = params.type || 'system';

    const targetChannel = params.channelId ? this.channels.find((c) => c.id === params.channelId) : null;
    const channelName = params.channelName || targetChannel?.name;

    const newItem: NotificationItem = {
      id,
      userId: params.targetUserId || this.preferences.userId,
      channelId: params.channelId || null,
      channelName,
      title: params.title,
      message: params.message,
      type,
      channel,
      priority,
      actionUrl: params.actionUrl || '',
      actionLabel: params.actionLabel || (params.actionUrl ? 'View Details' : undefined),
      payload: params.payload || {},
      sender: {
        name: params.senderName || 'Notification Hub',
        role: params.senderRole || 'Realtime Dispatcher',
      },
      isRead: false,
      readAt: null,
      isArchived: false,
      isPinned: priority === 'urgent',
      createdAt: now,
      updatedAt: now,
    };

    // Prepend to notifications
    this.notifications = [newItem, ...this.notifications];

    // Play chime sound if enabled
    if (this.preferences.soundEnabled) {
      playNotificationSound(priority);
    }

    // If channel is push, trigger web push notification
    if (channel === 'push') {
      try {
        webPushService.triggerNativeNotification({
          title: newItem.title,
          body: newItem.message,
          data: { url: newItem.actionUrl || '/' },
        });
      } catch (err) {
        console.debug('WebPush local notification suppressed or not permitted:', err);
      }
    }

    // Call server dispatch test endpoint to log delivery
    const startTime = Date.now();
    try {
      const res = await fetch('/api/dispatch-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          payload: newItem,
        }),
      });
      const data = await res.json();
      const latency = data.latencyMs || Date.now() - startTime;

      const log: DeliveryLog = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        notificationId: newItem.id,
        channel,
        status: data.status || 'delivered',
        latencyMs: latency,
        attemptCount: 1,
        provider: data.channelDetails?.provider || 'Supabase Realtime WAL',
        deliveredAt: new Date().toISOString(),
        metadata: {
          priority,
          category: type,
          channelId: params.channelId,
          channelName,
        },
      };
      this.deliveryLogs = [log, ...this.deliveryLogs];
    } catch {
      const log: DeliveryLog = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        notificationId: newItem.id,
        channel,
        status: 'delivered',
        latencyMs: 14,
        attemptCount: 1,
        provider: 'Supabase Realtime Channel Engine',
        deliveredAt: new Date().toISOString(),
        metadata: {
          channelId: params.channelId,
          channelName,
        },
      };
      this.deliveryLogs = [log, ...this.deliveryLogs];
    }

    // If live Supabase is connected, write via RPC or Table insert
    if (this.supabaseClient && this.config.isConnected) {
      try {
        if (params.channelId) {
          const { data: rpcData } = await this.supabaseClient.rpc('send_channel_notification', {
            p_channel_id: params.channelId,
            p_title: newItem.title,
            p_message: newItem.message,
            p_type: newItem.type,
            p_priority: newItem.priority,
            p_metadata: newItem.payload || {},
            p_ttl_days: 3,
          });
          if (rpcData && rpcData.id) {
            newItem.id = rpcData.id;
          }
        } else {
          const { data: insData } = await this.supabaseClient.from('notifications').insert({
            user_id: newItem.userId,
            recipient_id: newItem.userId,
            title: newItem.title,
            message: newItem.message,
            content: newItem.message,
            type: newItem.type,
            channel: newItem.channel,
            priority: newItem.priority,
            payload: newItem.payload,
            metadata: newItem.payload,
            read: false,
            is_read: false,
            action_url: newItem.actionUrl,
            sender: newItem.sender,
            created_at: newItem.createdAt,
          }).select().single();
          if (insData && insData.id) {
            newItem.id = insData.id;
          }
        }

        // Also record in delivery_logs table
        await this.supabaseClient.from('delivery_logs').insert({
          notification_id: newItem.id,
          channel: newItem.channel,
          status: 'delivered',
          latency_ms: 12,
          provider: 'Supabase Realtime WAL',
          metadata: {
            priority: newItem.priority,
            category: newItem.type,
            channelId: params.channelId,
            channelName,
          },
        });
      } catch (err) {
        console.error('Failed to sync to Supabase table/rpc', err);
      }
    }

    this.persist();
    return newItem;
  }

  // Update Preferences
  public async updatePreferences(newPrefs: Partial<UserPreferences>) {
    this.preferences = { ...this.preferences, ...newPrefs };
    if (this.supabaseClient && this.config.isConnected) {
      try {
        await this.supabaseClient.from('notification_preferences').upsert({
          user_id: this.preferences.userId || 'hoanxuanmai',
          in_app_enabled: this.preferences.inAppEnabled,
          push_enabled: this.preferences.pushEnabled,
          email_enabled: this.preferences.emailEnabled,
          webhook_enabled: this.preferences.webhookEnabled,
          sound_enabled: this.preferences.soundEnabled,
          quiet_hours_enabled: this.preferences.quietHours?.enabled ?? false,
          quiet_hours_start: this.preferences.quietHours?.startTime || '22:00',
          quiet_hours_end: this.preferences.quietHours?.endTime || '07:00',
          categories: this.preferences.categories,
          channels: this.preferences.channels,
          frequency: this.preferences.digestFrequency || 'instant',
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to sync preferences to Supabase:', err);
      }
    }
    this.persist();
  }

  // Add or update Template
  public async saveTemplate(template: NotificationTemplate) {
    const idx = this.templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      this.templates[idx] = template;
    } else {
      this.templates.unshift(template);
    }

    if (this.supabaseClient && this.config.isConnected) {
      try {
        await this.supabaseClient.from('notification_templates').upsert({
          id: template.id,
          name: template.name,
          slug: template.slug,
          category: template.category,
          default_channel: template.defaultChannel,
          title_template: template.titleTemplate,
          body_template: template.bodyTemplate,
          variables: template.variables,
          sample_variables: template.sampleVariables,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Failed to upsert template to Supabase:', err);
      }
    }
    this.persist();
  }

  public async deleteTemplate(id: string) {
    this.templates = this.templates.filter((t) => t.id !== id);
    if (this.supabaseClient && this.config.isConnected) {
      try {
        await this.supabaseClient.from('notification_templates').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete template from Supabase:', err);
      }
    }
    this.persist();
  }

  // Initialize Supabase Client
  public async initSupabase(url: string, anonKey: string, serviceKey?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        throw new Error('Supabase URL must start with https:// or http://');
      }
      const client = createClient(url, anonKey);
      this.supabaseClient = client;

      // Sync with supabaseService singleton
      await supabaseService.configure(url, anonKey, serviceKey, false);

      // Query initial data from live tables
      try {
        const { data: dbNotifs, error: notifErr } = await client
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!notifErr && dbNotifs && dbNotifs.length > 0) {
          const mapped: NotificationItem[] = dbNotifs.map((row: any) => ({
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
            sender: row.sender || { name: 'Postgres DB', role: 'Realtime' },
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          }));
          this.notifications = mapped;
        }
      } catch (e) {
        console.warn('Initial notifications fetch notice:', e);
      }

      // Query channels
      try {
        const { data: dbChannels, error: chErr } = await client
          .from('channels')
          .select('*, members:channel_members(*)')
          .order('created_at', { ascending: false });

        if (!chErr && dbChannels && dbChannels.length > 0) {
          this.channels = dbChannels.map((c: any) => ({
            id: c.id,
            userId: c.user_id || 'hoanxuanmai',
            name: c.name,
            description: c.description || '',
            webhookToken: c.webhook_token,
            settings: c.settings || {},
            isActive: c.is_active ?? true,
            members: (c.members || []).map((m: any) => ({
              id: m.id,
              channelId: m.channel_id,
              userId: m.user_id,
              email: m.email,
              role: m.role || 'member',
              createdAt: m.created_at,
            })),
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
        }
      } catch (e) {
        console.warn('Initial channels fetch notice:', e);
      }

      // Query preferences
      try {
        const { data: dbPrefs } = await client
          .from('notification_preferences')
          .select('*')
          .eq('user_id', this.preferences.userId || 'hoanxuanmai')
          .maybeSingle();

        if (dbPrefs) {
          this.preferences = {
            ...this.preferences,
            inAppEnabled: dbPrefs.in_app_enabled ?? this.preferences.inAppEnabled,
            pushEnabled: dbPrefs.push_enabled ?? this.preferences.pushEnabled,
            emailEnabled: dbPrefs.email_enabled ?? this.preferences.emailEnabled,
            webhookEnabled: dbPrefs.webhook_enabled ?? this.preferences.webhookEnabled,
            soundEnabled: dbPrefs.sound_enabled ?? this.preferences.soundEnabled,
            quietHours: {
              enabled: dbPrefs.quiet_hours_enabled ?? this.preferences.quietHours?.enabled ?? false,
              startTime: dbPrefs.quiet_hours_start || this.preferences.quietHours?.startTime || '22:00',
              endTime: dbPrefs.quiet_hours_end || this.preferences.quietHours?.endTime || '07:00',
              overrideUrgent: this.preferences.quietHours?.overrideUrgent ?? true,
            },
            categories: dbPrefs.categories || this.preferences.categories,
            channels: dbPrefs.channels || this.preferences.channels,
            digestFrequency: (dbPrefs.frequency as any) || this.preferences.digestFrequency || 'instant',
          };
        }
      } catch (e) {
        console.warn('Initial preferences fetch notice:', e);
      }

      // Query templates
      try {
        const { data: dbTemplates } = await client
          .from('notification_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbTemplates && dbTemplates.length > 0) {
          this.templates = dbTemplates.map((t: any) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            category: t.category || 'system',
            defaultChannel: t.default_channel || 'in_app',
            titleTemplate: t.title_template,
            bodyTemplate: t.body_template,
            variables: t.variables || [],
            sampleVariables: t.sample_variables || {},
            createdAt: t.created_at,
          }));
        }
      } catch (e) {
        console.warn('Initial templates fetch notice:', e);
      }

      // Query delivery logs
      try {
        const { data: dbLogs } = await client
          .from('delivery_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (dbLogs && dbLogs.length > 0) {
          this.deliveryLogs = dbLogs.map((l: any) => ({
            id: l.id,
            notificationId: l.notification_id,
            channel: l.channel,
            status: l.status,
            latencyMs: l.latency_ms || 10,
            attemptCount: l.attempt_count || 1,
            provider: l.provider || 'Supabase Realtime WAL',
            deliveredAt: l.delivered_at || l.created_at,
            metadata: l.metadata || {},
          }));
        }
      } catch (e) {
        console.warn('Initial delivery logs fetch notice:', e);
      }

      this.config = {
        url,
        anonKey,
        serviceKey,
        isConnected: true,
        isMockMode: false,
        realtimeConnected: true,
        lastSync: new Date().toISOString(),
      };

      // Subscribe to Realtime Postgres changes
      if (this.realtimeChannel) {
        client.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = client
        .channel('public:notifications_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          (payload) => {
            console.log('Postgres Realtime Notification Change:', payload);
            if (payload.eventType === 'INSERT') {
              const row = payload.new as any;
              const notif: NotificationItem = {
                id: row.id,
                userId: row.user_id || row.recipient_id || 'hoanxuanmai',
                channelId: row.channel_id || null,
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
                actionUrl: row.action_url,
                actionLabel: row.action_label,
                sender: row.sender || { name: 'Postgres Realtime' },
                createdAt: row.created_at || new Date().toISOString(),
                updatedAt: row.updated_at || new Date().toISOString(),
              };
              if (!this.notifications.some((n) => n.id === notif.id)) {
                this.notifications = [notif, ...this.notifications];
                if (this.preferences.soundEnabled) playNotificationSound(notif.priority);
                this.persist();
              }
            } else if (payload.eventType === 'UPDATE') {
              const row = payload.new as any;
              this.notifications = this.notifications.map((n) =>
                n.id === row.id
                  ? {
                      ...n,
                      isRead: Boolean(row.is_read || row.read),
                      readAt: row.read_at,
                      isArchived: Boolean(row.is_archived),
                      isPinned: Boolean(row.is_pinned),
                      updatedAt: row.updated_at || new Date().toISOString(),
                    }
                  : n
              );
              this.persist();
            } else if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as any;
              this.notifications = this.notifications.filter((n) => n.id !== oldRow.id);
              this.persist();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'channels' },
          (payload) => {
            console.log('Postgres Realtime Channel Change:', payload);
            if (payload.eventType === 'INSERT') {
              const c = payload.new as any;
              if (!this.channels.some((item) => item.id === c.id)) {
                this.channels = [
                  {
                    id: c.id,
                    userId: c.user_id || 'hoanxuanmai',
                    name: c.name,
                    description: c.description || '',
                    webhookToken: c.webhook_token,
                    settings: c.settings || {},
                    isActive: c.is_active ?? true,
                    members: [],
                    createdAt: c.created_at,
                    updatedAt: c.updated_at,
                  },
                  ...this.channels,
                ];
                this.persist();
              }
            }
          }
        )
        .subscribe();

      this.persist();
      return { success: true, message: 'Connected to Supabase project successfully with Realtime subscription active!' };
    } catch (err: any) {
      console.error('Supabase init error:', err);
      return { success: false, message: err.message || 'Failed to connect to Supabase' };
    }
  }

  public async getUnreadSummaryByChannel(): Promise<any[]> {
    if (this.supabaseClient && this.config.isConnected) {
      try {
        const { data, error } = await this.supabaseClient.rpc('get_unread_summary_by_channel');
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('RPC get_unread_summary_by_channel error:', err);
      }
    }

    // Local fallback calculation
    return this.channels.map((ch) => {
      const channelNotifs = this.notifications.filter((n) => n.channelId === ch.id);
      return {
        channelId: ch.id,
        channelName: ch.name,
        description: ch.description,
        unreadCount: channelNotifs.filter((n) => !n.isRead).length,
        totalCount: channelNotifs.length,
        lastNotificationAt: channelNotifs[0]?.createdAt || ch.createdAt,
      };
    });
  }

  public async cleanupExpiredRecords(): Promise<{ success: boolean; deletedNotificationsCount: number; deletedChannelsCount: number }> {
    if (this.supabaseClient && this.config.isConnected) {
      try {
        const { data, error } = await this.supabaseClient.rpc('cleanup_expired_records');
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('RPC cleanup_expired_records error:', err);
      }
    }
    return { success: true, deletedNotificationsCount: 0, deletedChannelsCount: 0 };
  }

  public async getAdminUsers(): Promise<any[]> {
    if (this.supabaseClient && this.config.isConnected) {
      try {
        const { data, error } = await this.supabaseClient.rpc('get_admin_users');
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('RPC get_admin_users error:', err);
      }
    }
    return [
      {
        id: 'hoanxuanmai-id',
        email: 'hoanxuanmai@gmail.com',
        name: 'Hoan Xuan Mai',
        role: 'admin',
        createdAt: new Date().toISOString(),
        channelsCount: this.channels.length,
        pushDevicesCount: 1,
      },
    ];
  }

  public async adminDeleteUser(userId: string): Promise<boolean> {
    if (this.supabaseClient && this.config.isConnected) {
      try {
        const { error } = await this.supabaseClient.rpc('admin_delete_user', { p_user_id: userId });
        return !error;
      } catch (err) {
        console.warn('RPC admin_delete_user error:', err);
        return false;
      }
    }
    return true;
  }

  public disconnectSupabase() {
    if (this.supabaseClient && this.realtimeChannel) {
      this.supabaseClient.removeChannel(this.realtimeChannel);
    }
    this.supabaseClient = null;
    supabaseService.disconnect();
    this.config.isConnected = false;
    this.config.isMockMode = true;
    this.persist();
  }
}

export const notificationService = new NotificationService();

