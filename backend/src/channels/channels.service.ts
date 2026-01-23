import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { v4 as uuidv4 } from 'uuid';
import { addYears } from 'date-fns';
import { ChannelsRepository } from '../common/repositories/channels.repository';
import { ChannelMembersRepository } from '../common/repositories/channel-members.repository';
import { UsersRepository } from '../common/repositories/users.repository';
import { UserPublic } from '../common/types/user.types';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channelsRepository: ChannelsRepository,
    private readonly channelMembersRepository: ChannelMembersRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(createChannelDto: CreateChannelDto, userId: string) {
    const webhookToken = uuidv4();
    const expiresAt = addYears(new Date(), 1);

    return this.channelsRepository.create({
      ...createChannelDto,
      userId,
      webhookToken,
      expiresAt,
      settings: createChannelDto.settings || {},
    });
  }

  async findAll(userId: string) {
    // Use repository default include to get unread _count
    // and notifications[0] as the last message for each channel.
    return this.channelsRepository.findActiveChannelsByUserId(userId);
  }

  async findOne(id: string, userId: string) {
    const channel = await this.channelsRepository.findById(id, {
      _count: {
        select: {
          notifications: {
            where: {
              read: false,
              expiresAt: {
                gt: new Date(),
              },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    // Check access permission: owner or member
    if (channel.userId !== userId) {
      const isMember = await this.channelMembersRepository.isUserMemberOfChannel(userId, id);
      if (!isMember) {
        throw new ForbiddenException('You do not have permission to access this channel');
      }
    }

    return channel;
  }

  // Internal method to find channel without userId (used for webhook)
  async findOneInternal(id: string) {
    const channel = await this.channelsRepository.findById(id);

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    return channel;
  }

  async findByWebhookToken(webhookToken: string) {
    const channel = await this.channelsRepository.findByWebhookToken(webhookToken, {
      activeOnly: true,
      includeExpired: false,
    });

    if (!channel) {
      throw new NotFoundException(`Channel with webhook token ${webhookToken} not found or expired`);
    }

    return channel;
  }

  async update(id: string, updateChannelDto: UpdateChannelDto, userId: string) {
    const channel = await this.channelsRepository.findById(id);

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    // Only the owner can update the channel
    if (channel.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this channel');
    }
    return this.channelsRepository.update(id, updateChannelDto);
  }

  async remove(id: string, userId: string) {
    const channel = await this.channelsRepository.findById(id);

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${id} not found`);
    }

    // Only the owner can delete the channel
    if (channel.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this channel');
    }
    return this.channelsRepository.delete(id);
  }

  async addMember(channelId: string, memberEmail: string, currentUserId: string): Promise<UserPublic> {
    const channel = await this.channelsRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${channelId} not found`);
    }

    if (channel.userId !== currentUserId) {
      throw new ForbiddenException('You do not have permission to manage members of this channel');
    }

    const memberUser = await this.usersRepository.findByEmail(memberEmail);

    if (!memberUser || !memberUser.isActive) {
      throw new NotFoundException(`User with email ${memberEmail} not found or inactive`);
    }

    if (memberUser.id === currentUserId) {
      throw new ConflictException('Channel owner already has access to this channel');
    }

    const existing = await this.channelMembersRepository.findByUserAndChannel(memberUser.id, channelId);
    if (!existing) {
      await this.channelMembersRepository.addMember(channelId, memberUser.id);
    }

    const { password, ...userPublic } = memberUser as any;
    return userPublic as UserPublic;
  }

  async getMembers(channelId: string, currentUserId: string): Promise<UserPublic[]> {
    const channel = await this.channelsRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${channelId} not found`);
    }

    // Allow owner or member to view the member list
    if (channel.userId !== currentUserId) {
      const isMember = await this.channelMembersRepository.isUserMemberOfChannel(currentUserId, channelId);
      if (!isMember) {
        throw new ForbiddenException('You do not have permission to view members of this channel');
      }
    }

    const members = await this.channelMembersRepository.findMembersByChannelId(channelId);

    return members.map((m) => {
      const { password, ...userPublic } = m.user as any;
      return userPublic as UserPublic;
    });
  }

  async removeMember(channelId: string, memberUserId: string, currentUserId: string): Promise<void> {
    const channel = await this.channelsRepository.findById(channelId);

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${channelId} not found`);
    }

    // If current user is the owner, they can manage any member except themselves
    if (channel.userId === currentUserId) {
      if (memberUserId === channel.userId) {
        throw new ConflictException('Cannot remove the channel owner from the channel');
      }

      await this.channelMembersRepository.removeMember(channelId, memberUserId);
      return;
    }

    // Non-owners are only allowed to remove themselves (leave channel)
    if (memberUserId !== currentUserId) {
      throw new ForbiddenException('You can only leave this channel for your own account');
    }

    await this.channelMembersRepository.removeMember(channelId, currentUserId);
  }
}

