import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChannelsModule } from './channels/channels.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { NotificationsGatewayModule } from './websocket/notifications.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { PushModule } from './push/push.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChannelsModule,
    NotificationsModule,
    WebhooksModule,
    NotificationsGatewayModule,
    CleanupModule,
    PushModule,
    QueueModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
