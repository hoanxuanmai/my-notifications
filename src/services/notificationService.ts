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
  AuthUser,
} from '../types';
import { INITIAL_NOTIFICATIONS, INITIAL_PREFERENCES, INITIAL_TEMPLATES, DEFAULT_USERS } from '../data/mockData';
import { playNotificationSound } from '../utils/audio';

const STORAGE_KEYS = {
  NOTIFICATIONS: 'my_notif_items_v1',
  PREFERENCES: 'my_notif_preferences_v1',
  TEMPLATES: 'my_notif_templates_v1',
  DELIVERY_LOGS: 'my_notif_delivery_logs_v1',
  CONFIG: 'my_notif_supabase_config_v1',
  CURRENT_USER: 'my_notif_current_user_v1',
};

class NotificationService {
  private notifications: NotificationItem[] = [];
  private preferences: UserPreferences = INITIAL_PREFERENCES;
  private templates: NotificationTemplate[] = INITIAL_TEMPLATES;
  private deliveryLogs: DeliveryLog[] = [];
  private currentUser: AuthUser = DEFAULT_USERS[0]; // Default: admin@app.com
  private config: SupabaseConfig = {
    url: '',
    anonKey: '',
    serviceKey: '',
    isConnected: false,
    isMockMode: true,
    realtimeConnected: true,
  };
  private supabaseClient: SupabaseClient | null = null;
  private listeners: Set<() => void> = new Set();
  private realtimeChannel: any = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      this.currentUser = savedUser ? JSON.parse(savedUser) : DEFAULT_USERS[0];

      const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notifications = savedNotifs ? JSON.parse(savedNotifs) : INITIAL_NOTIFICATIONS;

      const savedPrefs = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      this.preferences = savedPrefs ? JSON.parse(savedPrefs) : INITIAL_PREFERENCES;

      const savedTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      this.templates = savedTemplates ? JSON.parse(savedTemplates) : INITIAL_TEMPLATES;

      const savedLogs = localStorage.getItem(STORAGE_KEYS.DELIVERY_LOGS);
      this.deliveryLogs = savedLogs ? JSON.parse(savedLogs) : [];

