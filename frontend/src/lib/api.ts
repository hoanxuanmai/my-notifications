import type {
  Channel,
  Notification,
  NotificationResponse,
  CreateChannelDto,
} from '@/types';
import { supabase, mapChannelFromDb, mapNotificationFromDb } from './supabase';

// Mock initial data in case Supabase is in offline/demo mode
let localChannels: Channel[] = [
  {
    id: 'ch-prod-ops',
    name: 'Production Operations',
    description: 'Critical alerts, server telemetry, and outage reports',
    webhookToken: 'wbk_prod_ops_8f9a2b',
    apiKey: 'key_live_ops_7719',
    settings: { template: 'slack', color: 'emerald' },
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: '',
    notifications: [
      {
        id: 'notif-1',
        channelId: 'ch-prod-ops',
        title: 'Kubernetes Ingress Warning',
        message: 'High latency detected in cluster-sg-east (> 350ms average response time)',
        type: 'warning' as any,
        priority: 'high' as any,
        read: false,
        metadata: { region: 'ap-southeast-1', latencyMs: 384 },
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        expiresAt: '',
      },
    ],
  },
  {
    id: 'ch-security-audit',
    name: 'Security & Auth Log',
    description: 'Suspicious IP detections and IAM policy modifications',
    webhookToken: 'wbk_sec_audit_4k19v',
    apiKey: 'key_live_sec_1092',
    settings: { template: 'default', color: 'purple' },
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: '',
    notifications: [
      {
        id: 'notif-2',
        channelId: 'ch-security-audit',
        title: 'New Admin Login Detected',
        message: 'Successful authentication from new IP address (118.69.12.8)',
        type: 'info' as any,
        priority: 'medium' as any,
        read: true,
        readAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        metadata: { ip: '118.69.12.8', location: 'Da Nang, VN' },
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        expiresAt: '',
      },
    ],
  },
  {
    id: 'ch-ci-cd',
    name: 'CI/CD Pipeline Deployments',
    description: 'Automated GitHub Actions workflow builds & test suites',
    webhookToken: 'wbk_cicd_deploy_99a',
    apiKey: 'key_live_cicd_3341',
    settings: { template: 'slack', color: 'blue' },
    isActive: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: '',
    notifications: [
      {
        id: 'notif-3',
        channelId: 'ch-ci-cd',
        title: 'Release v2.4.0 Deployed',
        message: 'All 4 Edge Functions & Supabase migrations deployed successfully to production.',
        type: 'success' as any,
        priority: 'low' as any,
        read: false,
        metadata: { branch: 'main', commit: '2af1b60' },
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        expiresAt: '',
      },
    ],
  },
];

let localNotifications: Notification[] = [
  ...localChannels.flatMap((ch) => ch.notifications || []),
];

export const setApiAuthToken = (_token: string | null) => {
  // Kept for backward-compatibility with store signatures
};

