import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { NotificationsRepository } from '../common/repositories/notifications.repository';
import { NotificationsDispatchService, DeliveryJobData } from './notifications-dispatch.service';

interface DispatchJobData {
  notificationId: string;
}

@Processor('notifications-dispatch')
@Injectable()
export class NotificationsDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsDispatchProcessor.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsDispatchService: NotificationsDispatchService,
    @InjectQueue('notifications-delivery')
    private readonly notificationsDeliveryQueue: Queue<DeliveryJobData>,
  ) {
    super();
  }

  // Worker for notifications-dispatch queue: build delivery jobs per user and delivery channel
  async process(job: Job<DispatchJobData>): Promise<void> {
    this.logger.log(`Processing dispatch job for notification ${job.data.notificationId}`);
    const { notificationId } = job.data;

    const notification = await this.notificationsRepository.findById(notificationId, {
      channel: {
        select: {
          id: true,
          userId: true,
        },
      },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found, skipping dispatch`);
      return;
    }

    const deliveryJobs = await this.notificationsDispatchService.buildDeliveryJobs(notification as any);

    for (const payload of deliveryJobs) {
      await this.notificationsDeliveryQueue.add(
        'deliver',
        payload,
        {
          removeOnComplete: true,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 500,
          },
        },
      );
    }
  }
}
