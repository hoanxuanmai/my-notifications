import { Injectable, Logger } from '@nestjs/common';
import { NotificationsGateway } from '../websocket/notifications.gateway';
import { ChannelMembersRepository } from '../common/repositories/channel-members.repository';
import { UserDeliveryChannelsRepository } from '../common/repositories/user-delivery-channels.repository';
import { DeliveryChannelType } from '../common/enums/delivery-channel.enum';
import { Notification } from '../common/types/database.types';
import * as webpush from 'web-push';

export type NotificationWithChannel = Notification & {
  channel: {
    id: string;
    userId: string;
  };
};

export interface DeliveryJobData {
  notificationId: string;
  channelId: string;
  userId: string;
  type: DeliveryChannelType;
  config: Record<string, any>;
}

@Injectable()
export class NotificationsDispatchService {
  private readonly logger = new Logger(NotificationsDispatchService.name);

  constructor(
    private readonly channelMembersRepository: ChannelMembersRepository,
    private readonly userDeliveryChannelsRepository: UserDeliveryChannelsRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
    * Build the list of delivery jobs (per user + delivery channel) for a notification.
   */
  async buildDeliveryJobs(notification: NotificationWithChannel): Promise<DeliveryJobData[]> {
    const channelId = notification.channel.id;

    // 1. Determine list of target users: owner + members
    const ownerId = notification.channel.userId;
    const members = await this.channelMembersRepository.findMembersByChannelId(channelId);
    const userIds = new Set<string>();
    userIds.add(ownerId);
    for (const m of members) {
      userIds.add(m.userId);
    }
    const jobs: DeliveryJobData[] = [];

    // 2. For each user, create a job for every configured delivery channel
    for (const userId of userIds) {
      const deliveryChannels = await this.userDeliveryChannelsRepository.findActiveByUserId(userId);

      for (const dc of deliveryChannels) {
        jobs.push({
          notificationId: notification.id,
          channelId,
          userId,
          type: dc.type as DeliveryChannelType,
          config: (dc as any).config || {},
        });
      }
    }

    return jobs;
  }

  /**
   * Dispatch WebSocket notifications for all target users of a given notification.
   * This is intended to be called only from the backend API process,
   * so workers can process other delivery channels independently.
   */
  async dispatchWebSocketForNotification(notification: NotificationWithChannel): Promise<void> {
    const channelId = notification.channel.id;

    // Determine list of target users: owner + members
    const ownerId = notification.channel.userId;
    const members = await this.channelMembersRepository.findMembersByChannelId(channelId);
    const userIds = new Set<string>();
    userIds.add(ownerId);
    for (const m of members) {
      userIds.add(m.userId);
    }

    for (const userId of userIds) {
      await this.dispatchViaWebSocket(channelId, userId, notification);
    }
  }

  /**
   * Execute a specific delivery job (by delivery channel type).
   */
  async executeDelivery(job: DeliveryJobData, notification: Notification): Promise<void> {
    this.logger.log(
      `Executing delivery for notification ${notification.id} to user ${job.userId} via ${job.type}`,
    );
    switch (job.type) {
      case DeliveryChannelType.WEB_SOCKET:
        await this.dispatchViaWebSocket(job.channelId, job.userId, notification);
        break;
      case DeliveryChannelType.WEB_PUSH:
        await this.dispatchViaWebPush(job.userId, notification, job.config);
        break;
      default:
        this.logger.warn(`Unsupported delivery channel type: ${job.type}`);
    }
  }

  private async dispatchViaWebSocket(
    channelId: string,
    userId: string,
    notification: Notification,
  ): Promise<void> {
    this.logger.debug(
      `WEB_SOCKET delivery for notification ${notification.id} on channel ${channelId} for user ${userId}`,
    );
    // Only emit to the user room to serve the aggregated feed for that user.
    notification.unreadCount =
      await this.channelMembersRepository.countUnreadForUserInChannel(
        userId,
        channelId
      );
    this.notificationsGateway.emitNewNotificationToUser(userId, notification);
  }

  // Placeholder for web push: currently only logs, actual sending (web-push) will be implemented later
  private async dispatchViaWebPush(
    userId: string,
    notification: Notification,
    subscription: any,
  ): Promise<void> {
    if (!subscription) {
      this.logger.warn(`WEB_PUSH skipped for user ${userId}: missing subscription config`);
      return;
    }

    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL || 'mailto:admin@example.com';

    if (!publicKey || !privateKey) {
      this.logger.warn('WEB_PUSH keys not configured; set WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY to enable Web Push');
      return;
    }

    try {
      webpush.setVapidDetails(contactEmail, publicKey, privateKey);

      const payload = {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          channelId: notification.channelId,
        },
      };

      await webpush.sendNotification(subscription, JSON.stringify(payload));

      this.logger.debug(
        `WEB_PUSH sent to user ${userId} for channel ${notification.channelId}: ${notification.title}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send WEB_PUSH to user ${userId} for channel ${notification.channelId}: ${notification.title}`,
        error as any,
      );
    }
  }
}
