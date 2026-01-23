import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';
import { ChannelMember } from '../types/database.types';

@Injectable()
export class ChannelMembersRepository extends BaseRepository<ChannelMember> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return this.prisma.channelMember;
  }

  async isUserMemberOfChannel(userId: string, channelId: string): Promise<boolean> {
    const count = await this.model.count({
      where: { userId, channelId },
    });
    return count > 0;
  }

  async findByUserAndChannel(userId: string, channelId: string): Promise<ChannelMember | null> {
    return this.model.findFirst({
      where: { userId, channelId },
    });
  }

  async findMembersByChannelId(channelId: string) {
    return this.model.findMany({
      where: { channelId },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async addMember(channelId: string, userId: string): Promise<ChannelMember> {
    return this.model.create({
      data: {
        channelId,
        userId,
      },
    });
  }

  async removeMember(channelId: string, userId: string): Promise<number> {
    const result = await this.model.deleteMany({
      where: { channelId, userId },
    });
    return result.count;
  }

  async countUnreadForUserInChannel(userId: string, channelId: string): Promise<number> {
    // Note: use the real table/column names in DB (according to @@map in schema.prisma)
    // notifications, channels, channel_members, channel_id, user_id, expires_at
    const result = await this.prisma.$queryRaw<{ count: any }[]>`
      SELECT COUNT(n.id) AS count
      FROM "notifications" n
      JOIN "channels" c ON n."channel_id" = c.id
      LEFT JOIN "channel_members" cm ON cm."channel_id" = c.id AND cm."user_id" = ${userId}
      WHERE c.id = ${channelId}
        AND n.read = false
        AND n."expires_at" > NOW()
        AND (c."user_id" = ${userId} OR cm.id IS NOT NULL)
    `;

    const rawCount = result[0]?.count ?? 0;
    // Postgres COUNT() usually returns bigint; convert to number to avoid
    // "Do not know how to serialize a BigInt" when emitting through WebSocket/JSON.
    if (typeof rawCount === 'bigint') {
      return Number(rawCount);
    }
    return Number(rawCount) || 0;
  }
}
