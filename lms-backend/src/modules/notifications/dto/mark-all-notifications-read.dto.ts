import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class MarkAllNotificationsReadDto {
  @ApiProperty({
    description: 'Notification IDs to mark as read',
    type: [String],
    example: ['assignment-67fe6b7fc8', 'announcement-67fe6b8fd9'],
  })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  notificationIds!: string[];
}
