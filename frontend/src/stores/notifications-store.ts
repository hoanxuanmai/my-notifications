import { create } from 'zustand';
import type { Notification, Channel } from '@/types';
import { notificationsApi, channelsApi } from '@/lib/api';
import { wsService } from '@/lib/websocket';

interface NotificationsState {
  notifications: Notification[];
  channels: Channel[];
  selectedChannelId: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  realtimeInitialized: boolean;
  unreadByChannelId: Record<string, number>;
  hasMoreGlobal: boolean;
  hasMoreByChannelId: Record<string, boolean>;
  paginationOffsetGlobal: number;
  paginationOffsetByChannelId: Record<string, number>;

  // Actions
  fetchChannels: () => Promise<void>;
  fetchNotifications: (channelId?: string) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  createChannel: (data: { name: string; description?: string }) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (channelId?: string) => Promise<void>;
  setSelectedChannel: (channelId: string | null) => void;
  addNotification: (notification: Notification) => void;
  updateNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  channels: [],
  selectedChannelId: null,
  loading: false,
  loadingMore: false,
  error: null,
  realtimeInitialized: false,
  unreadByChannelId: {},
  hasMoreGlobal: true,
  hasMoreByChannelId: {},
  paginationOffsetGlobal: 0,
  paginationOffsetByChannelId: {},

