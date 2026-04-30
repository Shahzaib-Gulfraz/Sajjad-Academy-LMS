import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MarkNotificationReadDto {
  @ApiProperty({
    description: 'Notification ID to mark as read',
    example: 'assignment-67fe6b7fc8',
  })
  @IsString()
  notificationId!: string;
}
