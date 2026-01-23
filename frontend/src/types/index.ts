export enum NotificationType {
  info = 'info',
  success = 'success',
  warning = 'warning',
  error = 'error',
  debug = 'debug',
}

export enum NotificationPriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  urgent = 'urgent',
}

export interface Channel {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  webhookToken: string;
  apiKey?: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  _count?: {
    notifications: number;
  };
  notifications?: Notification[];
}

export interface Notification {
  id: string;
  channelId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  metadata: Record<string, any>;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  unreadCount?: number;
  channel?: {
    id: string;
    name: string;
    description: string;
    webhookToken: string;
  };
}

export interface NotificationResponse {
  data: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateChannelDto {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

