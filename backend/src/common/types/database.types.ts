// Notification with channel info for dispatch
export type NotificationWithChannel = Notification & {
  channel: {
    id: string;
    userId: string;
    name?: string;
  };
};
import { NotificationType, NotificationPriority } from '../enums/notification.enum';
import { DeliveryChannelType } from '../enums/delivery-channel.enum';

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Channel entity type
 */
export interface Channel extends BaseEntity {
  name: string;
  description?: string | null;
  webhookToken: string;
  apiKey?: string | null;
  settings: any;
  isActive: boolean;
  userId: string;
  expiresAt: Date;
}

/**
 * Notification entity type
 */
export interface Notification extends BaseEntity {
  channelId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  metadata: any;
  readAt?: Date | null;
  expiresAt: Date;
  unreadCount?: number;
  channel?: {
    id: string;
    name: string;
    webhookToken: string;
    userId?: string;
  };
}

/**
 * Channel with count
 */
export interface ChannelWithCount extends Channel {
  _count?: {
    notifications: number;
  };
  notifications?: Notification[];
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  page?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  page?: number;
  totalPages?: number;
}

/**
 * Filter options cho notifications
 */
export interface NotificationFilter {
  channelId?: string | string[]; // Support single or multiple channelIds
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  expiresAt?: {
    gt?: Date;
    lt?: Date;
  };
}

/**
 * Channel member entity type
 */
export interface ChannelMember extends BaseEntity {
  userId: string;
  channelId: string;
}

/**
 * User delivery channel entity type
 */
export interface UserDeliveryChannel extends BaseEntity {
  userId: string;
  type: DeliveryChannelType;
  config: any;
  isActive: boolean;
}


