import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGatewayModule } from '../websocket/notifications.module';
import { RepositoriesModule } from '../common/repositories/repositories.module';
import { NotificationsDispatchService } from './notifications-dispatch.service';
import { NotificationsDispatchProcessor } from './notifications-dispatch.processor';
import { NotificationsDeliveryProcessor } from './notifications-delivery.processor';

@Module({
  imports: [
    RepositoriesModule,
    NotificationsGatewayModule,
    BullModule.registerQueue(
      {
        name: 'notifications-dispatch',
      },
      {
        name: 'notifications-delivery',
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

