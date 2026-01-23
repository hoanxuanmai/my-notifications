import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';
import { Notification, NotificationFilter, PaginatedResponse } from '../types/database.types';
import { Prisma } from '@prisma/client';
import { NotificationType, NotificationPriority } from '../enums/notification.enum';

@Injectable()
export class NotificationsRepository extends BaseRepository<Notification> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.notification;
  }

  /**
   * Get notifications with filter and pagination
   */
  async findWithFilter(
    filter: NotificationFilter,
    pagination?: { limit?: number; offset?: number },
    include?: Prisma.NotificationInclude,
  ): Promise<PaginatedResponse<Notification>> {
    const where = this.buildWhereClause(filter);
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        include: include || {
          channel: {
            select: {
              id: true,
              name: true,
              webhookToken: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      this.model.count({ where }),
    ]);

    return {
      data: data as any,
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Count unread notifications
   */
  async countUnread(channelId?: string | string[]): Promise<number> {
    const where: Prisma.NotificationWhereInput = {
      read: false,
      expiresAt: {
        gt: new Date(),
      },
    };

    if (channelId) {
      if (Array.isArray(channelId)) {
        where.channelId = {
          in: channelId,
        };
      } else {
        where.channelId = channelId;
      }
    }

    return this.model.count({ where });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.model.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    }) as any;
  }

  /**
   * Mark all matching notifications as read
   */
  async markAllAsRead(channelId?: string | string[]): Promise<{ count: number }> {
    const where: Prisma.NotificationWhereInput = {
      read: false,
      expiresAt: {
        gt: new Date(),
      },
    };

    if (channelId) {
      if (Array.isArray(channelId)) {
        where.channelId = {
          in: channelId,
        };
      } else {
        where.channelId = channelId;
      }
    }

    return this.model.updateMany({
      where,
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Find expired notifications
   */
  async findExpiredNotifications(): Promise<Notification[]> {
    return this.model.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    }) as any;
  }

  /**
   * Build where clause from filter
   */
  private buildWhereClause(filter: NotificationFilter): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = {};

    // Always filter out expired notifications (unless explicitly included)
    if (!filter.expiresAt) {
      where.expiresAt = {
        gt: new Date(),
      };
    } else {
      where.expiresAt = filter.expiresAt;
    }

    if (filter.channelId) {
      if (Array.isArray(filter.channelId)) {
        where.channelId = {
          in: filter.channelId,
        };
      } else {
        where.channelId = filter.channelId;
      }
    }

    if (filter.type) {
      // Cast to any to bridge between shared NotificationType enum and Prisma enum type
      where.type = filter.type as any;
    }

    if (filter.priority) {
      // Cast to any to bridge between shared NotificationPriority enum and Prisma enum type
      where.priority = filter.priority as any;
    }

    if (filter.read !== undefined) {
      where.read = filter.read;
    }

    return where;
  }
}