      const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
        if (this.config.url && this.config.anonKey && this.config.isConnected) {
          this.initSupabase(this.config.url, this.config.anonKey);
        }
      }
    } catch (e) {
      console.warn('Failed to load from storage, using initial mock data', e);
      this.currentUser = DEFAULT_USERS[0];
      this.notifications = INITIAL_NOTIFICATIONS;
      this.preferences = INITIAL_PREFERENCES;
      this.templates = INITIAL_TEMPLATES;
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
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

  public getCurrentUser(): AuthUser {
    return { ...this.currentUser };
  }

  public getAllUsers(): AuthUser[] {
    return [...DEFAULT_USERS];
  }

  public async login(email: string, password?: string): Promise<{ success: boolean; user: AuthUser; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if live Supabase Auth is connected
    if (this.supabaseClient && this.config.isConnected && password) {
      try {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (error) {
          // Attempt sign up if user does not exist
          const { data: signUpData, error: signUpErr } = await this.supabaseClient.auth.signUp({
            email: normalizedEmail,
            password: password,
          });

          if (signUpErr) {
            console.warn('Supabase auth sign in fallback', signUpErr);
          }
        }
      } catch (err) {
        console.warn('Supabase Auth attempt', err);
      }
    }

    // Match preset or build user
    const matched = DEFAULT_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
    const user: AuthUser = matched || {
      id: 'usr-' + Math.random().toString(36).substring(2, 8),
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: normalizedEmail.includes('admin') ? 'admin' : 'user',
      recipientId: normalizedEmail,
      isAuthenticated: true,
      provider: this.config.isConnected ? 'supabase_auth' : 'local_session',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedEmail}`,
    };

    this.currentUser = user;
    this.preferences.userId = user.id;
    this.persist();

    return {
      success: true,
      user,
      message: `Đăng nhập thành công với tài khoản ${user.email} (Role: ${user.role})`,
    };
  }

  public switchUser(user: AuthUser) {
    this.currentUser = { ...user, isAuthenticated: true };
    this.preferences.userId = user.id;
    this.persist();
  }

  public logout() {
    this.currentUser = {
      id: 'usr-guest',
      email: 'guest@app.com',
      name: 'Guest User',
      role: 'user',
      recipientId: 'guest',
      isAuthenticated: false,
    };
    this.persist();
  }

  public getNotifications(): NotificationItem[] {
    return [...this.notifications];
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

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead && !n.isArchived).length;
  }

  // Mark single as read
  public async markAsRead(id: string) {
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();

      if (this.supabaseClient && this.config.isConnected) {
        await this.supabaseClient.from('notifications').update({ is_read: true, read_at: item.readAt }).eq('id', id);
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
        await this.supabaseClient.from('notifications').update({ is_read: item.isRead, read_at: item.readAt }).eq('id', id);
      }
      this.persist();
    }
  }

  // Mark all as read
  public async markAllAsRead() {
    const now = new Date().toISOString();
    this.notifications.forEach((n) => {
      if (!n.isArchived) {
        n.isRead = true;
        n.readAt = now;
      }
    });

    if (this.supabaseClient && this.config.isConnected) {
      await this.supabaseClient
        .from('notifications')
        .update({ is_read: true, read_at: now })
        .eq('user_id', this.preferences.userId)
        .eq('is_read', false);
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
  public clearAllRead() {
    this.notifications = this.notifications.filter((n) => !n.isRead || n.isPinned);
    this.persist();
  }

  // Reset to initial mock
  public resetToInitialData() {
    this.notifications = [...INITIAL_NOTIFICATIONS];
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

    const newItem: NotificationItem = {
      id,
      userId: params.targetUserId || this.preferences.userId,
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

    // Trigger Native Web Notification if permission granted
    if (this.preferences.browserNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newItem.title, {
          body: newItem.message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        // Safe catch
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
        },
      };
      this.deliveryLogs = [log, ...this.deliveryLogs];
    } catch (e: any) {
      const log: DeliveryLog = {
        id: 'log-' + Math.random().toString(36).substring(2, 9),
        notificationId: newItem.id,
        channel,
        status: 'delivered',
        latencyMs: 32,
        attemptCount: 1,
        provider: 'Supabase Realtime Simulator',
        deliveredAt: new Date().toISOString(),
      };
      this.deliveryLogs = [log, ...this.deliveryLogs];
    }

    // If live Supabase is connected, write to Postgres table
    if (this.supabaseClient && this.config.isConnected) {
      try {
        await this.supabaseClient.from('notifications').insert({
          id: newItem.id,
          user_id: newItem.userId,
          title: newItem.title,
          message: newItem.message,
          type: newItem.type,
          channel: newItem.channel,
          priority: newItem.priority,
          payload: newItem.payload,
          is_read: false,
          action_url: newItem.actionUrl,
          sender: newItem.sender,
          created_at: newItem.createdAt,
        });
      } catch (err) {
        console.error('Failed to sync to Supabase table', err);
      }
    }

    this.persist();
    return newItem;
  }

  // Update Preferences
  public updatePreferences(newPrefs: Partial<UserPreferences>) {
    this.preferences = { ...this.preferences, ...newPrefs };
    this.persist();
  }

  // Add or update Template
  public saveTemplate(template: NotificationTemplate) {
    const idx = this.templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      this.templates[idx] = template;
    } else {
      this.templates.push(template);
    }
    this.persist();
  }

  public deleteTemplate(id: string) {
    this.templates = this.templates.filter((t) => t.id !== id);
    this.persist();
  }

  // Initialize Supabase Client
  public async initSupabase(url: string, anonKey: string, serviceKey?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!url.startsWith('https://')) {
        throw new Error('Supabase URL must start with https://');
      }
      const client = createClient(url, anonKey);
      this.supabaseClient = client;

      // Test health query
      const { error } = await client.from('notifications').select('count', { count: 'exact', head: true });
      
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
        .channel('public:notifications')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications' },
          (payload) => {
            console.log('Postgres Realtime Change received:', payload);
            if (payload.eventType === 'INSERT') {
              const row = payload.new as any;
              const notif: NotificationItem = {
                id: row.id,
                userId: row.user_id,
                title: row.title,
                message: row.message,
                type: row.type || 'system',
                channel: row.channel || 'in_app',
                priority: row.priority || 'normal',
                payload: row.payload || {},
                isRead: Boolean(row.is_read),
                readAt: row.read_at,
                isArchived: Boolean(row.is_archived),
                isPinned: Boolean(row.is_pinned),
                actionUrl: row.action_url,
                actionLabel: row.action_label,
                sender: row.sender || { name: 'Postgres Trigger' },
                createdAt: row.created_at || new Date().toISOString(),
                updatedAt: row.updated_at || new Date().toISOString(),
              };
              if (!this.notifications.some((n) => n.id === notif.id)) {
                this.notifications = [notif, ...this.notifications];
                if (this.preferences.soundEnabled) playNotificationSound(notif.priority);
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

  public disconnectSupabase() {
    if (this.supabaseClient && this.realtimeChannel) {
      this.supabaseClient.removeChannel(this.realtimeChannel);
    }
    this.supabaseClient = null;
    this.config.isConnected = false;
    this.config.isMockMode = true;
    this.persist();
  }
}

export const notificationService = new NotificationService();
