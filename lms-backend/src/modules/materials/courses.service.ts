import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../../common/auth/roles.enum';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { Teacher, TeacherDocument } from '../teachers/schemas/teacher.schema';
import {
  CreateCourseDto,
  UpdateCourseDto,
  AddChapterDto,
  UpdateChapterDto,
  AddTopicDto,
} from './dto/courses.dto';
import { Course, CourseDocument, CourseChapter, CourseTopic } from './schemas/courses.schema';
import { randomUUID } from 'crypto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Teacher.name)
    private readonly teacherModel: Model<TeacherDocument>,
  ) {}

  async create(dto: CreateCourseDto, actor: RequestUser) {
    const teacher = await this.resolveTeacher(actor, dto);

    const created = await this.courseModel.create({
      classId: new Types.ObjectId(dto.classId),
      subjectId: dto.subjectId.trim(),
      teacherId: new Types.ObjectId(String(teacher._id)),
      name: dto.name.trim(),
      description: dto.description?.trim() ?? '',
      chapters: (dto.chapters ?? []).map((ch) => this.mapChapter(ch)),
    });

    return this.toResponse(created);
  }

  async findOne(courseId: string, actor: RequestUser) {
    const doc = await this.courseModel.findById(courseId).exec();
    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    return this.toResponse(doc);
  }

  async findByClassAndSubject(classId: string, subjectId: string, actor: RequestUser) {
    const doc = await this.courseModel
      .findOne({
        classId: new Types.ObjectId(classId),
        subjectId: subjectId.trim(),
      })
      .exec();

    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    return this.toResponse(doc);
  }

  async ensureByClassAndSubject(
    classId: string,
    subjectId: string,
    name: string,
    actor: RequestUser,
  ) {
    const teacher = await this.resolveTeacher(actor);
    const normalizedClassId = new Types.ObjectId(classId);
    const normalizedSubjectId = subjectId.trim();

    const existing = await this.courseModel
      .findOne({
        classId: normalizedClassId,
        subjectId: normalizedSubjectId,
        teacherId: new Types.ObjectId(String(teacher._id)),
      })
      .exec();

    if (existing) {
      return this.toResponse(existing);
    }

    const created = await this.courseModel.create({
      classId: normalizedClassId,
      subjectId: normalizedSubjectId,
      teacherId: new Types.ObjectId(String(teacher._id)),
      name: name.trim() || normalizedSubjectId,
      description: '',
      chapters: [],
    });

    return this.toResponse(created);
  }

  async update(courseId: string, dto: UpdateCourseDto, actor: RequestUser) {
    const doc = await this.courseModel.findById(courseId).exec();
    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    if (dto.description !== undefined) doc.description = dto.description.trim();
    if (dto.chapters !== undefined) {
      doc.chapters = dto.chapters.map((ch) => this.mapChapter(ch));
    }
    doc.updatedAt = new Date();

    await doc.save();
    return this.toResponse(doc);
  }

  async addChapter(courseId: string, dto: AddChapterDto, actor: RequestUser) {
    const doc = await this.courseModel.findById(courseId).exec();
    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    const newChapter: CourseChapter = {
      id: randomUUID(),
      chapterNumber: dto.chapterNumber,
      chapterName: dto.chapterName.trim(),
      description: dto.description?.trim(),
      topics: [],
      materialIds: [],
    };

    doc.chapters.push(newChapter);
    doc.updatedAt = new Date();
    await doc.save();

    return this.toResponse(doc);
  }

  async updateChapter(
    courseId: string,
    chapterId: string,
    dto: UpdateChapterDto,
    actor: RequestUser,
  ) {
    const doc = await this.courseModel.findById(courseId).exec();
    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    const chapter = doc.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found.');
    }

    if (dto.chapterNumber !== undefined) chapter.chapterNumber = dto.chapterNumber;
    if (dto.chapterName !== undefined) chapter.chapterName = dto.chapterName.trim();
    if (dto.description !== undefined) chapter.description = dto.description.trim();

    doc.updatedAt = new Date();
    await doc.save();

    return this.toResponse(doc);
  }

  async deleteChapter(courseId: string, chapterId: string, actor: RequestUser) {
    const doc = await this.courseModel.findById(courseId).exec();
    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    const idx = doc.chapters.findIndex((ch) => ch.id === chapterId);
    if (idx === -1) {
      throw new NotFoundException('Chapter not found.');
    }

    doc.chapters.splice(idx, 1);
    doc.updatedAt = new Date();
    await doc.save();

    return this.toResponse(doc);
  }

  async addTopic(
    courseId: string,
    chapterId: string,
    dto: AddTopicDto,
    actor: RequestUser,
  ) {
    const doc = await this.courseModel.findById(courseId).exec();
    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    const chapter = doc.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found.');
    }

    const newTopic: CourseTopic = {
      id: randomUUID(),
      topicName: dto.topicName.trim(),
      materialIds: [],
    };

    chapter.topics.push(newTopic);
    doc.updatedAt = new Date();
    await doc.save();

    return this.toResponse(doc);
  }

  async deleteTopic(
    courseId: string,
    chapterId: string,
    topicId: string,
    actor: RequestUser,
  ) {
    const doc = await this.courseModel.findById(courseId).exec();
    if (!doc) {
      throw new NotFoundException('Course not found.');
    }

    if (actor.role === UserRole.TEACHER) {
      const teacher = await this.resolveTeacher(actor);
      if (String(doc.teacherId) !== String(teacher._id)) {
        throw new ForbiddenException('You do not own this course.');
      }
    }

    const chapter = doc.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) {
      throw new NotFoundException('Chapter not found.');
    }

    const idx = chapter.topics.findIndex((tp) => tp.id === topicId);
    if (idx === -1) {
      throw new NotFoundException('Topic not found.');
    }

    chapter.topics.splice(idx, 1);
    doc.updatedAt = new Date();
    await doc.save();

    return this.toResponse(doc);
  }

  private mapChapter(ch: any): CourseChapter {
    return {
      id: ch.id || randomUUID(),
      chapterNumber: ch.chapterNumber,
      chapterName: ch.chapterName.trim(),
      description: ch.description?.trim(),
      topics: (ch.topics ?? []).map((tp: any) => ({
        id: tp.id || randomUUID(),
        topicName: tp.topicName.trim(),
        materialIds: tp.materialIds ?? [],
      })),
      materialIds: ch.materialIds ?? [],
    };
  }

  private toResponse(doc: CourseDocument) {
    return {
      id: doc._id.toString(),
      classId: doc.classId.toString(),
      subjectId: doc.subjectId,
      teacherId: doc.teacherId.toString(),
      name: doc.name,
      description: doc.description ?? '',
      chapters: doc.chapters,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private async resolveTeacher(actor: RequestUser, dto?: any) {
    const teacher = await this.teacherModel
      .findOne({ userId: new Types.ObjectId(actor.sub) })
      .exec();
    if (!teacher) {
      throw new NotFoundException('Teacher profile not found.');
    }
    return teacher;
  }
}
