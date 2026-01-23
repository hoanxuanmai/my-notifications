import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { addMonths } from 'date-fns';
import { NotificationType, NotificationPriority } from '../common/enums/notification.enum';
import { NotificationsRepository } from '../common/repositories/notifications.repository';
import { NotificationFilter } from '../common/types/database.types';
import { ChannelsRepository } from '../common/repositories/channels.repository';
import { ChannelMembersRepository } from '../common/repositories/channel-members.repository';
import { NotificationsGateway } from '../websocket/notifications.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly channelsRepository: ChannelsRepository,
    private readonly channelMembersRepository: ChannelMembersRepository,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectQueue('notifications-dispatch')
    private readonly notificationsDispatchQueue: Queue,
  ) {}

  async create(channelId: string, createNotificationDto: CreateNotificationDto) {
    const expiresAt = addMonths(new Date(), 1);

    const notification = await this.notificationsRepository.create(
      {
        ...createNotificationDto,
        channelId,
        type: createNotificationDto.type || NotificationType.INFO,
        priority: createNotificationDto.priority || NotificationPriority.MEDIUM,
        metadata: createNotificationDto.metadata || {},
        expiresAt,
      },
      {
        channel: {
          select: {
            id: true,
            name: true,
            webhookToken: true,
            userId: true,
          },
        },
      },
    );

    // Push dispatch job to queue to handle asynchronously
    await this.notificationsDispatchQueue.add(
      'dispatch',
      {
        notificationId: notification.id,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    return notification;
  }

  async findAll(query: NotificationQueryDto, userId: string) {
    // Validate channelId belongs to user if provided
    if (query.channelId) {
      const channel = await this.channelsRepository.findById(query.channelId);
      if (!channel) {
        throw new NotFoundException(`Channel with ID ${query.channelId} not found`);
      }

      if (channel.userId !== userId) {
        const isMember = await this.channelMembersRepository.isUserMemberOfChannel(userId, channel.id);
        if (!isMember) {
          throw new ForbiddenException('You do not have permission to access this channel');
        }
      }
    } else {
      // If no channelId, get all channelIds of user
      const userChannels = await this.channelsRepository.findActiveChannelsByUserId(userId);
      const channelIds = userChannels.map(c => c.id);
      
      // If user has no channels, return empty result
      if (channelIds.length === 0) {
        return {
          data: [],
          total: 0,
          limit: query.limit || 50,
          offset: query.offset || 0,
        };
      }

      // Filter by all user's channelIds
      query.channelId = channelIds as any; // Use array of channelIds
    }

    const filter: NotificationFilter = {
      channelId: Array.isArray(query.channelId) ? query.channelId : query.channelId,
      type: query.type,
      priority: query.priority,
      read: query.read,
    };

    return this.notificationsRepository.findWithFilter(
      filter,
      {
        limit: query.limit,
        offset: query.offset,
      },
      {
        channel: {
          select: {
            id: true,
            name: true,
            webhookToken: true,
            userId: true,
          },
        },
      },
    );
  }

  async findOne(id: string, userId: string) {
    const notification = await this.notificationsRepository.findById(id, {
      channel: {
        select: {
          id: true,
          name: true,
          webhookToken: true,
          userId: true,
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    // Check access via channel: owner or member
    if (notification.channel?.userId !== userId) {
      const isMember = await this.channelMembersRepository.isUserMemberOfChannel(userId, notification.channel.id);
      if (!isMember) {
        throw new ForbiddenException('You do not have permission to access this notification');
      }
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.findOne(id, userId); // Already checks ownership
    const updated = await this.notificationsRepository.markAsRead(id);

    // After reading, emit socket event to update unread count for the corresponding channel
    if (notification.channelId) {
      const unreadCount = await this.notificationsRepository.countUnread(notification.channelId);
      this.notificationsGateway.emitChannelUnreadUpdated(userId, {
        channelId: notification.channelId,
        unreadCount,
      });
    }

    return updated;
  }

  async markAllAsRead(channelId: string | undefined, userId: string) {
    // If channelId provided, validate ownership
    if (channelId) {
      const channel = await this.channelsRepository.findById(channelId);
      if (!channel) {
        throw new NotFoundException(`Channel with ID ${channelId} not found`);
      }

      if (channel.userId !== userId) {
        const isMember = await this.channelMembersRepository.isUserMemberOfChannel(userId, channelId);
        if (!isMember) {
          throw new ForbiddenException('You do not have permission to access this channel');
        }
      }
      const result = await this.notificationsRepository.markAllAsRead(channelId);

      // Send unread event for the specific channel
      const unreadCount = await this.notificationsRepository.countUnread(channelId);
      this.notificationsGateway.emitChannelUnreadUpdated(userId, {
        channelId,
        unreadCount,
      });

      return result;
    }
    
    // If no channelId, mark all as read for all user's channels
    const userChannels = await this.channelsRepository.findActiveChannelsByUserId(userId);
    const channelIds = userChannels.map(c => c.id);

    if (channelIds.length === 0) {
      return { count: 0 };
    }

    const result = await this.notificationsRepository.markAllAsRead(channelIds);

    // Mark all: all user's channels have 0 unread
    for (const ch of channelIds) {
      this.notificationsGateway.emitChannelUnreadUpdated(userId, {
        channelId: ch,
        unreadCount: 0,
      });
    }

    return result;
  }

  async getUnreadCount(channelId: string | undefined, userId: string) {
    // If channelId provided, validate ownership
    if (channelId) {
      const channel = await this.channelsRepository.findById(channelId);
      if (!channel) {
        throw new NotFoundException(`Channel with ID ${channelId} not found`);
      }

      if (channel.userId !== userId) {
        const isMember = await this.channelMembersRepository.isUserMemberOfChannel(userId, channelId);
        if (!isMember) {
          throw new ForbiddenException('You do not have permission to access this channel');
        }
      }
      return this.notificationsRepository.countUnread(channelId);
    }
    
    // If no channelId, count unread for all user's channels
    const userChannels = await this.channelsRepository.findActiveChannelsByUserId(userId);
    const channelIds = userChannels.map(c => c.id);
    
    if (channelIds.length === 0) {
      return 0;
    }
    
    return this.notificationsRepository.countUnread(channelIds);
  }

  /**
   * Get summary of unread notifications for each channel the user can access.
   * Returns map: { [channelId]: unreadCount }
   */
  async getUnreadSummary(userId: string): Promise<Record<string, number>> {
    const userChannels = await this.channelsRepository.findActiveChannelsByUserId(userId);

    const result: Record<string, number> = {};

    for (const channel of userChannels as any[]) {
      const channelId = channel.id as string;
      const unreadCount = channel._count?.notifications ?? 0;
      result[channelId] = unreadCount;
    }

    return result;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Already checks ownership
    return this.notificationsRepository.delete(id);
  }
}

