import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TimetableSlot,
  TimetableSlotDocument,
} from './schemas/timetable-slot.schema';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import {
  SchoolClass,
  SchoolClassDocument,
} from '../classes/schemas/class.schema';
import { UserRole } from '../../common/auth/roles.enum';
import { StudentsService } from '../students/students.service';

@Injectable()
export class TimetableService {
  constructor(
    @InjectModel(TimetableSlot.name)
    private readonly slotModel: Model<TimetableSlotDocument>,
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
    @InjectModel(SchoolClass.name)
    private readonly classModel: Model<SchoolClassDocument>,
    private readonly studentsService: StudentsService,
  ) {}

  async list(query: {
    weekStart?: string;
    weekEnd?: string;
    teacherId?: string;
    className?: string;
    actorRole: UserRole;
    actorUserId: string;
  }) {
    if (query.actorRole === UserRole.TEACHER) {
      const teacherProfile = await this.teacherModel
        .findOne({ userId: query.actorUserId })
        .select('_id')
        .lean<{ _id: Types.ObjectId } | null>()
        .exec();

      if (!teacherProfile) {
        return [];
      }

      query.teacherId = teacherProfile._id.toString();
    }

    if (query.actorRole === UserRole.STUDENT) {
      const studentProfile = await this.studentsService.findByUserId(
        query.actorUserId,
      );
      query.className = studentProfile.grade.toString();
      query.teacherId = undefined;
    }

    const filter: Record<string, unknown> = {};

    if (query.weekStart || query.weekEnd) {
      const weekStart = query.weekStart ?? query.weekEnd;
      const weekEnd = query.weekEnd ?? query.weekStart;

      filter.$and = [
        {
          $or: [
            { date: { $gte: weekStart, $lte: weekEnd } },
            {
              startDate: { $lte: weekEnd },
              endDate: { $gte: weekStart },
            },
            {
              startDate: { $exists: false },
              endDate: { $exists: false },
              date: { $gte: weekStart, $lte: weekEnd },
            },
          ],
        },
      ];
    }

    if (query.teacherId) {
      filter.teacherId = query.teacherId;
    }

    if (query.className) {
      // Support both legacy string class names and ObjectId-backed class refs.
      // If the incoming className looks like an ObjectId, use an ObjectId
      // in the filter so slots stored with ObjectId(className) will match.
      filter.className = Types.ObjectId.isValid(query.className)
        ? new Types.ObjectId(query.className)
        : query.className;
    }

    const slots = await this.slotModel
      .find(filter)
      .sort({ date: 1, startTime: 1 })
      .exec();

    // Fetch all classes to build lookup maps for resolving names
    const classes = await this.classModel.find().exec();
    const classNameMap = new Map<string, string>(); // ObjectId string -> class name
    const subjectNameMap = new Map<string, string>(); // subject UUID -> subject name

    for (const cls of classes) {
      classNameMap.set(cls._id.toString(), cls.name);
      if (cls.subjects) {
        for (const subject of cls.subjects) {
          subjectNameMap.set(subject.id, subject.name);
        }
      }
    }

    // Fetch all teachers to build lookup map for teacher names
    const teachers = await this.teacherModel.find().exec();
    const teacherNameMap = new Map<string, string>(); // ObjectId string -> teacher name
    for (const teacher of teachers) {
      teacherNameMap.set(teacher._id.toString(), teacher.name);
    }

    // Return slots with resolved names
    return slots.map((slot) => this.toResponse(slot, classNameMap, subjectNameMap, teacherNameMap));
  }

  async create(dto: CreateTimetableSlotDto) {
    this.validateTimeOrder(dto.startTime, dto.endTime);

    const teacher = await this.findTeacherById(dto.teacherId);
    await this.validateTeacherEligibility(teacher, dto.className, dto.subject);
    await this.ensureNoConflicts({
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      className: dto.className,
      teacherId: dto.teacherId,
    });

    const slot = await this.slotModel.create({
      ...dto,
      startDate: dto.startDate ?? dto.date,
      endDate: dto.endDate ?? dto.date,
      className: new Types.ObjectId(dto.className),
      teacherId: new Types.ObjectId(dto.teacherId),
    });

    return this.toResponse(slot);
  }

  async update(id: string, dto: UpdateTimetableSlotDto) {
    const slot = await this.findSlotById(id);

    const nextDate = dto.date ?? slot.date;
    const nextStartDate = dto.startDate ?? slot.startDate ?? nextDate;
    const nextEndDate = dto.endDate ?? slot.endDate ?? nextDate;
    const nextStart = dto.startTime ?? slot.startTime;
    const nextEnd = dto.endTime ?? slot.endTime;
    const nextClass = (dto.className ?? slot.className).toString();
    const nextSubject = dto.subject ?? slot.subject;
    const nextTeacherId = (dto.teacherId ?? slot.teacherId).toString();

    this.validateTimeOrder(nextStart, nextEnd);

    const teacher = await this.findTeacherById(nextTeacherId);
    await this.validateTeacherEligibility(teacher, nextClass, nextSubject);
    await this.ensureNoConflicts(
      {
        date: nextDate,
        startTime: nextStart,
        endTime: nextEnd,
        className: nextClass,
        teacherId: nextTeacherId,
      },
      slot._id.toString(),
    );

    slot.date = nextDate;
    slot.startDate = nextStartDate;
    slot.endDate = nextEndDate;
    slot.startTime = nextStart;
    slot.endTime = nextEnd;
    slot.className = new Types.ObjectId(nextClass);
    slot.subject = nextSubject;
    slot.teacherId = new Types.ObjectId(nextTeacherId);

    await slot.save();
    return this.toResponse(slot);
  }

