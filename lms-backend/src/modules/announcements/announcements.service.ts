import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
} from './schemas/announcement.schema';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UserRole } from '../../common/auth/roles.enum';
import { StudentsService } from '../students/students.service';

type AnnouncementActor = {
  sub: string;
  role: UserRole;
  email?: string;
};

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
    private readonly studentsService: StudentsService,
  ) {}

  async createAnnouncement(
    dto: CreateAnnouncementDto,
    actor: AnnouncementActor,
  ) {
    const announcement = await this.announcementModel.create({
      title: dto.title,
      content: dto.content,
      priority: dto.priority ?? 'medium',
      targetType: dto.targetType ?? 'all',
      targetClasses: dto.targetClasses ?? [],
      targetStudentIds: dto.targetStudentIds ?? [],
      authorId: actor.sub,
      authorRole: actor.role,
      authorName: actor.email ?? actor.sub,
      publishedAt: new Date().toISOString(),
    });

    return this.toResponse(announcement);
  }

  async listAnnouncements(
    query: {
      classGrade?: string;
      studentId?: string;
      authorId?: string;
    },
    actor?: AnnouncementActor,
  ) {
    let scopedAuthorId = query.authorId;
    let scopedClassGrade = query.classGrade;
    let scopedStudentId = query.studentId;

    if (actor?.role === UserRole.ADMIN) {
      scopedAuthorId = undefined;
      scopedClassGrade = undefined;
      scopedStudentId = undefined;
    } else if (actor?.role === UserRole.TEACHER) {
      scopedAuthorId = undefined; // We'll handle author in a custom $or block
      scopedClassGrade = undefined;
      scopedStudentId = undefined;
    } else if (actor?.role === UserRole.STUDENT) {
      const student = await this.studentsService.findByUserId(actor.sub);
      scopedClassGrade = student.grade.toString();
      scopedStudentId = student._id.toString();
      scopedAuthorId = undefined;
    }

    const filter: Record<string, unknown> = {};

    if (actor?.role === UserRole.TEACHER) {
      filter.$or = [{ authorId: actor.sub }, { targetType: 'all' }];
    } else {
      if (scopedAuthorId) {
        filter.authorId = scopedAuthorId;
      }

      if (scopedStudentId || scopedClassGrade) {
        filter.$or = [
          { targetType: 'all' },
          ...(scopedClassGrade
            ? [
                {
                  targetType: 'classes',
                  targetClasses: scopedClassGrade,
                },
              ]
            : []),
          ...(scopedStudentId
            ? [
                {
                  targetType: 'students',
                  targetStudentIds: scopedStudentId,
                },
              ]
            : []),
        ];
      }
    }

    const announcements = await this.announcementModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return announcements.map((announcement) => this.toResponse(announcement));
  }

  async deleteAnnouncement(id: string) {
    const deleted = await this.announcementModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Announcement not found.');
    }

    return { id };
  }

  private toResponse(announcement: AnnouncementDocument) {
    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      targetType: announcement.targetType,
      targetClasses: announcement.targetClasses,
      targetStudentIds: announcement.targetStudentIds,
      authorId: announcement.authorId,
      authorRole: announcement.authorRole,
      authorName: announcement.authorName,
      publishedAt: announcement.publishedAt,
    };
  }
}
