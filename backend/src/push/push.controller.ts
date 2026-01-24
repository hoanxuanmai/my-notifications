import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPublic } from '../common/types/user.types';
import { UserDeliveryChannelsRepository } from '../common/repositories/user-delivery-channels.repository';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly userDeliveryChannelsRepository: UserDeliveryChannelsRepository) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @CurrentUser() user: UserPublic,
    @Body() subscription: any,
    @Req() req: any,
  ) {
    // Ghi nhận userAgent nếu có
    let userAgent = req.headers['user-agent'] || undefined;

    if (userAgent) {
      subscription.userAgent = userAgent;
    }
    // Save or update web push subscription for the current user
    const result = await this.userDeliveryChannelsRepository.upsertWebPushChannel(user.id, subscription);
    return { id: result.id };
  }
}
