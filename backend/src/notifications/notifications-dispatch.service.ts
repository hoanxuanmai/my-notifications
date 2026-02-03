import { Injectable, Logger } from '@nestjs/common';
import { ChannelMembersRepository } from '../common/repositories/channel-members.repository';
import { UserDeliveryChannelsRepository } from '../common/repositories/user-delivery-channels.repository';
import { DeliveryChannelType } from '../common/enums/delivery-channel.enum';
import {
  Notification,
  NotificationWithChannel,
} from '../common/types/database.types';
import * as webpush from 'web-push';
import { SocketEmitter } from '../websocket/socket-emitter.service';

export interface DeliveryJobData {
  notificationId: string;
  channelId: string;
  userId: string;
  type: DeliveryChannelType;
  // Optional link back to the UserDeliveryChannel row, when applicable
  deliveryChannelId?: string;
  config: Record<string, any>;
  notification: Notification;
}

@Injectable()
export class NotificationsDispatchService {
  private readonly logger = new Logger(NotificationsDispatchService.name);

  constructor(
    private readonly channelMembersRepository: ChannelMembersRepository,
    private readonly userDeliveryChannelsRepository: UserDeliveryChannelsRepository,
    private readonly socketEmitter: SocketEmitter,
  ) {}

  /**
   * Build the list of delivery jobs (per user + delivery channel) for a notification.
   */
  async buildDeliveryJobs(
    notification: NotificationWithChannel,
  ): Promise<DeliveryJobData[]> {
    const channelId = notification.channel.id;

    // 1. Determine list of target users: owner + members
    const ownerId = notification.channel.userId;
    const members =
      await this.channelMembersRepository.findMembersByChannelId(channelId);
    const userIds = new Set<string>();
    userIds.add(ownerId);
    for (const m of members) {
      userIds.add(m.userId);
    }
    const jobs: DeliveryJobData[] = [];

    // 2. For each user, create a job for every configured delivery channel
    for (const userId of userIds) {
      const deliveryChannels =
        await this.userDeliveryChannelsRepository.findActiveByUserId(userId);
      // Always add WebSocket delivery as fallback/default
      jobs.push({
        notificationId: notification.id,
        channelId,
        userId,
        type: DeliveryChannelType.WEB_SOCKET,
        config: {},
        notification,
      });
      for (const dc of deliveryChannels) {
        jobs.push({
          notificationId: notification.id,
          channelId,
          userId,
          type: dc.type as DeliveryChannelType,
          deliveryChannelId: dc.id,
          config: (dc as any).config || {},
          notification,
        });
      }
    }

    return jobs;
  }

  /**
   * Execute a specific delivery job (by delivery channel type).
   */
  async executeDelivery(
    job: DeliveryJobData,
    notification: Notification,
  ): Promise<void> {
    this.logger.log(
      `Executing delivery for notification ${notification.id} to user ${job.userId} via ${job.type}`,
    );
    switch (job.type) {
      case DeliveryChannelType.WEB_SOCKET:
        await this.dispatchViaWebSocket(
          job.channelId,
          job.userId,
          notification,
        );
        break;
      case DeliveryChannelType.WEB_PUSH:
        await this.dispatchViaWebPush(job, notification);
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
        channelId,
      );

    // Emit via Redis so that the actual Socket.IO server process
    // can broadcast to connected clients.
    this.socketEmitter.emitToUser(userId, 'notification:new', notification);
  }

  // Placeholder for web push: currently only logs, actual sending (web-push) will be implemented later
  private async dispatchViaWebPush(
    job: DeliveryJobData,
    notification: Notification,
  ): Promise<void> {
    const { userId, config: subscription, deliveryChannelId } = job;
    if (!subscription) {
      this.logger.warn(
        `WEB_PUSH skipped for user ${userId}: missing subscription config`,
      );
      return;
    }

    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const contactEmail =
      process.env.WEB_PUSH_CONTACT_EMAIL || 'mailto:admin@example.com';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'WEB_PUSH keys not configured; set WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY to enable Web Push',
      );
      return;
    }

    try {
      webpush.setVapidDetails(contactEmail, publicKey, privateKey);
      const channelName = notification.channel?.name || null;
      const slackInfo = this.isSlackNotification(notification);
      const payload = {
        title: slackInfo
          ? `${slackInfo.title} (${channelName})`
          : channelName
            ? `${notification.title} (${channelName})`
            : notification.title,
        body: slackInfo ? slackInfo.message : notification.message,
        data: {
          notificationId: notification.id,
          channelId: notification.channelId,
        },
      };

      await webpush.sendNotification(subscription, JSON.stringify(payload));

      this.logger.debug(
        `WEB_PUSH sent to user ${userId} for channel ${notification.channelId}: ${notification.title}`,
      );

      if (deliveryChannelId) {
        await this.userDeliveryChannelsRepository.resetDeliveryFailures(
          deliveryChannelId,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send WEB_PUSH to user ${userId} for channel ${notification.channelId}: ${notification.title}`,
        error as any,
      );

      if (deliveryChannelId) {
        const disabled =
          await this.userDeliveryChannelsRepository.registerDeliveryFailure(
            deliveryChannelId,
            5,
          );
        if (disabled) {
          this.logger.warn(
            `WEB_PUSH delivery channel ${deliveryChannelId} deactivated after 5 consecutive failures`,
          );
        }
      }
    }
  }

  isSlackNotification(
    notification: Notification,
  ): null | { title: string; message: string } {
    const data = notification.metadata;
    if (data && data.attachments) {
      return {
        title: data.username ?? 'Slack Notification',
        message: String(data.attachments[0]?.text || notification.message),
      };
    }
    return null;
  }
}
