import { Controller, Post, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':webhookToken')
  @HttpCode(HttpStatus.CREATED)
  async handleWebhook(
    @Param('webhookToken') webhookToken: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      headers[key] = String(req.headers[key] || '');
    });

    const notification = await this.webhooksService.handleWebhook(
      webhookToken,
      body,
      headers,
    );

    return {
      success: true,
      notificationId: notification.id,
    };
  }
}

