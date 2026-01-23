import { Injectable, BadRequestException } from '@nestjs/common';
import { ChannelsService } from '../channels/channels.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateNotificationDto } from '../notifications/dto/create-notification.dto';
import { NotificationType, NotificationPriority } from '../common/enums/notification.enum';

@Injectable()
export class WebhooksService {
  constructor(
    private channelsService: ChannelsService,
    private notificationsService: NotificationsService,
  ) {}

  async handleWebhook(
    webhookToken: string,
    body: any,
    headers: Record<string, string>,
  ) {
    // Find channel by webhook token
    const channel = await this.channelsService.findByWebhookToken(webhookToken);

    // Parse webhook body
    const notificationDto = this.parseWebhookBody(body, headers);

    // Create notification
    const notification = await this.notificationsService.create(
      channel.id,
      notificationDto,
    );

    return notification;
  }

  private parseWebhookBody(body: any, headers: Record<string, string>): CreateNotificationDto {
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
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
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

  private parseType(type: string): NotificationType {
    if (!type) return NotificationType.INFO;

    const normalizedType = type.toLowerCase();
    const validTypes = Object.values(NotificationType);

    // Map lowercase string to enum value
    const typeMap: Record<string, NotificationType> = {
      info: NotificationType.INFO,
      success: NotificationType.SUCCESS,
      warning: NotificationType.WARNING,
      error: NotificationType.ERROR,
      debug: NotificationType.DEBUG,
    };

    return typeMap[normalizedType] || NotificationType.INFO;
  }

  private parsePriority(priority: string): NotificationPriority {
    if (!priority) return NotificationPriority.MEDIUM;

    const normalizedPriority = priority.toLowerCase();
    
    // Map lowercase string to enum value
    const priorityMap: Record<string, NotificationPriority> = {
      low: NotificationPriority.LOW,
      medium: NotificationPriority.MEDIUM,
      high: NotificationPriority.HIGH,
      urgent: NotificationPriority.URGENT,
    };

    return priorityMap[normalizedPriority] || NotificationPriority.MEDIUM;
  }
}

