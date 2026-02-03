import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGatewayModule } from '../websocket/notifications.module';
import { RepositoriesModule } from '../common/repositories/repositories.module';
import { NotificationsDispatchService } from './notifications-dispatch.service';
import { NotificationsDispatchProcessor } from './notifications-dispatch.processor';
import { NotificationsDeliveryProcessor } from './notifications-delivery.processor';
import {
  NOTIFICATIONS_DISPATCH_QUEUE,
  NOTIFICATIONS_DELIVERY_QUEUE,
} from './notifications.queue-constants';

@Module({
  imports: [
    RepositoriesModule,
    NotificationsGatewayModule,
    BullModule.registerQueue(
      {
        name: NOTIFICATIONS_DISPATCH_QUEUE,
      },
      {
        name: NOTIFICATIONS_DELIVERY_QUEUE,
      },
    ),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsDispatchService,
    NotificationsDispatchProcessor,
    NotificationsDeliveryProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

// ChannelsRepository is already exported from RepositoriesModule

