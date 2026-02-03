import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { SocketEmitter } from './socket-emitter.service';

@Module({
  providers: [NotificationsGateway, SocketEmitter],
  exports: [NotificationsGateway, SocketEmitter],
})
export class NotificationsGatewayModule {}

