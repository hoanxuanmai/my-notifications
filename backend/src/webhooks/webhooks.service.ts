import { Injectable } from '@nestjs/common';
import { ChannelsService } from '../channels/channels.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    // Check webhook exists (will throw if not found)
    const channel = await this.channelsService.findByWebhookToken(webhookToken);

    // Push webhook data into notifications-dispatch queue for async processing
    await this.notificationsService.enqueueWebhook(webhookToken, body, headers);

    // Return immediately; notification will be created & delivered via workers
    return { success: true, channelId: channel.id };
  }
}