  async remove(id: string) {
    const slot = await this.findSlotById(id);
    await slot.deleteOne();
    return { id };
  }

  private validateTimeOrder(start: string, end: string) {
    const startMinutes = this.toMinutes(start);
    const endMinutes = this.toMinutes(end);
    if (endMinutes <= startMinutes) {
      throw new BadRequestException('End time must be later than start time.');
    }
  }

  private async findTeacherById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Teacher not found.');
    }

    const teacher = await this.teacherModel.findById(id).exec();
    if (!teacher) {
      throw new NotFoundException('Teacher not found.');
    }

    return teacher;
  }

  private async findSlotById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Timetable slot not found.');
    }

    const slot = await this.slotModel.findById(id).exec();
    if (!slot) {
      throw new NotFoundException('Timetable slot not found.');
    }

    return slot;
  }

  private async validateTeacherEligibility(
    teacher: TeacherDocument,
    className: string,
    subject: string,
  ) {
    const classDoc = await this.classModel.findById(className).exec();
    if (!classDoc) {
      throw new BadRequestException('Selected class does not exist.');
    }

    const assignedClasses = teacher.classes ?? [];
    if (!assignedClasses.some((c) => c.toString() === className)) {
      throw new BadRequestException(
        'Selected teacher is not assigned to this class.',
      );
    }

    // Identify the subject by ID or Name from the class configuration
    const targetSubject = classDoc.subjects.find(
      (s) => s.id === subject || s.name === subject,
    );

    if (!targetSubject) {
      throw new BadRequestException(
        'Selected subject is not configured for this class.',
      );
    }

    const classSpecificSubjects = this.getTeacherSubjectsForClass(
      teacher,
      className,
    );

    // Check if teacher is assigned the subject (matches either ID or Name)
    const isEligible = classSpecificSubjects.some(
      (s) =>
        s === targetSubject.id ||
        s === targetSubject.name ||
        s.toLowerCase() === targetSubject.name.toLowerCase(),
    );

    if (!isEligible) {
      throw new BadRequestException(
        'Selected teacher is not assigned this subject for the selected class.',
      );
    }
  }

  private getTeacherSubjectsForClass(
    teacher: TeacherDocument,
    className: string,
  ): string[] {
    // Mongoose Maps must be accessed via .get()
    const map = teacher.classSubjects as unknown as any;
    const classSubjects =
      typeof map?.get === 'function' ? map.get(className) : map?.[className];

    if (Array.isArray(classSubjects) && classSubjects.length > 0) {
      return Array.from(new Set(classSubjects.filter(Boolean)));
    }

    return Array.from(
      new Set(
        (teacher.subject ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  private async ensureNoConflicts(
    slot: {
      date: string;
      startTime: string;
      endTime: string;
      className: string;
      teacherId: string;
    },
    ignoreSlotId?: string,
  ) {
    const classSlots = await this.slotModel
      .find({
        date: slot.date,
        className: slot.className,
        ...(ignoreSlotId ? { _id: { $ne: ignoreSlotId } } : {}),
      })
      .exec();

    const teacherSlots = await this.slotModel
      .find({
        date: slot.date,
        teacherId: slot.teacherId,
        ...(ignoreSlotId ? { _id: { $ne: ignoreSlotId } } : {}),
      })
      .exec();

    const classConflict = classSlots.find((existing) =>
      this.overlaps(
        slot.startTime,
        slot.endTime,
        existing.startTime,
        existing.endTime,
      ),
    );
    if (classConflict) {
      throw new ConflictException(
        'Class timetable conflict: this class already has a slot in the selected time range.',
      );
    }

    const teacherConflict = teacherSlots.find((existing) =>
      this.overlaps(
        slot.startTime,
        slot.endTime,
        existing.startTime,
        existing.endTime,
      ),
    );
    if (teacherConflict) {
      throw new ConflictException(
        'Teacher timetable conflict: this teacher already has a slot in the selected time range.',
      );
    }
  }

  private overlaps(startA: string, endA: string, startB: string, endB: string) {
    const aStart = this.toMinutes(startA);
    const aEnd = this.toMinutes(endA);
    const bStart = this.toMinutes(startB);
    const bEnd = this.toMinutes(endB);
    return aStart < bEnd && bStart < aEnd;
  }

  private toMinutes(value: string) {
    const [hourRaw, minuteRaw] = value.split(':').map((part) => Number(part));
    if (!Number.isFinite(hourRaw) || !Number.isFinite(minuteRaw)) {
      throw new BadRequestException('Invalid time format. Expected HH:mm.');
    }
    return hourRaw * 60 + minuteRaw;
  }

  private toResponse(
    slot: TimetableSlotDocument,
    classNameMap?: Map<string, string>,
    subjectNameMap?: Map<string, string>,
    teacherNameMap?: Map<string, string>,
  ) {
    const classNameStr = slot.className.toString();
    const resolvedClassName = classNameMap?.get(classNameStr) || classNameStr;
    const resolvedSubject = subjectNameMap?.get(slot.subject) || slot.subject;
    const teacherIdStr = slot.teacherId.toString();
    const resolvedTeacherName = teacherNameMap?.get(teacherIdStr) || teacherIdStr;

    return {
      id: slot._id.toString(),
      startDate: slot.startDate ?? slot.date,
      endDate: slot.endDate ?? slot.date,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      className: resolvedClassName,
      subject: resolvedSubject,
      teacherId: teacherIdStr,
      teacherName: resolvedTeacherName,
    };
  }
}
