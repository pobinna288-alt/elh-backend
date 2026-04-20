import { IsEnum, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relatedUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relatedAdId?: string;
}
