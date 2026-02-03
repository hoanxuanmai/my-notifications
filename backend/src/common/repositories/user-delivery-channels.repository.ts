import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';
import { UserDeliveryChannel } from '../types/database.types';
import { DeliveryChannelType } from '../enums/delivery-channel.enum';

@Injectable()
export class UserDeliveryChannelsRepository extends BaseRepository<UserDeliveryChannel> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.userDeliveryChannel;
  }

  async findActiveByUserId(userId: string): Promise<UserDeliveryChannel[]> {
    return this.model.findMany({
      where: {
        userId,
        isActive: true,
      },
    }) as any;
  }

  async upsertWebPushChannel(
    userId: string,
    subscription: any,
  ): Promise<UserDeliveryChannel> {
    // Each device (endpoint) must be associated with a single user.
    // If the same endpoint is registered by another user, remove old mappings
    // and keep only the new mapping for the current user.
    const endpoint = subscription?.endpoint;

    if (!endpoint) {
      throw new Error('Invalid web push subscription: missing endpoint');
    }

    // Find all WEB_PUSH channels using the same endpoint (regardless of user)
    const existingForEndpoint = (await this.model.findMany({
      where: {
        type: DeliveryChannelType.WEB_PUSH as any,
        config: {
          path: ['endpoint'],
          equals: endpoint,
        } as any,
      },
    })) as any[];

    const sameUser = existingForEndpoint.find((dc) => dc.userId === userId);
    const others = existingForEndpoint.filter((dc) => dc.userId !== userId);

    // Remove endpoint mappings from old users (if any)
    if (others.length > 0) {
      await this.model.deleteMany({
        where: {
          id: {
            in: others.map((dc) => dc.id),
          },
        },
      });
    }

    // If the same device was already mapped to the current user, just update config
    if (sameUser) {
      return this.model.update({
        where: { id: sameUser.id },
        data: {
          config: subscription,
          isActive: true,
        },
      }) as any;
    }

    // Otherwise, create a new mapping for the current user
    return this.model.create({
      data: {
        userId,
        type: DeliveryChannelType.WEB_PUSH as any,
        config: subscription,
      },
    }) as any;
  }

  async findWebPushByUserIdWithFilter(userId: string) {
    const where: any = {
      userId,
      isActive: true,
      type: DeliveryChannelType.WEB_PUSH as any,
    };
    return this.model.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    }) as any;
  }

  /**
   * Increase failure counter for a delivery channel stored in the JSON config
   * and deactivate it once it reaches the given maxFailures threshold.
   * Returns true if the channel was deactivated.
   */
  async registerDeliveryFailure(
    deliveryChannelId: string,
    maxFailures = 5,
  ): Promise<boolean> {
    const record = (await this.model.findUnique({
      where: { id: deliveryChannelId },
    })) as any;

    if (!record) {
      return false;
    }

    const config = (record.config || {}) as any;
    const current = Number(config.failCount || 0);
    const next = current + 1;
    config.failCount = next;

    const shouldDeactivate = next >= maxFailures;

    await this.model.update({
      where: { id: deliveryChannelId },
      data: {
        config,
        ...(shouldDeactivate ? { isActive: false } : {}),
      },
    });

    return shouldDeactivate;
  }

  /**
   * Reset the failure counter for a delivery channel after a successful send.
   */
  async resetDeliveryFailures(deliveryChannelId: string): Promise<void> {
    const record = (await this.model.findUnique({
      where: { id: deliveryChannelId },
    })) as any;

    if (!record) {
      return;
    }

    const config = (record.config || {}) as any;

    if (!config.failCount) {
      return;
    }

    delete config.failCount;

    await this.model.update({
      where: { id: deliveryChannelId },
      data: {
        config,
      },
    });
  }
}
