import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPublic } from '../common/types/user.types';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: UserPublic,
  ) {
    return this.notificationsService.findAll(query, user.id);
  }

  @Get('unread/count')
  getUnreadCount(
    @Query('channelId') channelId: string | undefined,
    @CurrentUser() user: UserPublic,
  ) {
    return this.notificationsService.getUnreadCount(channelId, user.id);
  }

  @Get('unread/summary')
  getUnreadSummary(@CurrentUser() user: UserPublic) {
    return this.notificationsService.getUnreadSummary(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserPublic) {
    return this.notificationsService.findOne(id, user.id);
  }

  @Put(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: UserPublic) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(
    @Query('channelId') channelId: string | undefined,
    @CurrentUser() user: UserPublic,
  ) {
    return this.notificationsService.markAllAsRead(channelId, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: UserPublic) {
    return this.notificationsService.remove(id, user.id);
  }
}

