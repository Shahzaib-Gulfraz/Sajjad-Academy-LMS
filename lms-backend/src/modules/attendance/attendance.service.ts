import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AttendanceSession,
  AttendanceSessionDocument,
} from './schemas/attendance-session.schema';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { UpdateAttendanceEntryDto } from './dto/update-attendance-entry.dto';
import { UserRole } from '../../common/auth/roles.enum';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { StudentsService } from '../students/students.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceSession.name)
    private readonly attendanceModel: Model<AttendanceSessionDocument>,
    private readonly studentsService: StudentsService,
  ) {}

  async createSession(
    dto: CreateAttendanceSessionDto,
    actor: { sub: string; role: UserRole },
  ) {
    if (actor.role !== UserRole.TEACHER && actor.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only teachers or admins can submit attendance.',
      );
    }

    const session = await this.attendanceModel.create({
      className: dto.className,
      teacherId: actor.sub,
      teacherName: dto.teacherName,
      date: dto.date,
      time: dto.time,
      classType: dto.classType ?? 'Regular',
      roomOrMode: dto.roomOrMode,
      entries: dto.entries,
    });

    return this.toResponse(session);
  }

  async listSessions(query: {
    className?: string;
    date?: string;
    teacherId?: string;
  }) {
    const filter: Record<string, unknown> = {};
    if (query.className) filter.className = query.className;
    if (query.date) filter.date = query.date;
    if (query.teacherId) filter.teacherId = query.teacherId;

    const sessions = await this.attendanceModel
      .find(filter)
      .sort({ date: -1 })
      .exec();
    return sessions.map((session) => this.toResponse(session));
  }

  async getStudentAttendance(studentId: string, actor: RequestUser) {
    if (actor.role === UserRole.STUDENT) {
      const me = await this.studentsService.findByUserId(actor.sub);
      if (me._id.toString() !== studentId) {
        throw new UnauthorizedException(
          'You are not allowed to view another student attendance.',
        );
      }
    }

    const sessions = await this.attendanceModel
      .find({ 'entries.studentId': studentId })
      .sort({ date: -1 })
      .exec();

    return sessions.map((session) => {
      const matched = session.entries.find(
        (entry) => entry.studentId === studentId,
      );
      return {
        sessionId: session._id.toString(),
        className: session.className,
        date: session.date,
        time: session.time,
        status: matched?.status,
        teacherName: session.teacherName,
      };
    });
  }

  async updateEntry(sessionId: string, dto: UpdateAttendanceEntryDto) {
    const session = await this.attendanceModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('Attendance session not found.');
    }

    const target = session.entries.find(
      (entry) => entry.studentId === dto.studentId,
    );
    if (!target) {
      throw new NotFoundException('Attendance entry not found for student.');
    }

    target.status = dto.status;
    await session.save();

    return this.toResponse(session);
  }

  private toResponse(session: AttendanceSessionDocument) {
    return {
      id: session._id.toString(),
      className: session.className,
      teacherId: session.teacherId,
      teacherName: session.teacherName,
      date: session.date,
      time: session.time,
      classType: session.classType,
      roomOrMode: session.roomOrMode,
      entries: session.entries,
    };
  }
}
