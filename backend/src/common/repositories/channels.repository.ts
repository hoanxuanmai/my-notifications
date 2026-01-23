import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';
import { Channel, ChannelWithCount } from '../types/database.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChannelsRepository extends BaseRepository<Channel> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.channel;
  }

  /**
   * Find channel by webhook token
   */
  async findByWebhookToken(
    webhookToken: string,
    options?: { activeOnly?: boolean; includeExpired?: boolean },
  ): Promise<Channel | null> {
    const where: Prisma.ChannelWhereInput = {
      webhookToken,
    };

    if (options?.activeOnly !== false) {
      where.isActive = true;
    }

    if (!options?.includeExpired) {
      where.expiresAt = {
        gt: new Date(),
      };
    }

    // Use findFirst because we need to filter by isActive and expiresAt (not unique fields)
    return this.model.findFirst({
      where,
    });
  }

  /**
   * Get all active, non-expired channels of a user
   */
  async findActiveChannelsByUserId(userId: string, include?: Prisma.ChannelInclude): Promise<ChannelWithCount[]> {
    const defaultInclude: Prisma.ChannelInclude = {
      _count: {
        select: {
          notifications: {
            where: {
              read: false,
              expiresAt: {
                gt: new Date(),
              },
            },
          },
        },
      },
      notifications: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    };

    return this.model.findMany({
      where: {
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
        OR: [
          { userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: include || defaultInclude,
    }) as any;
  }

  /**
   * Get all active, non-expired channels (deprecated - use findActiveChannelsByUserId)
   */
  async findActiveChannels(include?: Prisma.ChannelInclude): Promise<ChannelWithCount[]> {
    return this.findActiveChannelsByUserId('', include);
  }

  /**
   * Find expired channels
   */
  async findExpiredChannels(): Promise<Channel[]> {
    return this.model.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}