  fetchChannels: async () => {
    set({ loading: true, error: null });
    try {
      const channels = await channelsApi.getAll();

      // Take initial unread snapshot for all channels the user can access
      let initialUnread: Record<string, number> = {};
      try {
        initialUnread = await notificationsApi.getUnreadSummary();
      } catch {
        // If summary API fails, ignore and let realtime updates catch up
        initialUnread = {};
      }

      set({ channels, unreadByChannelId: initialUnread, loading: false });

      // Initialize realtime listeners only once (subscriptions follow selected channels)
      const { realtimeInitialized } = get();
      if (!realtimeInitialized) {
        // Listen for new notifications
        wsService.on('notification:new', (notification: Notification) => {
          // Update unread badge per channel from notification:new
          if (typeof notification.unreadCount === 'number') {
            set((state) => {
              const unreadByChannelId: Record<string, number> = {
                ...state.unreadByChannelId,
              };
              unreadByChannelId[notification.channelId] = notification.unreadCount as number;
              return { unreadByChannelId };
            });
          }
          // Thêm notification vào danh sách chi tiết
          get().addNotification(notification);

          // Update last message for the channel so the sidebar
          // shows latest content and sorts by most recent
          set((state) => ({
            channels: state.channels.map((ch) => {
              if (ch.id !== notification.channelId) return ch;

              const existing = ch.notifications && ch.notifications.length > 0
                ? ch.notifications
                : [];

              return {
                ...ch,
                notifications: [notification, ...existing].slice(0, 1),
              };
            }),
          }));
        });

        wsService.on('notification:updated', (notification: Notification) => {
          get().updateNotification(notification);
        });

        wsService.on('notification:deleted', (data: { id: string }) => {
          get().removeNotification(data.id);
        });

        // Listen for channel unread updates (badge-level)
        wsService.on('channel:unread-updated', (data: { channelId: string; unreadCount: number }) => {
          set((state) => {
            const unreadByChannelId: Record<string, number> = {
              ...state.unreadByChannelId,
            };
            unreadByChannelId[data.channelId] = data.unreadCount;
            return { unreadByChannelId };
          });
        });

        set({ realtimeInitialized: true });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchNotifications: async (channelId?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await notificationsApi.getAll({
        channelId,
        limit: 20,
        offset: 0,
      });
      const pageSize = 20;

      // Nếu không filter channelId, coi như danh sách global
      if (!channelId) {
        set({
          notifications: response.data,
          loading: false,
          hasMoreGlobal: response.data.length >= pageSize,
          paginationOffsetGlobal: response.data.length,
        });
      } else {
        // If filtering by channel, merge into existing list so global data is kept
        set((state) => {
          const existingById = new Map(state.notifications.map((n) => [n.id, n] as const));
          for (const n of response.data) {
            existingById.set(n.id, n);
          }

          return {
            notifications: Array.from(existingById.values()),
            loading: false,
            hasMoreByChannelId: {
              ...state.hasMoreByChannelId,
              [channelId]: response.data.length >= pageSize,
            },
            paginationOffsetByChannelId: {
              ...state.paginationOffsetByChannelId,
              [channelId]: response.data.length,
            },
          };
        });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  loadMoreNotifications: async () => {
    const {
      selectedChannelId,
      loading,
      loadingMore,
      hasMoreGlobal,
      hasMoreByChannelId,
      paginationOffsetGlobal,
      paginationOffsetByChannelId,
    } = get();

    if (loading || loadingMore) return;

    const pageSize = 20;
    const isChannelScope = !!selectedChannelId;
    const scopeHasMore = isChannelScope
      ? hasMoreByChannelId[selectedChannelId!] ?? true
      : hasMoreGlobal;

    if (!scopeHasMore) return;

    const currentOffset = isChannelScope
      ? paginationOffsetByChannelId[selectedChannelId!] ?? 0
      : paginationOffsetGlobal;

    set({ loadingMore: true, error: null });

    try {
      const response = await notificationsApi.getAll({
        channelId: selectedChannelId || undefined,
        limit: pageSize,
        offset: currentOffset,
      });

      set((state) => {
        const merged = new Map(state.notifications.map((n) => [n.id, n] as const));
        for (const n of response.data) {
          merged.set(n.id, n);
        }

        const notifications = Array.from(merged.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        const nextOffset = currentOffset + response.data.length;
        const hasMore = response.data.length >= pageSize;

        if (isChannelScope && selectedChannelId) {
          return {
            notifications,
            loadingMore: false,
            hasMoreByChannelId: {
              ...state.hasMoreByChannelId,
              [selectedChannelId]: hasMore,
            },
            paginationOffsetByChannelId: {
              ...state.paginationOffsetByChannelId,
              [selectedChannelId]: nextOffset,
            },
          };
        }

        return {
          notifications,
          loadingMore: false,
          hasMoreGlobal: hasMore,
          paginationOffsetGlobal: nextOffset,
        };
      });
    } catch (error: any) {
      set({ error: error.message, loadingMore: false });
    }
  },

  createChannel: async (data) => {
    try {
      const channel = await channelsApi.create(data);
      set((state) => ({
        channels: [...state.channels, channel],
      }));
      wsService.subscribeChannel(channel.id);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteChannel: async (id: string) => {
    try {
      await channelsApi.delete(id);
      wsService.unsubscribeChannel(id);
      set((state) => ({
        channels: state.channels.filter((c) => c.id !== id),
        selectedChannelId:
          state.selectedChannelId === id ? null : state.selectedChannelId,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  markAsRead: async (id: string) => {
    try {
      const updated = await notificationsApi.markAsRead(id);
      get().updateNotification(updated);
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  markAllAsRead: async (channelId?: string) => {
    try {
      await notificationsApi.markAllAsRead(channelId);
      set((state) => ({
        notifications: state.notifications.map((n) => {
          // If channelId is provided, only mark notifications of that channel as read
          if (channelId && n.channelId !== channelId) {
            return n;
          }
          return {
            ...n,
            read: true,
            readAt: new Date().toISOString(),
          };
        }),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setSelectedChannel: (channelId: string | null) => {
    set((state) => {
      const previous = state.selectedChannelId;

      // Unsubscribe from previous channel if any
      if (previous && previous !== channelId) {
        wsService.unsubscribeChannel(previous);
      }

      // Subscribe to the newly selected channel
      if (channelId) {
        wsService.subscribeChannel(channelId);
      }

      return { selectedChannelId: channelId };
    });
    get().fetchNotifications(channelId || undefined);
  },

  addNotification: (notification: Notification) => {
    set((state) => {
      // Tránh duplicate khi nhận cùng notification qua nhiều nguồn (REST + WS, user room + channel room)
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications],
      };
    });
  },

  updateNotification: (notification: Notification) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notification.id ? notification : n,
      ),
    }));
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));

// Initialize WebSocket connection
if (typeof window !== 'undefined') {
  wsService.connect();
}

