import { IsOptional, IsEnum, IsBoolean, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationPriority } from '../../common/enums/notification.enum';

export class NotificationQueryDto {
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  read?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

