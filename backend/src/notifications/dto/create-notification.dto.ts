import { IsString, IsEnum, IsOptional, IsObject, MaxLength } from 'class-validator';
import { NotificationType, NotificationPriority } from '../../common/enums/notification.enum';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

