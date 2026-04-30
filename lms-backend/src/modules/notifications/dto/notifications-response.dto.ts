import { ApiProperty } from '@nestjs/swagger';

export class NotificationItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ['assignment', 'announcement'] })
  type!: 'assignment' | 'announcement';

  @ApiProperty()
  date!: string;

  @ApiProperty()
  targetNav!: string;

  @ApiProperty()
  read!: boolean;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationItemDto] })
  data!: NotificationItemDto[];
}

class MarkReadDataDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  notificationId!: string;

  @ApiProperty()
  read!: boolean;
}

export class MarkNotificationReadResponseDto {
  @ApiProperty({ type: MarkReadDataDto })
  data!: MarkReadDataDto;
}

class MarkAllReadDataDto {
  @ApiProperty()
  updated!: number;
}

export class MarkAllNotificationsReadResponseDto {
  @ApiProperty({ type: MarkAllReadDataDto })
  data!: MarkAllReadDataDto;
}