// Channels API via Supabase
export const channelsApi = {
  getAll: async (): Promise<Channel[]> => {
    try {
      // 1. Try Supabase RPC 'get_user_channels'
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_channels');
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.map(mapChannelFromDb);
      }

      // 2. Try direct select on 'channels' table
      const { data: dbData, error: dbError } = await supabase
        .from('channels')
        .select('*, notifications(*)')
        .order('created_at', { ascending: false });

      if (!dbError && dbData && dbData.length > 0) {
        return dbData.map(mapChannelFromDb);
      }
    } catch (err) {
      console.warn('Supabase channels fetch error, falling back to local state:', err);
    }

    return localChannels;
  },

  getById: async (id: string): Promise<Channel> => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*, notifications(*)')
        .eq('id', id)
        .single();
      if (!error && data) {
        return mapChannelFromDb(data);
      }
    } catch (err) {
      console.warn('Supabase channel getById error:', err);
    }

    const found = localChannels.find((c) => c.id === id);
    if (!found) throw new Error('Channel not found');
    return found;
  },

  create: async (data: CreateChannelDto): Promise<Channel> => {
    try {
      // 1. Try RPC create_channel
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_channel', {
        p_name: data.name,
        p_description: data.description || '',
        p_settings: data.settings || { template: 'default' },
      });

      if (!rpcError && rpcData) {
        return mapChannelFromDb(rpcData);
      }

      // 2. Direct insert
      const token = `wbk_${Math.random().toString(36).substring(2, 10)}`;
      const { data: inserted, error: insertError } = await supabase
        .from('channels')
        .insert({
          name: data.name,
          description: data.description || '',
          webhook_token: token,
          settings: data.settings || { template: 'default' },
          is_active: true,
        })
        .select()
        .single();

      if (!insertError && inserted) {
        return mapChannelFromDb(inserted);
      }
    } catch (err) {
      console.warn('Supabase create_channel error, saving locally:', err);
    }

    // Local fallback
    const newChan: Channel = {
      id: `ch-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      webhookToken: `wbk_${Math.random().toString(36).substring(2, 10)}`,
      apiKey: `key_${Math.random().toString(36).substring(2, 8)}`,
      settings: data.settings || { template: 'default' },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: '',
      notifications: [],
    };
    localChannels = [newChan, ...localChannels];
    return newChan;
  },

  update: async (id: string, data: Partial<CreateChannelDto>): Promise<Channel> => {
    try {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (data.name) updatePayload.name = data.name;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.settings) updatePayload.settings = data.settings;

      const { data: updated, error } = await supabase
        .from('channels')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (!error && updated) {
        return mapChannelFromDb(updated);
      }
    } catch (err) {
      console.warn('Supabase update channel error:', err);
    }

    // Local fallback
    localChannels = localChannels.map((c) =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    );
    const updatedLocal = localChannels.find((c) => c.id === id);
    return updatedLocal!;
  },

  delete: async (id: string): Promise<void> => {
    try {
      await supabase.from('channels').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete channel error:', err);
    }
    localChannels = localChannels.filter((c) => c.id !== id);
    localNotifications = localNotifications.filter((n) => n.channelId !== id);
  },

  addMember: async (channelId: string, email: string): Promise<void> => {
    try {
      // The RPC always adds members with role 'member' and doesn't take p_role
      const { error } = await supabase.rpc('add_channel_member_by_email', {
        p_channel_id: channelId,
        p_email: email,
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase addMember error:', err);
    }
  },

  getMembers: async (channelId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', channelId);
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase getMembers error:', err);
    }
    return [
      { id: 'usr-1', email: 'owner@example.com', username: 'owner', name: 'Channel Owner' },
    ];
  },

  removeMember: async (channelId: string, userId: string): Promise<void> => {
    try {
      await supabase.rpc('remove_channel_member', {
        p_channel_id: channelId,
        p_member_user_id: userId,
      });
    } catch (err) {
      console.warn('Supabase removeMember error:', err);
    }
  },
};

// Notifications API via Supabase
export const notificationsApi = {
  getAll: async (query?: NotificationQueryDto): Promise<NotificationResponse> => {
    try {
      let q = supabase
        .from('notifications')
        .select('*, channel:channels(*)')
        .order('created_at', { ascending: false });

      if (query?.channelId) {
        q = q.eq('channel_id', query.channelId);
      }
      if (query?.limit) {
        const offset = query.offset || 0;
        q = q.range(offset, offset + query.limit - 1);
      }

      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapNotificationFromDb);
        return {
          data: mapped,
          total: mapped.length,
          limit: query?.limit || 20,
          offset: query?.offset || 0,
        };
      }
    } catch (err) {
      console.warn('Supabase notifications fetch error, using local state:', err);
    }

    let list = [...localNotifications];
    if (query?.channelId) {
      list = list.filter((n) => n.channelId === query.channelId);
    }
    return {
      data: list,
      total: list.length,
      limit: query?.limit || 20,
      offset: query?.offset || 0,
    };
  },

  getById: async (id: string): Promise<Notification> => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        return mapNotificationFromDb(data);
      }
    } catch (err) {
      console.warn('Supabase get notification error:', err);
    }

    const found = localNotifications.find((n) => n.id === id);
    if (!found) throw new Error('Notification not found');
    return found;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true, is_read: true, read_at: now })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return mapNotificationFromDb(data);
      }
    } catch (err) {
      console.warn('Supabase markAsRead error:', err);
    }

    localNotifications = localNotifications.map((n) =>
      n.id === id ? { ...n, read: true, readAt: now } : n
    );
    return localNotifications.find((n) => n.id === id)!;
  },

  markAllAsRead: async (channelId?: string): Promise<void> => {
    try {
      if (channelId) {
        await supabase.rpc('mark_channel_notifications_read', { p_channel_id: channelId });
      } else {
        await supabase
          .from('notifications')
          .update({ read: true, is_read: true, read_at: new Date().toISOString() })
          .eq('read', false);
      }
    } catch (err) {
      console.warn('Supabase markAllAsRead error:', err);
    }

    localNotifications = localNotifications.map((n) => {
      if (channelId && n.channelId !== channelId) return n;
      return { ...n, read: true, readAt: new Date().toISOString() };
    });
  },

  getUnreadCount: async (channelId?: string): Promise<number> => {
    try {
      let q = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false);
      if (channelId) {
        q = q.eq('channel_id', channelId);
      }
      const { count, error } = await q;
      if (!error && count !== null) return count;
    } catch (err) {
      console.warn('Supabase getUnreadCount error:', err);
    }

    return localNotifications.filter((n) => !n.read && (!channelId || n.channelId === channelId)).length;
  },

  getUnreadSummary: async (): Promise<Record<string, number>> => {
    try {
      const { data, error } = await supabase.rpc('get_unread_summary_by_channel');
      if (!error && Array.isArray(data)) {
        const summary: Record<string, number> = {};
        data.forEach((item: any) => {
          summary[item.channelId] = item.unreadCount || 0;
        });
        return summary;
      }
    } catch (err) {
      console.warn('Supabase getUnreadSummary error:', err);
    }

    const summary: Record<string, number> = {};
    localChannels.forEach((ch) => {
      summary[ch.id] = localNotifications.filter((n) => n.channelId === ch.id && !n.read).length;
    });
    return summary;
  },

  delete: async (id: string): Promise<void> => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete notification error:', err);
    }
    localNotifications = localNotifications.filter((n) => n.id !== id);
  },
};

// Web Push / Delivery API via Supabase
export const pushApi = {
  subscribe: async (subscription: any): Promise<{ id: string }> => {
    try {
      const userRes = await supabase.auth.getUser();
      // push_subscriptions.user_id is a UUID FK — leave it null rather than
      // the string 'anonymous' (which Postgres rejects) when there's no
      // real Supabase auth session.
      const userId = userRes.data?.user?.id || null;
      const subJson = subscription?.toJSON ? subscription.toJSON() : subscription;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth_token: subJson.keys?.auth,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' })
        .select('id')
        .single();

      if (!error && data) return { id: data.id };
    } catch (err) {
      console.warn('Supabase push subscribe error:', err);
    }
    return { id: `sub-${Date.now()}` };
  },
};

// User Profile & Settings
export const userMeApi = {
  getMe: async (): Promise<any> => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
        };
      }
    } catch (err) {
      console.warn('Supabase getMe error:', err);
    }
    return {
      id: 'demo-user-id',
      email: 'hoanxuanmai@gmail.com',
      username: 'hoanxuanmai',
      name: 'Hoan Xuan Mai',
    };
  },

  getSettings: async (): Promise<any> => {
    try {
      const { data } = await supabase.from('notification_preferences').select('*').single();
      if (data) return data;
    } catch (err) {
      console.warn('Supabase getSettings error:', err);
    }
    return { in_app_enabled: true, push_enabled: true, email_enabled: false };
  },

  updateSettings: async (settings: any): Promise<any> => {
    try {
      const userRes = await supabase.auth.getUser();
      if (userRes.data?.user?.id) {
        const { data } = await supabase
          .from('notification_preferences')
          .upsert({ user_id: userRes.data.user.id, ...settings })
          .select()
          .single();
        return data;
      }
    } catch (err) {
      console.warn('Supabase updateSettings error:', err);
    }
    return settings;
  },

  getWebPushDevices: async (): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          endpoint: d.endpoint,
          createdAt: d.created_at || d.updated_at,
          userAgent: d.user_agent,
          browser: 'Chrome / Web Push',
          os: 'Desktop / Mobile',
        }));
      }
    } catch (err) {
      console.warn('Supabase getWebPushDevices error:', err);
    }
    return [
      {
        id: 'dev-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample_token_882',
        createdAt: new Date().toISOString(),
        browser: 'Chrome 122',
        os: 'macOS / Web Push',
      },
    ];
  },

  deleteWebPushDevice: async (id: string): Promise<void> => {
    try {
      await supabase.from('push_subscriptions').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteWebPushDevice error:', err);
    }
  },
};

export interface NotificationQueryDto {
  channelId?: string;
  type?: string;
  priority?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}
