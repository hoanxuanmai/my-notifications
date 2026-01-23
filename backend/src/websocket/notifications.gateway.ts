import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');
  private connectedClients: Map<string, Set<string>> = new Map(); // channelId -> Set of socketIds
  private userClients: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

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

  // Emit new notification to all subscribed clients
  emitNewNotification(channelId: string, notification: any) {
    this.server.to(`channel:${channelId}`).emit('notification:new', notification);
  }

  // Emit new notification to a specific user (global feed)
  emitNewNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Emit updated notification
  emitUpdatedNotification(channelId: string, notification: any) {
    this.server.to(`channel:${channelId}`).emit('notification:updated', notification);
  }

  // Emit deleted notification
  emitDeletedNotification(channelId: string, notificationId: string) {
    this.server.to(`channel:${channelId}`).emit('notification:deleted', {
      id: notificationId,
    });
  }

  // Emit unread count update for a specific channel to a specific user
  emitChannelUnreadUpdated(userId: string, payload: { channelId: string; unreadCount: number }) {
    this.server.to(`user:${userId}`).emit('channel:unread-updated', payload);
  }
}

