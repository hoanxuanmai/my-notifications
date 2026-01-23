import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';

/**
 * WorkerModule bootstraps only the parts of the application
 * required to run BullMQ workers (no HTTP server).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    QueueModule,
    NotificationsModule,
  ],
})
export class WorkerModule {}
