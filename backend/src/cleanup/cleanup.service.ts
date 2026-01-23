import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChannelsRepository } from '../common/repositories/channels.repository';
import { NotificationsRepository } from '../common/repositories/notifications.repository';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private channelsRepository: ChannelsRepository,
    private notificationsRepository: NotificationsRepository,
  ) {}

  @Cron('0 2 * * *') // Run every day at 2:00 AM
  async handleCleanup() {
    this.logger.log('Starting cleanup of expired data...');

    try {
      // Delete expired notifications
      const expiredNotifications = await this.notificationsRepository.findExpiredNotifications();
      let deletedNotificationsCount = 0;

      if (expiredNotifications.length > 0) {
        const result = await this.notificationsRepository.deleteMany({
          expiresAt: {
            lt: new Date(),
          },
        });
        deletedNotificationsCount = result.count;
      }

      // Delete expired channels (notifications already deleted by CASCADE)
      const expiredChannels = await this.channelsRepository.findExpiredChannels();
      let deletedChannelsCount = 0;

      if (expiredChannels.length > 0) {
        const result = await this.channelsRepository.deleteMany({
          expiresAt: {
            lt: new Date(),
          },
        });
        deletedChannelsCount = result.count;
      }

      this.logger.log(
        `Cleanup completed: ${deletedNotificationsCount} notifications and ${deletedChannelsCount} channels deleted`,
      );
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }

  // Manual cleanup (can be called from API if needed)
  async manualCleanup() {
    this.logger.log('Manual cleanup triggered');
    await this.handleCleanup();
  }
}

