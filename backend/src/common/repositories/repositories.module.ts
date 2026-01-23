import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChannelsRepository } from './channels.repository';
import { NotificationsRepository } from './notifications.repository';
import { UsersRepository } from './users.repository';
import { ChannelMembersRepository } from './channel-members.repository';
import { UserDeliveryChannelsRepository } from './user-delivery-channels.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    ChannelsRepository,
    NotificationsRepository,
    UsersRepository,
    ChannelMembersRepository,
    UserDeliveryChannelsRepository,
  ],
  exports: [
    ChannelsRepository,
    NotificationsRepository,
    UsersRepository,
    ChannelMembersRepository,
    UserDeliveryChannelsRepository,
  ],
})
export class RepositoriesModule {}

