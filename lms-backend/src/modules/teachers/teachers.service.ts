import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as argon2 from 'argon2';
import { Teacher, TeacherDocument } from './schemas/teacher.schema';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { UpdateTeacherSelfDto } from './dto/update-teacher-self.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/auth/roles.enum';
import {
  Assignment,
  AssignmentDocument,
} from '../assignments/schemas/assignment.schema';
import { Quiz, QuizDocument } from '../quizzes/schemas/quiz.schema';
import {
  TimetableSlot,
  TimetableSlotDocument,
} from '../timetable/schemas/timetable-slot.schema';
import {
  AttendanceSession,
  AttendanceSessionDocument,
} from '../attendance/schemas/attendance-session.schema';
import {
  GradebookEntry,
  GradebookEntryDocument,
} from '../gradebook/schemas/gradebook-entry.schema';
import { LeaveRequest, LeaveRequestDocument } from '../leaves/schemas/leave-request.schema';
import { SchoolClass, SchoolClassDocument } from '../classes/schemas/class.schema';
import { Material, MaterialDocument } from '../materials/schemas/material.schema';
import { Course, CourseDocument } from '../materials/schemas/courses.schema';

@Injectable()
export class TeachersService {
  constructor(
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
    @InjectModel(Assignment.name)
    private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
    @InjectModel(TimetableSlot.name)
    private readonly timetableSlotModel: Model<TimetableSlotDocument>,
    @InjectModel(AttendanceSession.name)
    private readonly attendanceSessionModel: Model<AttendanceSessionDocument>,
    @InjectModel(GradebookEntry.name)
    private readonly gradebookEntryModel: Model<GradebookEntryDocument>,
    @InjectModel(LeaveRequest.name)
    private readonly leaveModel: Model<LeaveRequestDocument>,
    @InjectModel(SchoolClass.name)
    private readonly classModel: Model<SchoolClassDocument>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateTeacherDto) {
    const exists = await this.teacherModel.exists({
      employeeNo: dto.employeeNo,
    });
    if (exists) {
      throw new ConflictException(
        'Teacher with this employee number already exists.',
      );
    }

    const classSubjects = this.normalizeClassSubjects(dto.classSubjects ?? {});
    const classes = dto.classes ?? Object.keys(classSubjects);

    const defaultPassword = dto.employeeNo;
    const passwordHash = await argon2.hash(defaultPassword);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: UserRole.TEACHER,
      systemId: dto.employeeNo,
    });

    const teacher = await this.teacherModel.create({
      ...dto,
      userId: user._id,
      email: dto.email.toLowerCase(),
      gender: dto.gender ?? '',
      qualification: dto.qualification ?? '',
      phone: '',
      address: '',
      dob: '',
      emergencyContact: '',
      emergencyPhone: '',
      classes: classes.map(c => new Types.ObjectId(c)),
      classSubjects,
      status: 'Active',
    });

    return this.toResponse(teacher);
  }

  async findAll(query: { search?: string; status?: string }) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { employeeNo: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const teachers = await this.teacherModel
      .find(filter)
      .sort({ name: 1 })
      .exec();
    return teachers.map((item) => this.toResponse(item));
  }

  async findByEmail(email: string) {
    const teacher = await this.teacherModel
      .findOne({ email: email.toLowerCase() })
      .exec();

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found.');
    }

    return this.toResponse(teacher);
  }

  async findMyClassesWithCourses(email: string) {
    const teacher = await this.teacherModel
      .findOne({ email: email.toLowerCase() })
      .exec();

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found.');
    }

    const teacherId = teacher._id;
    const assignedClassIds = (teacher.classes ?? []).map((id) => id.toString());

    const [classes, materialDocs, coursesDocs] = await Promise.all([
      this.classModel
        .find({ _id: { $in: assignedClassIds.map((id) => new Types.ObjectId(id)) } })
        .sort({ name: 1 })
        .lean()
        .exec(),
      this.materialModel
        .find({
          classId: { $in: assignedClassIds.map((id) => new Types.ObjectId(id)) },
        })
        .lean()
        .exec(),
      this.courseModel
        .find({
          classId: { $in: assignedClassIds.map((id) => new Types.ObjectId(id)) },
          teacherId: new Types.ObjectId(teacherId),
        })
        .lean()
        .exec(),
    ]);

    const overviewByClassId = new Map<string, any>();
    const materialsByClassId = new Map<string, any[]>();
    const coursesByKey = new Map<string, any>();

    for (const material of materialDocs) {
      const classId = String((material as any).classId);
      const subjectId = String((material as any).subjectId ?? '');
      const key = `${classId}:${subjectId}`;
      
      if ((material as any).scope === 'overview') {
        const existing = overviewByClassId.get(key);
        if (!existing || new Date((material as any).updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          overviewByClassId.set(key, material);
        }
      } else {
        const bucket = materialsByClassId.get(key) ?? [];
        bucket.push(material);
        materialsByClassId.set(key, bucket);
      }
    }

    for (const course of coursesDocs) {
      const key = `${(course as any).classId}:${(course as any).subjectId}`;
      coursesByKey.set(key, course);
    }

    const classSubjectsMap =
      teacher.classSubjects as unknown as Map<string, string[]> | Record<string, string[]>;

    return classes.map((cls) => {
      const classId = cls._id.toString();
      const className = cls.name;
      const assignedSubjectIds = new Set(
        (classSubjectsMap instanceof Map
          ? classSubjectsMap.get(classId) ?? []
          : classSubjectsMap?.[classId] ?? []).map((id) => id.toString()),
      );

      const classSubjects = (cls.subjects ?? [])
        .filter((subject) => assignedSubjectIds.has(subject.id))
        .map((subject) => ({
          id: subject.id,
          name: subject.name,
        }));

      const classCourses = classSubjects.map((subject) => {
        const materialKey = `${classId}:${subject.id}`;
        const matchedMaterials = materialsByClassId.get(materialKey) ?? [];
        const matchedOverview = overviewByClassId.get(materialKey);
        const courseKey = `${classId}:${subject.id}`;
        const courseDoc = coursesByKey.get(courseKey);

        return {
          id: `${classId}:${subject.id}`,
          courseId: subject.id,
          subjectId: subject.id,
          name: subject.name,
          code: `${className}-${subject.name}`.replace(/\s+/g, '-').toUpperCase(),
          description: matchedOverview?.description ?? `${subject.name} assigned for ${className}.`,
          materialsCount: matchedMaterials.length,
          overviewTitle: matchedOverview?.title ?? subject.name,
          learningOutcomes: matchedOverview?.learningOutcomes ?? [],
          objectives: matchedOverview?.objectives ?? [],
          thumbnailUrl: matchedOverview?.thumbnailUrl ?? '',
          thumbnailPublicId: matchedOverview?.thumbnailPublicId ?? '',
          weeklySchedule: matchedOverview?.weeklySchedule ?? [],
          recentMaterials:
            matchedOverview?.recentMaterials ?? matchedMaterials.slice(0, 10).map((material: any) => ({
              id: material._id.toString(),
              title: material.title,
              type: material.type,
              url: material.url,
              publicId: material.publicId,
              content: material.content,
              resourceType: material.resourceType,
              originalFileName: material.originalFileName,
              mimeType: material.mimeType,
              sizeBytes: material.sizeBytes,
              chapterId: material.chapterId,
              topicId: material.topicId,
              createdAt: material.createdAt,
            })),
          overview: matchedOverview ? {
            description: matchedOverview.description,
            learningOutcome: matchedOverview.learningOutcome,
            learningOutcomes: matchedOverview.learningOutcomes,
            objectives: matchedOverview.objectives,
            thumbnailUrl: matchedOverview.thumbnailUrl,
            thumbnailPublicId: matchedOverview.thumbnailPublicId,
            recommendedBooks: matchedOverview.recommendedBooks ?? [],
            weeklySchedule: matchedOverview.weeklySchedule,
            chapters: courseDoc?.chapters ?? matchedOverview.chapters ?? [],
          } : undefined,
          chapters: courseDoc?.chapters ?? matchedOverview?.chapters ?? [],
          materials: matchedMaterials.map((material: any) => ({
            id: material._id.toString(),
            title: material.title,
            type: material.type,
            url: material.url,
            publicId: material.publicId,
            content: material.content,
            resourceType: material.resourceType,
            originalFileName: material.originalFileName,
            mimeType: material.mimeType,
            sizeBytes: material.sizeBytes,
            chapterId: material.chapterId,
            topicId: material.topicId,
            createdAt: material.createdAt,
          })),
          updatedAt: matchedOverview?.updatedAt,
        };
      });

      return {
        classId,
        className,
        academicYear: cls.academicYear,
        assignedCourseCount: classCourses.length,
        subjects: classSubjects,
        courses: classCourses,
      };
    });
  }

  async updateByEmail(email: string, dto: UpdateTeacherSelfDto) {
    const teacher = await this.teacherModel
      .findOne({ email: email.toLowerCase() })
      .exec();

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found.');
    }

    if (dto.phone !== undefined) teacher.phone = dto.phone;
    if (dto.address !== undefined) teacher.address = dto.address;
    if (dto.dob !== undefined) teacher.dob = dto.dob;
    if (dto.emergencyContact !== undefined) {
      teacher.emergencyContact = dto.emergencyContact;
    }
    if (dto.emergencyPhone !== undefined) {
      teacher.emergencyPhone = dto.emergencyPhone;
    }
    if (dto.avatarUrl !== undefined) teacher.avatarUrl = dto.avatarUrl;

    await teacher.save();

    if (teacher.userId) {
      await this.usersService.updateIdentity(teacher.userId.toString(), {
        name: teacher.name,
        email: teacher.email,
        systemId: teacher.employeeNo,
      });
    }

    return this.toResponse(teacher);
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.findById(id);

    if (dto.name) teacher.name = dto.name;
    if (dto.email) teacher.email = dto.email.toLowerCase();
    if (dto.gender !== undefined) teacher.gender = dto.gender;
    if (dto.qualification !== undefined)
      teacher.qualification = dto.qualification;
    if (dto.classes) teacher.classes = dto.classes.map(c => new Types.ObjectId(c));
    if (dto.classSubjects) {
      teacher.classSubjects = this.normalizeClassSubjects(dto.classSubjects);
    }
    if (dto.status) teacher.status = dto.status;

    await teacher.save();

    if (teacher.userId) {
      await this.usersService.updateIdentity(teacher.userId.toString(), {
        name: teacher.name,
        email: teacher.email,
        systemId: teacher.employeeNo,
      });
    }

    return this.toResponse(teacher);
  }

  async remove(id: string) {
    const teacher = await this.findById(id);
    const teacherObjectId = teacher._id;

    // Delete all related records in parallel
    const tasks: Promise<unknown>[] = [
      // Assignments created by this teacher
      this.assignmentModel.deleteMany({ teacherId: teacher.employeeNo }).exec(),

      // Quizzes created by this teacher
      this.quizModel.deleteMany({ teacherId: teacher.employeeNo }).exec(),

      // Timetable slots assigned to this teacher
      this.timetableSlotModel.deleteMany({ teacherId: teacherObjectId }).exec(),

      // Attendance sessions created by this teacher
      this.attendanceSessionModel.deleteMany({ teacherId: teacher.employeeNo }).exec(),

      // Gradebook entries (grades) created by this teacher
      this.gradebookEntryModel.deleteMany({ teacherId: teacher.employeeNo }).exec(),
    ];

    // Remove leave requests made by this teacher (if linked to a user)
    if (teacher.userId) {
      tasks.push(
        this.leaveModel.deleteMany({ requesterUserId: teacher.userId.toString() }).exec(),
      );
    }

    await Promise.all(tasks);

    // Delete the teacher record
    await teacher.deleteOne();

    // Delete the associated user
    if (teacher.userId) {
      await this.usersService.remove(teacher.userId.toString());
    }

    return { id };
  }

  async resetPassword(id: string) {
    const teacher = await this.findById(id);
    return this.resetPasswordForTeacher(teacher);
  }

  async findByEmployeeNo(employeeNo: string) {
    return this.teacherModel
      .findOne({
        employeeNo: {
          $regex: `^${this.escapeRegex(employeeNo.trim())}$`,
          $options: 'i',
        },
      })
      .exec();
  }

  async checkAvailability(employeeNo: string, email: string) {
    const normalizedEmployeeNo = employeeNo.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const [teacherExists, userExists] = await Promise.all([
      this.teacherModel.exists({
        employeeNo: {
          $regex: `^${this.escapeRegex(normalizedEmployeeNo)}$`,
          $options: 'i',
        },
      }),
      this.usersService.findByEmail(normalizedEmail),
    ]);

    return {
      employeeNoExists: !!teacherExists,
      emailExists: !!userExists,
    };
  }

  async resetPasswordByEmployeeNo(employeeNo: string) {
    const teacher = await this.findByEmployeeNo(employeeNo);
    if (!teacher) {
      throw new NotFoundException('Teacher not found.');
    }
    return this.resetPasswordForTeacher(teacher);
  }

  private async resetPasswordForTeacher(teacher: TeacherDocument) {
    const defaultPassword = teacher.employeeNo;
    const passwordHash = await argon2.hash(defaultPassword);

    const existingUser =
      (teacher.userId
        ? await this.usersService
            .findById(teacher.userId.toString())
            .catch(() => null)
        : null) ?? (await this.usersService.findByEmail(teacher.email));

    if (existingUser) {
      await this.usersService.updateIdentity(existingUser._id.toString(), {
        name: teacher.name,
        email: teacher.email,
        systemId: teacher.employeeNo,
      });
      await this.usersService.updatePasswordHash(
        existingUser._id.toString(),
        passwordHash,
      );
      await this.usersService.setRefreshTokenHash(
        existingUser._id.toString(),
        null,
      );
      if (
        !teacher.userId ||
        teacher.userId.toString() !== existingUser._id.toString()
      ) {
        teacher.userId = existingUser._id;
        await teacher.save();
      }
    } else {
      const createdUser = await this.usersService.create({
        name: teacher.name,
        email: teacher.email,
        passwordHash,
        role: UserRole.TEACHER,
        systemId: teacher.employeeNo,
      });
      teacher.userId = createdUser._id;
      await teacher.save();
    }

    return {
      id: teacher._id.toString(),
      defaultPassword,
    };
  }

  private async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Teacher not found.');
    }

    const teacher = await this.teacherModel.findById(id).exec();
    if (!teacher) {
      throw new NotFoundException('Teacher not found.');
    }

    return teacher;
  }

  private toResponse(
    teacher: TeacherDocument | (Teacher & { _id: Types.ObjectId }),
  ) {
    return {
      id: teacher._id.toString(),
      employeeNo: teacher.employeeNo,
      name: teacher.name,
      email: teacher.email,
      gender: teacher.gender,
      qualification: teacher.qualification,
      phone: teacher.phone ?? '',
      address: teacher.address ?? '',
      dob: teacher.dob ?? '',
      emergencyContact: teacher.emergencyContact ?? '',
      emergencyPhone: teacher.emergencyPhone ?? '',
      avatarUrl: teacher.avatarUrl ?? '',
      classes: (teacher.classes ?? []).map(c => c.toString()),
      classSubjects: Object.fromEntries(
        Array.from(
          (teacher.classSubjects instanceof Map
            ? teacher.classSubjects.entries()
            : Object.entries(teacher.classSubjects ?? {})) as any,
        ).map(([key, value]) => [key, Array.isArray(value) ? value : []]),
      ),
      status: teacher.status,
    };
  }

  private normalizeClassSubjects(value: Record<string, string[]>) {
    return Object.fromEntries(
      Object.entries(value).map(([key, subjects]) => [
        key,
        Array.from(new Set((subjects ?? []).filter(Boolean))),
      ]),
    );
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
