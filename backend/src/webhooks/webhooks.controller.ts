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

    // Now handleWebhook returns immediately after enqueueing, not after notification creation
    const result = await this.webhooksService.handleWebhook(
      webhookToken,
      body,
      headers,
    );
    return result;
  }
}

