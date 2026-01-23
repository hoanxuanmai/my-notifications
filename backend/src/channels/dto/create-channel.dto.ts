import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

