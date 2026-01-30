import { io, Socket } from 'socket.io-client';
import type { Notification } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private subscribedChannels: Set<string> = new Set();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(`${WS_URL}/notifications`, {
      transports: ['websocket'],
      upgrade: true,
      timeout: 60000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      // Re-subscribe all channels after reconnect
      this.subscribedChannels.forEach((channelId) => {
        this.socket?.emit('subscribe:channel', { channelId });
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connect_error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnect_error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnect_failed');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Channel-level unread updates
    this.socket.on('channel:unread-updated', (data: { channelId: string; unreadCount: number }) => {
      this.emit('channel:unread-updated', data);
    });

    // Subscribe to notification events
    this.socket.on('notification:new', (notification: Notification) => {
      this.emit('notification:new', notification);
    });

    this.socket.on('notification:updated', (notification: Notification) => {
      this.emit('notification:updated', notification);
    });

    this.socket.on('notification:deleted', (data: { id: string }) => {
      this.emit('notification:deleted', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeUser(userId: string) {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('subscribe:user', { userId }, (ack: any) => {
      console.log('subscribe:user ack from server', ack);
    });
  }

  subscribeChannel(channelId: string) {
    this.subscribedChannels.add(channelId);
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit('subscribe:channel', { channelId });
  }

  unsubscribeChannel(channelId: string) {
    this.subscribedChannels.delete(channelId);
    this.socket?.emit('unsubscribe:channel', { channelId });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    return () => this.off(event, callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in WebSocket callback:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();

// Auto reconnect on tab visible or network online
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !wsService.isConnected()) {
      wsService.connect();
    }
  });
  window.addEventListener('online', () => {
    if (!wsService.isConnected()) {
      wsService.connect();
    }
  });
}

