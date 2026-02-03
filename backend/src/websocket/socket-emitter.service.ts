import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { Emitter } from '@socket.io/redis-emitter';

@Injectable()
export class SocketEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocketEmitter.name);
  private client: RedisClientType | null = null;
  private emitter: Emitter | null = null;

  async onModuleInit(): Promise<void> {
    let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    // Accept values like "localhost:6379" and normalize them
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      redisUrl = `redis://${redisUrl}`;
    }

    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      this.logger.error('Redis SocketEmitter client error', err as any);
    });

    await this.client.connect();
    this.emitter = new Emitter(this.client as any);
    this.logger.log(`SocketEmitter connected to Redis at ${redisUrl}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.emitter = null;
    }
  }

  emitToUser(userId: string, event: string, payload: any): void {
    if (!this.emitter) {
      this.logger.warn('SocketEmitter not initialized; skipping emitToUser');
      return;
    }
    // Emit on the same namespace used by NotificationsGateway ("/notifications")
    this.emitter.of('/notifications').to(`user:${userId}`).emit(event, payload);
  }

  emitToChannel(channelId: string, event: string, payload: any): void {
    if (!this.emitter) {
      this.logger.warn('SocketEmitter not initialized; skipping emitToChannel');
      return;
    }
    // Emit on the same namespace used by NotificationsGateway ("/notifications")
      this.emitter
          .of('/notifications')
          .to(`channel:${channelId}`)
          .emit(event, payload);
  }
}
