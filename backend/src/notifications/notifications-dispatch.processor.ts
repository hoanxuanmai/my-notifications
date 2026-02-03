import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { addMonths } from 'date-fns';
import { NotificationsRepository } from '../common/repositories/notifications.repository';
import { ChannelsRepository } from '../common/repositories/channels.repository';
import {
  NotificationType,
  NotificationPriority,
} from '../common/enums/notification.enum';
import {
  NotificationsDispatchService,
  DeliveryJobData,
} from './notifications-dispatch.service';
import {
  NOTIFICATIONS_DISPATCH_QUEUE,
  NOTIFICATIONS_DELIVERY_QUEUE,
  NOTIFICATIONS_DISPATCH_JOB_WEBHOOK,
  NOTIFICATIONS_DELIVERY_JOB_DELIVER,
} from './notifications.queue-constants';

interface DispatchJobDataBase {
  // marker interface
}

interface NotificationDispatchJobData extends DispatchJobDataBase {
  notificationId: string;
}

interface WebhookDispatchJobData extends DispatchJobDataBase {
  webhookToken: string;
  body: any;
  headers: Record<string, string>;
}

type DispatchJobData = NotificationDispatchJobData | WebhookDispatchJobData;

@Processor(NOTIFICATIONS_DISPATCH_QUEUE)
@Injectable()
export class NotificationsDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsDispatchProcessor.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsDispatchService: NotificationsDispatchService,
    private readonly channelsRepository: ChannelsRepository,
    @InjectQueue(NOTIFICATIONS_DELIVERY_QUEUE)
    private readonly notificationsDeliveryQueue: Queue<DeliveryJobData>,
  ) {
    super();
  }

  // Worker for notifications-dispatch queue: build delivery jobs per user and delivery channel
  async process(job: Job<DispatchJobData>): Promise<void> {
    await this.handleNotificationDispatchJob(
      job as Job<WebhookDispatchJobData>,
    );
  }

  private async handleNotificationDispatchJob(
    job: Job<WebhookDispatchJobData>,
  ): Promise<void> {
    this.logger.log(
      `Processing webhook dispatch job for token ${job.data.webhookToken} ${job.attemptsMade} attempts`
    );
    const { webhookToken, body, headers } = job.data;

    // Resolve channel from webhook token
    const channel = await this.channelsRepository.findByWebhookToken(
      webhookToken,
      {
        activeOnly: true,
        includeExpired: false,
      },
    );

    if (!channel) {
      this.logger.warn(
        `Channel with webhook token ${webhookToken} not found or expired, skipping webhook job`,
      );
      return;
    }

    // Parse webhook body/headers into CreateNotificationDto-like payload
    const notificationPayload = this.parseWebhookBody(body, headers);

    const expiresAt = addMonths(new Date(), 1);

    const notification = await this.notificationsRepository.create(
      {
        ...notificationPayload,
        channelId: channel.id,
        type: notificationPayload.type || NotificationType.INFO,
        priority: notificationPayload.priority || NotificationPriority.MEDIUM,
        metadata: notificationPayload.metadata || {},
        expiresAt,
      } as any,
      {
        channel: {
          select: {
            id: true,
            userId: true,
            name: true,
          },
        },
      },
    );

    const deliveryJobs =
      await this.notificationsDispatchService.buildDeliveryJobs(
        notification as any,
      );

    await this.enqueueDeliveryJobs(deliveryJobs);
  }

  private async enqueueDeliveryJobs(jobs: DeliveryJobData[]): Promise<void> {
    for (const payload of jobs) {
      await this.notificationsDeliveryQueue.add(
        NOTIFICATIONS_DELIVERY_JOB_DELIVER,
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

  private parseWebhookBody(
    body: any,
    headers: Record<string, string>,
  ): {
    title: string;
    message: string;
    type?: NotificationType;
    priority?: NotificationPriority;
    metadata?: any;
  } {
    const contentType = headers['content-type'] || 'application/json';

    // JSON format
    if (contentType.includes('application/json')) {
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          throw new BadRequestException('Invalid JSON format');
        }
      }

      return {
        title: body.title || 'Notification',
        message: body.message || JSON.stringify(body),
        type: this.parseType(body.type),
        priority: this.parsePriority(body.priority),
        metadata: body.metadata || body,
      };
    }

    // Plain text format
    if (contentType.includes('text/plain')) {
      return {
        title: 'Webhook Notification',
        message: typeof body === 'string' ? body : String(body),
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        metadata: {},
      };
    }

    // Form data
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      return {
        title: body.title || 'Form Notification',
        message: body.message || JSON.stringify(body),
        type: this.parseType(body.type),
        priority: this.parsePriority(body.priority),
        metadata: body,
      };
    }

    // Default
    return {
      title: 'Webhook Notification',
      message: typeof body === 'string' ? body : JSON.stringify(body),
      type: NotificationType.INFO,
      priority: NotificationPriority.MEDIUM,
      metadata: { rawBody: body },
    };
  }

  /**
   * Detect and format Slack webhook payloads into a concise title/message.
   */
  private tryFormatSlackPayload(
    payload: any,
    headers: Record<string, string>,
  ): string | null {

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const lowerHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers || {})) {
      lowerHeaders[key.toLowerCase()] = value as string;
    }

    const isSlackRequest =
      !!lowerHeaders['x-slack-signature'] ||
      !!lowerHeaders['x-slack-request-timestamp'] ||
      !!payload.team_id ||
      !!payload.enterprise_id ||
      !!payload.event ||
      (!!payload.username && !!payload.attachments);

    if (!isSlackRequest) {
      return null;
    }

    // Event-style payload: { type: 'event_callback', event: { ... } }
    const event = payload.event || {};
    const channel =
      event.channel || event.channel_name || payload.channel_name || null;
    const user =
      event.user || event.username || payload.user || payload.username || null;

    const titleParts: string[] = ['[Slack]'];

    if (channel) {
      titleParts.push(`in #${channel}`);
    }
    if (user) {
      titleParts.push(`by @${user}`);
    }

    return titleParts.join(' ');
  }

  private parseType(type: string | undefined): NotificationType {
    if (!type) return NotificationType.INFO;

    const normalizedType = String(type).toLowerCase();

    const typeMap: Record<string, NotificationType> = {
      info: NotificationType.INFO,
      success: NotificationType.SUCCESS,
      warning: NotificationType.WARNING,
      error: NotificationType.ERROR,
      debug: NotificationType.DEBUG,
    };

    return typeMap[normalizedType] || NotificationType.INFO;
  }

  private parsePriority(priority: string | undefined): NotificationPriority {
    if (!priority) return NotificationPriority.MEDIUM;

    const normalizedPriority = String(priority).toLowerCase();

    const priorityMap: Record<string, NotificationPriority> = {
      low: NotificationPriority.LOW,
      medium: NotificationPriority.MEDIUM,
      high: NotificationPriority.HIGH,
      urgent: NotificationPriority.URGENT,
    };

    return priorityMap[normalizedPriority] || NotificationPriority.MEDIUM;
  }
  // on failure, retries will be handled by BullMQ based on job options
  fail(job: Job<DispatchJobData>, err: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`,
      err.stack,
    );
  }
}
