import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsRepository } from '../common/repositories/notifications.repository';
import { NotificationsDispatchService, DeliveryJobData } from './notifications-dispatch.service';
import { NOTIFICATIONS_DELIVERY_QUEUE, NOTIFICATIONS_DELIVERY_JOB_DELIVER } from './notifications.queue-constants';

@Processor(NOTIFICATIONS_DELIVERY_QUEUE)
@Injectable()
export class NotificationsDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsDeliveryProcessor.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsDispatchService: NotificationsDispatchService,
  ) {
    super();
  }

  // Worker for notifications-delivery queue: execute sending per delivery channel
  async process(job: Job<DeliveryJobData>): Promise<void> {
    if (job.name !== NOTIFICATIONS_DELIVERY_JOB_DELIVER) {
      return;
    }
    const data = job.data as DeliveryJobData;
    const { notificationId, notification } = data;

    if (!notification) {
      this.logger.warn(
        `Notification ${notificationId} not found when executing delivery, skipping`,
      );
      return;
    }

    await this.notificationsDispatchService.executeDelivery(data, notification);
  }
}
