import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../../common/auth/roles.enum';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { SchoolClass, SchoolClassDocument } from '../classes/schemas/class.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import {
  CreateMaterialRecordDto,
  UpsertCourseOverviewDto,
  UpdateCourseOverviewDto,
  UpdateMaterialDto,
  PatchRecommendedBooksDto,
} from './dto/create-material.dto';
import { QueryMaterialsDto } from './dto/query-materials.dto';
import { Material, MaterialDocument } from './schemas/material.schema';

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name)
    private readonly materialModel: Model<MaterialDocument>,
    @InjectModel(SchoolClass.name)
    private readonly classModel: Model<SchoolClassDocument>,
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
  ) {}

  async create(dto: CreateMaterialRecordDto, actor: RequestUser) {
    await this.assertReferences(dto.classId, dto.subjectId);

    const teacher = await this.resolveTeacher(actor, dto.teacherId);
    const studentUserIds = await this.resolveStudentUserIds(dto.classId);

    const recommendedBooks = (dto.recommendedBooks ?? []).map((book) => ({
      title: book.title.trim(),
      author: book.author.trim(),
      fileUrl: book.fileUrl?.trim(),
    }));

    const created = await this.materialModel.create({
      courseId: new Types.ObjectId(dto.courseId),
      classId: new Types.ObjectId(dto.classId),
      subjectId: dto.subjectId?.trim() || undefined,
      scope: dto.scope ?? 'material',
      title: dto.title.trim(),
      type: (dto.type ?? 'other').trim(),
      teacherId: new Types.ObjectId(String(teacher._id)),
      teacherUserId: teacher.userId ? new Types.ObjectId(String(teacher.userId)) : undefined,
      studentUserIds,
      description: dto.description.trim(),
      learningOutcome: dto.learningOutcome.trim(),
      learningOutcomes: dto.learningOutcomes ?? [],
      objectives: dto.objectives ?? [],
      thumbnailUrl: dto.thumbnailUrl?.trim() ?? '',
      thumbnailPublicId: dto.thumbnailPublicId?.trim() ?? '',
      weeklySchedule: dto.weeklySchedule ?? [],
      url: dto.url?.trim() ?? '',
      content: dto.content?.trim() ?? '',
      publicId: dto.publicId?.trim() ?? '',
      resourceType: dto.resourceType,
      originalFileName: dto.originalFileName?.trim() ?? '',
      mimeType: dto.mimeType?.trim() ?? '',
      sizeBytes: dto.sizeBytes ?? 0,
      chapterId: dto.chapterId?.trim() ?? '',
      topicId: dto.topicId?.trim() ?? '',
      recommendedBooks,
    });

    return this.toResponse(created);
  }

  async list(query: QueryMaterialsDto, actor: RequestUser) {
    const filters: Record<string, unknown> = {};

    if (query.courseId) filters.courseId = new Types.ObjectId(query.courseId);
    if (query.classId) filters.classId = new Types.ObjectId(query.classId);
    if (query.subjectId) filters.subjectId = query.subjectId.trim();
    if (query.scope) filters.scope = query.scope;

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      filters.teacherId = new Types.ObjectId(String(teacher._id));
    } else if (query.teacherId) {
      filters.teacherId = new Types.ObjectId(query.teacherId);
    }

    const docs = await this.materialModel.find(filters).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toResponse(doc));
  }

  async listByCourse(courseId: string, actor: RequestUser) {
    const docs = await this.materialModel
      .find({ courseId: new Types.ObjectId(courseId) })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toResponse(doc));
  }

  async upsertOverview(
    courseId: string,
    dto: UpsertCourseOverviewDto,
    actor: RequestUser,
  ) {
    const classId = dto.classId ?? courseId;
    const classDoc = await this.classModel.findById(classId).exec();
    if (!classDoc) {
      throw new NotFoundException('Class not found.');
    }

    const subjectId = dto.subjectId;
    if (subjectId) {
      await this.assertReferences(classId, subjectId);
    }

    // Allow admin to override teacher via dto.teacherId, otherwise resolve from actor
    let teacher = null as TeacherDocument | null;
    if (dto.teacherId && actor.role === UserRole.ADMIN) {
      teacher = await this.teacherModel.findById(dto.teacherId).exec();
      if (!teacher) {
        throw new NotFoundException('Teacher not found.');
      }
    } else {
      teacher = await this.resolveTeacher(actor);
    }

    // Support single-string learningOutcome for simpler frontend payloads
    const learningOutcomeValue = (dto.learningOutcome ?? (Array.isArray(dto.learningOutcomes) ? dto.learningOutcomes[0] : undefined) ?? dto.description ?? '').trim();

    const updated = await this.materialModel
      .findOneAndUpdate(
        {
          classId: new Types.ObjectId(classId),
          subjectId: subjectId?.trim() || undefined,
          scope: 'overview',
        },
        {
          $set: {
            classId: new Types.ObjectId(classId),
            subjectId: subjectId?.trim() || undefined,
            scope: 'overview',
            title: dto.title.trim(),
            type: 'overview',
            teacherId: new Types.ObjectId(String(teacher._id)),
            description: dto.description.trim(),
            learningOutcome: learningOutcomeValue,
            thumbnailUrl: dto.thumbnailUrl?.trim() ?? '',
            thumbnailPublicId: dto.thumbnailPublicId?.trim() ?? '',
            recommendedBooks: this.normalizeRecommendedBooks(dto.recommendedBooks),
            chapters: this.normalizeChapters(dto.chapters),
          },
          $unset: {
            courseId: '',
            teacherUserId: '',
            studentUserIds: '',
            learningOutcomes: '',
            objectives: '',
            weeklySchedule: '',
            recentMaterials: '',
            // keep recommendedBooks in $set when provided
            url: '',
            content: '',
            publicId: '',
            resourceType: '',
            originalFileName: '',
            mimeType: '',
            sizeBytes: '',
            chapterId: '',
            topicId: '',
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    return this.toResponse(updated as MaterialDocument);
  }

  async updateOverview(
    courseId: string,
    dto: UpdateCourseOverviewDto,
    actor: RequestUser,
  ) {
    const classId = dto.classId ?? courseId;
    const classDoc = await this.classModel.findById(classId).exec();
    if (!classDoc) {
      throw new NotFoundException('Class not found.');
    }

    const subjectId = dto.subjectId;
    if (subjectId) {
      await this.assertReferences(classId, subjectId);
    }

    // Allow admin to override teacher via dto.teacherId, otherwise resolve from actor
    let teacher = null as TeacherDocument | null;
    if (dto.teacherId && actor.role === UserRole.ADMIN) {
      teacher = await this.teacherModel.findById(dto.teacherId).exec();
      if (!teacher) {
        throw new NotFoundException('Teacher not found.');
      }
    } else {
      teacher = await this.resolveTeacher(actor);
    }

    // Find existing overview
    const overview = await this.materialModel
      .findOne({
        classId: new Types.ObjectId(classId),
        subjectId: subjectId?.trim() || undefined,
        scope: 'overview',
      })
      .exec();

    if (!overview) {
      throw new NotFoundException('Overview not found. Create overview first with POST.');
    }

    // Verify teacher owns this overview
    if (overview.teacherId.toString() !== teacher._id.toString() && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this overview.');
    }

    // Support single-string learningOutcome for simpler frontend payloads
    const learningOutcomeValue = (dto.learningOutcome ?? (Array.isArray(dto.learningOutcomes) ? dto.learningOutcomes[0] : undefined) ?? dto.description ?? '').trim();

    // Update only the provided fields
    const updateData: Record<string, any> = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.learningOutcome !== undefined || dto.learningOutcomes !== undefined) {
      updateData.learningOutcome = learningOutcomeValue;
    }
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl?.trim() ?? '';
    if (dto.thumbnailPublicId !== undefined) updateData.thumbnailPublicId = dto.thumbnailPublicId?.trim() ?? '';
    if (dto.weeklySchedule !== undefined) updateData.weeklySchedule = dto.weeklySchedule;
    if (dto.subjectId !== undefined) updateData.subjectId = dto.subjectId?.trim() || undefined;
    if (dto.recommendedBooks !== undefined) updateData.recommendedBooks = this.normalizeRecommendedBooks(dto.recommendedBooks);
    if (dto.chapters !== undefined) updateData.chapters = this.normalizeChapters(dto.chapters);

    const updated = await this.materialModel
      .findByIdAndUpdate(
        overview._id,
        { $set: updateData },
        { new: true },
      )
      .exec();

    return this.toResponse(updated as MaterialDocument);
  }

  async patchRecommendedBooks(
    courseId: string,
    dto: PatchRecommendedBooksDto,
    actor: RequestUser,
  ) {
    const classId = dto.classId ?? courseId;
    const subjectId = dto.subjectId;
    
    const classDoc = await this.classModel.findById(classId).exec();
    if (!classDoc) {
      throw new NotFoundException('Class not found.');
    }

    if (subjectId) {
      await this.assertReferences(classId, subjectId);
    }

    // Resolve teacher from actor
    const teacher = await this.resolveTeacher(actor);

    // Find existing overview
    const overview = await this.materialModel
      .findOne({
        classId: new Types.ObjectId(classId),
        subjectId: subjectId?.trim() || undefined,
        scope: 'overview',
      })
      .exec();

    if (!overview) {
      throw new NotFoundException('Overview not found. Create overview first.');
    }

    // Verify teacher owns this overview
    if (overview.teacherId.toString() !== teacher._id.toString() && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not own this overview.');
    }

    // Update only recommendedBooks array
    const updated = await this.materialModel
      .findByIdAndUpdate(
        overview._id,
        {
          $set: {
            recommendedBooks: this.normalizeRecommendedBooks(dto.recommendedBooks),
          },
        },
        { new: true },
      )
      .exec();

    return this.toResponse(updated as MaterialDocument);
  }

  async update(materialId: string, dto: UpdateMaterialDto, actor: RequestUser) {
    const doc = await this.materialModel.findById(materialId).exec();
    if (!doc) {
      throw new NotFoundException('Material not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You can update only your own materials.');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.type !== undefined) updateData.type = dto.type?.trim();
    if (dto.url !== undefined) updateData.url = dto.url?.trim() ?? '';
    if (dto.content !== undefined) updateData.content = dto.content?.trim() ?? '';
    if (dto.publicId !== undefined) updateData.publicId = dto.publicId?.trim() ?? '';
    if (dto.resourceType !== undefined) updateData.resourceType = dto.resourceType;
    if (dto.originalFileName !== undefined) updateData.originalFileName = dto.originalFileName?.trim() ?? '';
    if (dto.mimeType !== undefined) updateData.mimeType = dto.mimeType?.trim() ?? '';
    if (dto.sizeBytes !== undefined) updateData.sizeBytes = dto.sizeBytes ?? 0;
    if (dto.chapterId !== undefined) updateData.chapterId = dto.chapterId?.trim() ?? '';
    if (dto.topicId !== undefined) updateData.topicId = dto.topicId?.trim() ?? '';

    const updated = await this.materialModel.findByIdAndUpdate(materialId, { $set: updateData }, { new: true }).exec();
    return this.toResponse(updated as MaterialDocument);
  }
  async remove(materialId: string, actor: RequestUser) {
    const doc = await this.materialModel.findById(materialId).exec();
    if (!doc) {
      throw new NotFoundException('Material not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You can delete only your own materials.');
      }
    }

    await doc.deleteOne();

    return {
      id: materialId,
      deleted: true,
    };
  }

  private async assertReferences(classId: string, subjectId?: string, courseId?: string) {
    const classDoc = await this.classModel.findById(classId).exec();

    if (!classDoc) {
      throw new NotFoundException('Class not found.');
    }

    if (subjectId) {
      const subjectExists = (classDoc.subjects ?? []).some(
        (subject) => String(subject.id) === String(subjectId),
      );

      if (!subjectExists) {
        throw new NotFoundException('Subject not found in class.');
      }
    }
  }

  private async resolveTeacher(actor: RequestUser, teacherId?: string) {
    if (teacherId && actor.role === UserRole.ADMIN) {
      const teacher = await this.teacherModel.findById(teacherId).exec();
      if (!teacher) {
        throw new NotFoundException('Teacher not found.');
      }
      return teacher;
    }

    const lookupBy: Array<Record<string, unknown>> = [
      { email: actor.email.toLowerCase() },
    ];

    if (Types.ObjectId.isValid(actor.sub)) {
      lookupBy.unshift({ userId: new Types.ObjectId(actor.sub) });
    }

    const teacher = await this.teacherModel
      .findOne({ $or: lookupBy })
      .exec();

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found for current user.');
    }

    return teacher;
  }

  private toResponse(doc: MaterialDocument) {
    return {
      id: doc._id.toString(),
      courseId: doc.courseId ? doc.courseId.toString() : null,
      classId: doc.classId.toString(),
      subjectId: doc.subjectId ? doc.subjectId.toString() : null,
      scope: doc.scope ?? 'material',
      title: doc.title,
      type: doc.type,
      url: doc.url ?? '',
      publicId: doc.publicId ?? '',
      content: doc.content ?? '',
      resourceType: doc.resourceType ?? null,
      originalFileName: doc.originalFileName ?? '',
      mimeType: doc.mimeType ?? '',
      sizeBytes: doc.sizeBytes ?? 0,
      teacherId: doc.teacherId.toString(),
      teacherUserId: doc.teacherUserId ? doc.teacherUserId.toString() : null,
      studentUserIds: (doc.studentUserIds ?? []).map((studentId) => studentId.toString()),
      description: doc.description,
      learningOutcome: doc.learningOutcome ?? '',
      learningOutcomes: doc.learningOutcomes ?? [],
      objectives: doc.objectives ?? [],
      thumbnailUrl: doc.thumbnailUrl ?? '',
      thumbnailPublicId: doc.thumbnailPublicId ?? '',
      weeklySchedule: this.normalizeWeeklySchedule(doc.weeklySchedule as UpsertCourseOverviewDto['weeklySchedule']),
      recentMaterials: this.normalizeRecentMaterials((doc as any).recentMaterials),
      chapterId: doc.chapterId ?? '',
      topicId: doc.topicId ?? '',
      recommendedBooks: this.normalizeRecommendedBooks(doc.recommendedBooks as UpsertCourseOverviewDto['recommendedBooks']),
      chapters: this.normalizeChapters(doc.chapters as any),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private normalizeWeeklySchedule(
    weeklySchedule: UpsertCourseOverviewDto['weeklySchedule'],
  ) {
    return (weeklySchedule ?? []).map((slot) => ({
      day: slot.day.trim(),
      startTime: slot.startTime.trim(),
      endTime: slot.endTime.trim(),
      topic: slot.topic?.trim(),
      location: slot.location?.trim(),
    }));
  }

  private normalizeRecentMaterials(
    recentMaterials: UpsertCourseOverviewDto['recentMaterials'],
  ) {
    return (recentMaterials ?? []).map((material) => ({
      title: material.title.trim(),
      type: material.type,
      url: material.url?.trim() ?? '',
      publicId: material.publicId?.trim() ?? '',
      content: material.content?.trim() ?? '',
      resourceType: material.resourceType,
      originalFileName: material.originalFileName?.trim() ?? '',
      mimeType: material.mimeType?.trim() ?? '',
      sizeBytes: material.sizeBytes ?? 0,
    }));
  }

  private normalizeRecommendedBooks(
    recommendedBooks: UpsertCourseOverviewDto['recommendedBooks'],
  ) {
    return (recommendedBooks ?? []).map((book) => ({
      title: (book.title ?? (book as any).bookTitle ?? '').trim(),
      author: book.author.trim(),
      fileUrl: book.fileUrl?.trim(),
    }));
  }

  private normalizeChapters(chapters: any) {
    return (chapters ?? []).map((ch: any) => ({
      id: ch.id ? String(ch.id) : undefined,
      chapterNumber: ch.chapterNumber ?? undefined,
      chapterName: (ch.chapterName ?? ch.name ?? '').trim(),
      description: (ch.description ?? '').trim(),
      topics: (ch.topics ?? []).map((t: any) => ({
        id: t.id ? String(t.id) : undefined,
        topicName: (t.topicName ?? t.name ?? '').trim(),
      })),
    }));
  }

  private async resolveStudentUserIds(classId: string) {
    const students = await this.studentModel
      .find({ grade: new Types.ObjectId(classId), status: 'Active' })
      .select({ userId: 1 })
      .lean()
      .exec();

    return students
      .map((student) => student.userId)
      .filter((userId): userId is Types.ObjectId => Boolean(userId))
      .map((userId) => new Types.ObjectId(String(userId)));
  }
}
