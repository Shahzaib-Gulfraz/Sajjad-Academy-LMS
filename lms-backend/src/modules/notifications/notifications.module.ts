import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  NotificationRead,
  NotificationReadSchema,
} from './schemas/notification-read.schema';
import {
  Assignment,
  AssignmentSchema,
} from '../assignments/schemas/assignment.schema';
import {
  Announcement,
  AnnouncementSchema,
} from '../announcements/schemas/announcement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationRead.name, schema: NotificationReadSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
