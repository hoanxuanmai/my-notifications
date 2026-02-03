import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');
  private connectedClients: Map<string, Set<string>> = new Map(); // channelId -> Set of socketIds
  private userClients: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds


  async afterInit(server: Server): Promise<void> {
    let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      redisUrl = `redis://${redisUrl}`;
    }

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    const redisAdapterFactory = createAdapter(pubClient as any, subClient as any);

    const anyServer = server as any;

    // Prefer the standard Socket.IO server API if available: io.adapter(createAdapter(...))
    if (typeof anyServer.adapter === 'function') {
      anyServer.adapter(redisAdapterFactory);
    } else {
      // Fallback: create an adapter instance for the notifications namespace
      const nsp = anyServer.of ? anyServer.of('/notifications') : anyServer;
      const RedisAdapterClass = redisAdapterFactory as any;
      nsp.adapter = new RedisAdapterClass(nsp);
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from all channels
    this.connectedClients.forEach((clients, channelId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.connectedClients.delete(channelId);
      }
    });

    // Remove client from all user rooms
    this.userClients.forEach((clients, userId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.userClients.delete(userId);
      }
    });
  }

  @SubscribeMessage('subscribe:channel')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;

    if (!this.connectedClients.has(channelId)) {
      this.connectedClients.set(channelId, new Set());
    }

    this.connectedClients.get(channelId)?.add(client.id);
    client.join(`channel:${channelId}`);

    this.logger.log(`Client ${client.id} subscribed to channel ${channelId}`);

    return {
      event: 'subscribed',
      channelId,
    };
  }

  @SubscribeMessage('unsubscribe:channel')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;

    this.connectedClients.get(channelId)?.delete(client.id);
    client.leave(`channel:${channelId}`);

    this.logger.log(`Client ${client.id} unsubscribed from channel ${channelId}`);

    return {
      event: 'unsubscribed',
      channelId,
    };
  }

  @SubscribeMessage('subscribe:user')
  handleSubscribeUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }

    this.userClients.get(userId)?.add(client.id);
    client.join(`user:${userId}`);

    this.logger.log(`Client ${client.id} subscribed to user room ${userId}`);

    return {
      event: 'user-subscribed',
      userId,
    };
  }

  // Emit unread count update for a specific channel to a specific user
  emitChannelUnreadUpdated(userId: string, payload: { channelId: string; unreadCount: number }) {
    this.server.to(`user:${userId}`).emit('channel:unread-updated', payload);
  }
}

