import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsRepository } from '../common/repositories/notifications.repository';
import { NotificationsDispatchService, DeliveryJobData } from './notifications-dispatch.service';
import { ChannelsRepository } from '../common/repositories/channels.repository';
import { ChannelMembersRepository } from '../common/repositories/channel-members.repository';
import { NotificationsGateway } from '../websocket/notifications.gateway';

@Processor('notifications-delivery')
@Injectable()
export class NotificationsDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsDeliveryProcessor.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsDispatchService: NotificationsDispatchService,
    private readonly channelsRepository: ChannelsRepository,
    private readonly channelMembersRepository: ChannelMembersRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    super();
  }

  // Worker for notifications-delivery queue: execute sending per delivery channel
  async process(job: Job<DeliveryJobData>): Promise<void> {
    const { notificationId } = job.data;

    const notification = await this.notificationsRepository.findById(notificationId);
    
    if (!notification) {
      this.logger.warn(
        `Notification ${notificationId} not found when executing delivery, skipping`,
      );
      return;
    }

    await this.notificationsDispatchService.executeDelivery(job.data, notification as any);
  }
}
