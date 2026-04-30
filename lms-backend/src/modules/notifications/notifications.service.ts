import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NotificationRead,
  NotificationReadDocument,
} from './schemas/notification-read.schema';
import {
  Assignment,
  AssignmentDocument,
} from '../assignments/schemas/assignment.schema';
import {
  Announcement,
  AnnouncementDocument,
} from '../announcements/schemas/announcement.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationRead.name)
    private readonly notificationReadModel: Model<NotificationReadDocument>,
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
  ) {}

  async listNotifications(query: {
    userId: string;
    classGrade?: string;
    studentId?: string;
  }) {
    const [assignments, announcements, reads] = await Promise.all([
      this.assignmentModel
        .find(
          query.studentId
            ? {
                $or: [
                  {
                    assignedStudentIds: { $size: 0 },
                    classGrade: query.classGrade,
                  },
                  { assignedStudentIds: query.studentId },
                ],
              }
            : query.classGrade
              ? { classGrade: query.classGrade }
              : {},
        )
        .sort({ dueDate: 1 })
        .limit(100)
        .lean()
        .exec(),
      this.announcementModel
        .find(
          query.studentId || query.classGrade
            ? {
                $or: [
                  { targetType: 'all' },
                  ...(query.classGrade
                    ? [
                        {
                          targetType: 'classes',
                          targetClasses: query.classGrade,
                        },
                      ]
                    : []),
                  ...(query.studentId
                    ? [
                        {
                          targetType: 'students',
                          targetStudentIds: query.studentId,
                        },
                      ]
                    : []),
                ],
              }
            : {},
        )
        .sort({ publishedAt: -1 })
        .limit(100)
        .lean()
        .exec(),
      this.notificationReadModel.find({ userId: query.userId }).lean().exec(),
    ]);

    const readSet = new Set(reads.map((read) => read.notificationId));

    const assignmentNotifications = assignments.map((assignment) => {
      const notificationId = `assignment-${assignment._id.toString()}`;
      return {
        id: notificationId,
        title: `Assignment Due: ${assignment.title}`,
        description: `${assignment.subject} - Due ${assignment.dueDate}`,
        type: 'assignment',
        date: assignment.dueDate,
        targetNav: 'assignments',
        read: readSet.has(notificationId),
      };
    });

    const announcementNotifications = announcements.map((announcement) => {
      const notificationId = `announcement-${announcement._id.toString()}`;
      return {
        id: notificationId,
        title: announcement.title,
        description:
          announcement.content.length > 80
            ? `${announcement.content.slice(0, 80)}...`
            : announcement.content,
        type: 'announcement',
        date: announcement.publishedAt,
        targetNav: 'announcements',
        read: readSet.has(notificationId),
      };
    });

    return [...assignmentNotifications, ...announcementNotifications].sort(
      (a, b) => b.date.localeCompare(a.date),
    );
  }

  async markRead(userId: string, notificationId: string) {
    await this.notificationReadModel.updateOne(
      { userId, notificationId },
      {
        $set: {
          userId,
          notificationId,
          readAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );

    return {
      userId,
      notificationId,
      read: true,
    };
  }

  async markAllRead(userId: string, notificationIds: string[]) {
    if (notificationIds.length === 0) {
      return { updated: 0 };
    }

    const now = new Date().toISOString();
    const operations = notificationIds.map((notificationId) => ({
      updateOne: {
        filter: { userId, notificationId },
        update: {
          $set: { userId, notificationId, readAt: now },
        },
        upsert: true,
      },
    }));

    const result = await this.notificationReadModel.bulkWrite(operations, {
      ordered: false,
    });

    return {
      updated: result.modifiedCount + result.upsertedCount,
    };
  }
}
