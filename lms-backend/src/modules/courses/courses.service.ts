import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Course,
  CourseChapter,
  CourseDocument,
  CourseTopic,
  StudyMaterial,
  WeeklyScheduleItem,
} from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CourseEnrollment,
  CourseEnrollmentDocument,
} from './schemas/enrollment.schema';
import { Student, StudentDocument } from '../students/schemas/student.schema';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<CourseDocument>,
    @InjectModel(CourseEnrollment.name)
    private readonly enrollmentModel: Model<CourseEnrollmentDocument>,
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
  ) {}

  async create(dto: CreateCourseDto) {
    const teacherId = new Types.ObjectId(dto.teacherId);

    // One course/overview per teacher + class(grade):
    // if already present, reuse the existing document instead of creating a duplicate.
    const existingForClass = await this.courseModel
      .findOne({ teacherId, grade: dto.grade })
      .exec();
    if (existingForClass) {
      return this.toResponse(existingForClass);
    }

    const exists = await this.courseModel.exists({ code: dto.code });
    if (exists) {
      throw new ConflictException('Course with this code already exists.');
    }

    const overview = {
      title: dto.overviewTitle?.trim() || dto.name,
      description: dto.description.trim(),
      learningOutcomes: this.sanitizeStringArray(dto.learningOutcomes),
      objectives: this.sanitizeStringArray(dto.objectives),
      thumbnailUrl: dto.thumbnailUrl?.trim() ?? '',
      thumbnailPublicId: dto.thumbnailPublicId?.trim() ?? '',
      weeklySchedule: this.normalizeWeeklySchedule(dto.weeklySchedule),
      recentMaterials: [],
    };

    const course = await this.courseModel.create({
      ...dto,
      teacherId,
      description: overview.description,
      overview,
      learningOutcomes: overview.learningOutcomes,
      objectives: overview.objectives,
      thumbnailUrl: overview.thumbnailUrl,
      thumbnailPublicId: overview.thumbnailPublicId,
      weeklySchedule: this.normalizeWeeklySchedule(dto.weeklySchedule),
      chapters: (dto.chapters ?? []) as CourseChapter[],
      materials: (dto.materials ?? []) as StudyMaterial[],
      recentMaterials: [],
    });

    return this.toResponse(course);
  }

  async findAll(query?: { grade?: string; status?: string }) {
    const filter: Record<string, unknown> = {};
    if (query?.grade) filter.grade = query.grade;
    if (query?.status) filter.status = query.status;

    const courses = await this.courseModel
      .find(filter)
      .populate('teacherId', 'name email qualification')
      .sort({ name: 1 })
      .exec();

    return courses.map((course) => this.toResponse(course));
  }

  async findByStudentGrade(grade: string) {
    const courses = await this.courseModel
      .find({ grade, status: 'Active' })
      .populate('teacherId', 'name email qualification phone')
      .sort({ name: 1 })
      .exec();

    return courses.map((course) => this.enhanceWithProgress(course, 0));
  }

  async findByEnrollmentStudentId(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      return [];
    }

    const enrollments = await this.enrollmentModel
      .find({
        studentId: new Types.ObjectId(studentId),
        status: 'Active',
      })
      .lean()
      .exec();

    if (enrollments.length === 0) {
      return [];
    }

    const enrollmentByCourseId = new Map(
      enrollments.map((enrollment) => [enrollment.courseId.toString(), enrollment]),
    );

    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    const courses = await this.courseModel
      .find({ _id: { $in: courseIds }, status: 'Active' })
      .populate('teacherId', 'name email qualification phone')
      .sort({ name: 1 })
      .exec();

    return courses.map((course) => {
      const enrollment = enrollmentByCourseId.get(course._id.toString());
      return this.enhanceWithProgress(
        course,
        enrollment?.progress ?? 0,
        enrollment?.completedTopicIds ?? [],
      );
    });
  }

  async findByCourseIds(courseIds: string[]) {
    const validIds = courseIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    if (validIds.length === 0) {
      return [];
    }

    const courses = await this.courseModel
      .find({ _id: { $in: validIds }, status: 'Active' })
      .populate('teacherId', 'name email qualification phone')
      .sort({ name: 1 })
      .exec();

    return courses.map((course) => this.enhanceWithProgress(course, 0));
  }

  async findByEnrolledCourses(enrolledCourseNames: string[]) {
    if (!enrolledCourseNames || enrolledCourseNames.length === 0) {
      return [];
    }

    // Try exact match first
    const courses = await this.courseModel
      .find({
        name: { $in: enrolledCourseNames },
        status: 'Active',
      })
      .populate('teacherId', 'name email qualification phone')
      .sort({ name: 1 })
      .exec();

    if (courses.length > 0) {
      return courses.map((course) => this.enhanceWithProgress(course, 0));
    }

    // Fallback: try case-insensitive partial match if exact match fails
    const partialCourses = await this.courseModel
      .find({
        $or: enrolledCourseNames.map((name) => ({
          name: { $regex: name, $options: 'i' },
        })),
        status: 'Active',
      })
      .populate('teacherId', 'name email qualification phone')
      .sort({ name: 1 })
      .exec();

    return partialCourses.map((course) => this.enhanceWithProgress(course, 0));
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Course not found.');
    }
    const course = await this.courseModel
      .findById(id)
      .populate('teacherId', 'name email qualification phone')
      .exec();
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    return this.enhanceWithProgress(course);
  }

  async update(id: string, dto: UpdateCourseDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Course not found.');
    }

    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    if (dto.name !== undefined) course.name = dto.name;
    if (dto.description !== undefined) {
      course.description = dto.description;
      course.overview = {
        title: course.overview?.title ?? course.name,
        description: dto.description,
        learningOutcomes: course.overview?.learningOutcomes ?? [],
        objectives: course.overview?.objectives ?? [],
        thumbnailUrl: course.overview?.thumbnailUrl ?? '',
        thumbnailPublicId: course.overview?.thumbnailPublicId ?? '',
        weeklySchedule: course.overview?.weeklySchedule ?? [],
        recentMaterials: course.overview?.recentMaterials ?? [],
      };
    }
    if (
      dto.overviewTitle !== undefined ||
      dto.learningOutcomes !== undefined ||
      dto.objectives !== undefined ||
      dto.thumbnailUrl !== undefined ||
      dto.thumbnailPublicId !== undefined
    ) {
      course.overview = {
        title: dto.overviewTitle ?? course.overview?.title ?? course.name,
        description: course.overview?.description ?? course.description,
        learningOutcomes:
          dto.learningOutcomes !== undefined
            ? this.sanitizeStringArray(dto.learningOutcomes)
            : (course.overview?.learningOutcomes ?? []),
        objectives:
          dto.objectives !== undefined
            ? this.sanitizeStringArray(dto.objectives)
            : (course.overview?.objectives ?? []),
        thumbnailUrl: dto.thumbnailUrl ?? course.overview?.thumbnailUrl ?? '',
        thumbnailPublicId:
          dto.thumbnailPublicId ?? course.overview?.thumbnailPublicId ?? '',
        weeklySchedule: course.overview?.weeklySchedule ?? [],
        recentMaterials: course.overview?.recentMaterials ?? [],
      };
      course.learningOutcomes = course.overview.learningOutcomes;
      course.objectives = course.overview.objectives;
      course.thumbnailUrl = course.overview.thumbnailUrl;
      course.thumbnailPublicId = course.overview.thumbnailPublicId;
      course.description = course.overview.description;
    }
    if (dto.schedule !== undefined) course.schedule = dto.schedule;
    if (dto.room !== undefined) course.room = dto.room;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    if (dto.chapters !== undefined) course.chapters = dto.chapters as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    if (dto.materials !== undefined) course.materials = dto.materials as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    if (dto.pastPapers !== undefined) course.pastPapers = dto.pastPapers as any;
    if (dto.status !== undefined) course.status = dto.status;
    
    // Ensure recentMaterials stays in sync with materials
    if (dto.materials !== undefined) {
      this.syncMaterialsToRecent(course);
    }

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async updateOverview(
    id: string,
    patch: {
      title?: string;
      description?: string;
      learningOutcomes?: string[];
      objectives?: string[];
      thumbnailUrl?: string;
      thumbnailPublicId?: string;
      weeklySchedule?: WeeklyScheduleItem[];
      recentMaterials?: StudyMaterial[];
    },
  ) {
    const course = await this.getCourseDocument(id);

    course.overview = {
      title: patch.title ?? course.overview?.title ?? course.name,
      description:
        patch.description ?? course.overview?.description ?? course.description,
      learningOutcomes:
        patch.learningOutcomes !== undefined
          ? this.sanitizeStringArray(patch.learningOutcomes)
          : (course.overview?.learningOutcomes ?? []),
      objectives:
        patch.objectives !== undefined
          ? this.sanitizeStringArray(patch.objectives)
          : (course.overview?.objectives ?? []),
      thumbnailUrl: patch.thumbnailUrl ?? course.overview?.thumbnailUrl ?? '',
      thumbnailPublicId:
        patch.thumbnailPublicId ?? course.overview?.thumbnailPublicId ?? '',
      weeklySchedule:
        patch.weeklySchedule !== undefined
          ? this.normalizeWeeklySchedule(patch.weeklySchedule)
          : (course.overview?.weeklySchedule ?? []),
      recentMaterials:
        patch.recentMaterials !== undefined
          ? patch.recentMaterials
          : (course.overview?.recentMaterials ?? []),
    };

    course.description = course.overview.description;
    course.learningOutcomes = course.overview.learningOutcomes;
    course.objectives = course.overview.objectives;
    course.thumbnailUrl = course.overview.thumbnailUrl;
    course.thumbnailPublicId = course.overview.thumbnailPublicId;
    course.recentMaterials = course.overview.recentMaterials;
    course.materials = course.recentMaterials;

    course.markModified('overview');

    if (patch.weeklySchedule !== undefined) {
      course.weeklySchedule = this.normalizeWeeklySchedule(patch.weeklySchedule);
    }

    // Ensure all material fields are in sync
    this.syncMaterialsToRecent(course);

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  private syncMaterialsToRecent(course: any) {
    const materials = course.materials ?? [];
    course.recentMaterials = materials;
    if (course.overview) {
      course.overview.recentMaterials = materials;
    }
  }

  async addChapter(
    courseId: string,
    dto: { chapterNumber: number; chapterName: string; description?: string },
  ) {
    const course = await this.getCourseDocument(courseId);
    const chapters = [...(course.chapters ?? [])];

    const chapter: CourseChapter = {
      id: this.generateId(),
      chapterNumber: dto.chapterNumber,
      chapterName: dto.chapterName.trim(),
      description: dto.description?.trim(),
      topics: [],
      materials: [],
    };

    chapters.push(chapter);
    course.chapters = chapters;
    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async updateChapter(
    courseId: string,
    chapterId: string,
    patch: {
      chapterNumber?: number;
      chapterName?: string;
      description?: string;
    },
  ) {
    const course = await this.getCourseDocument(courseId);
    let found = false;

    course.chapters = (course.chapters ?? []).map((chapter) => {
      if (String(chapter.id) !== String(chapterId)) return chapter;
      found = true;
      return {
        ...chapter,
        ...(patch.chapterNumber !== undefined
          ? { chapterNumber: patch.chapterNumber }
          : {}),
        ...(patch.chapterName !== undefined
          ? { chapterName: patch.chapterName.trim() }
          : {}),
        ...(patch.description !== undefined
          ? { description: patch.description }
          : {}),
      };
    });

    if (!found) {
      throw new NotFoundException('Chapter not found.');
    }

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async removeChapter(courseId: string, chapterId: string) {
    const course = await this.getCourseDocument(courseId);
    const nextChapters = (course.chapters ?? []).filter(
      (chapter) => String(chapter.id) !== String(chapterId),
    );

    if (nextChapters.length === (course.chapters ?? []).length) {
      throw new NotFoundException('Chapter not found.');
    }

    course.chapters = nextChapters;
    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async addTopic(
    courseId: string,
    chapterId: string,
    dto: { topicName: string; description?: string },
  ) {
    const course = await this.getCourseDocument(courseId);
    let foundChapter = false;

    course.chapters = (course.chapters ?? []).map((chapter) => {
      if (String(chapter.id) !== String(chapterId)) return chapter;
      foundChapter = true;

      const nextTopic: CourseTopic = {
        id: this.generateId(),
        topicName: dto.topicName.trim(),
        description: dto.description?.trim(),
        materials: [],
      };

      return {
        ...chapter,
        topics: [...(chapter.topics ?? []), nextTopic],
      };
    });

    if (!foundChapter) {
      throw new NotFoundException('Chapter not found.');
    }

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async updateTopic(
    courseId: string,
    chapterId: string,
    topicId: string,
    patch: { topicName?: string; description?: string },
  ) {
    const course = await this.getCourseDocument(courseId);
    let foundTopic = false;

    course.chapters = (course.chapters ?? []).map((chapter) => {
      if (String(chapter.id) !== String(chapterId)) return chapter;
      return {
        ...chapter,
        topics: (chapter.topics ?? []).map((topic) => {
          if (String(topic.id) !== String(topicId)) return topic;
          foundTopic = true;
          return {
            ...topic,
            ...(patch.topicName !== undefined
              ? { topicName: patch.topicName.trim() }
              : {}),
            ...(patch.description !== undefined
              ? { description: patch.description }
              : {}),
          };
        }),
      };
    });

    if (!foundTopic) {
      throw new NotFoundException('Topic not found.');
    }

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async removeTopic(courseId: string, chapterId: string, topicId: string) {
    const course = await this.getCourseDocument(courseId);
    let removed = false;

    course.chapters = (course.chapters ?? []).map((chapter) => {
      if (String(chapter.id) !== String(chapterId)) return chapter;
      const nextTopics = (chapter.topics ?? []).filter((topic) => {
        const keep = String(topic.id) !== String(topicId);
        if (!keep) removed = true;
        return keep;
      });
      return {
        ...chapter,
        topics: nextTopics,
      };
    });

    if (!removed) {
      throw new NotFoundException('Topic not found.');
    }

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async addMaterial(
    courseId: string,
    dto: {
      title: string;
      type: StudyMaterial['type'];
      url?: string;
      content?: string;
      chapterId?: string;
      topicId?: string;
      publicId?: string;
    },
  ) {
    const course = await this.getCourseDocument(courseId);
    const material: StudyMaterial = {
      id: this.generateId(),
      title: dto.title.trim(),
      type: dto.type,
      url: dto.url,
      content: dto.content,
      chapterId: dto.chapterId,
      topicId: dto.topicId,
      publicId: dto.publicId,
      createdAt: new Date().toISOString(),
    };

    if (!dto.chapterId) {
      course.materials = [...(course.materials ?? []), material];
    } else {
      let chapterFound = false;
      let topicFound = false;

      course.chapters = (course.chapters ?? []).map((chapter) => {
        if (String(chapter.id) !== String(dto.chapterId)) return chapter;
        chapterFound = true;

        if (!dto.topicId) {
          return {
            ...chapter,
            materials: [...(chapter.materials ?? []), material],
          };
        }

        return {
          ...chapter,
          topics: (chapter.topics ?? []).map((topic) => {
            if (String(topic.id) !== String(dto.topicId)) return topic;
            topicFound = true;
            return {
              ...topic,
              materials: [...(topic.materials ?? []), material],
            };
          }),
        };
      });

      if (!chapterFound) {
        throw new NotFoundException('Chapter not found.');
      }
      if (dto.topicId && !topicFound) {
        throw new NotFoundException('Topic not found.');
      }
    }

    this.syncMaterialsToRecent(course);
    course.markModified('overview');

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async updateMaterial(
    courseId: string,
    materialId: string,
    patch: {
      title?: string;
      type?: StudyMaterial['type'];
      url?: string;
      content?: string;
      publicId?: string;
    },
  ) {
    const course = await this.getCourseDocument(courseId);
    let found = false;

    const patchMaterial = (material: StudyMaterial): StudyMaterial => {
      if (material.id !== materialId) return material;
      found = true;
      return {
        ...material,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.url !== undefined ? { url: patch.url } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.publicId !== undefined ? { publicId: patch.publicId } : {}),
      };
    };

    course.materials = (course.materials ?? []).map((material) =>
      patchMaterial(material),
    );
    course.chapters = (course.chapters ?? []).map((chapter) => ({
      ...chapter,
      materials: (chapter.materials ?? []).map((material) =>
        patchMaterial(material),
      ),
      topics: (chapter.topics ?? []).map((topic) => ({
        ...topic,
        materials: (topic.materials ?? []).map((material) =>
          patchMaterial(material),
        ),
      })),
    }));

    if (!found) {
      throw new NotFoundException('Material not found.');
    }

    this.syncMaterialsToRecent(course);
    course.markModified('overview');

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async removeMaterial(courseId: string, materialId: string) {
    const course = await this.getCourseDocument(courseId);
    const beforeCount = this.countMaterialReferences(course, materialId);

    course.materials = (course.materials ?? []).filter(
      (material) => material.id !== materialId,
    );
    course.chapters = (course.chapters ?? []).map((chapter) => ({
      ...chapter,
      materials: (chapter.materials ?? []).filter(
        (material) => material.id !== materialId,
      ),
      topics: (chapter.topics ?? []).map((topic) => ({
        ...topic,
        materials: (topic.materials ?? []).filter(
          (material) => material.id !== materialId,
        ),
      })),
    }));

    if (beforeCount === this.countMaterialReferences(course, materialId)) {
      throw new NotFoundException('Material not found.');
    }

    this.syncMaterialsToRecent(course);
    course.markModified('overview');

    const updated = await course.save();
    return this.enhanceWithProgress(updated, 0);
  }

  async listEnrollments(courseId: string) {
    await this.getCourseDocument(courseId);

    const enrollments = await this.enrollmentModel
      .find({ courseId: new Types.ObjectId(courseId) })
      .populate('studentId', 'name email grade admissionNo')
      .sort({ createdAt: -1 })
      .exec();

    return enrollments.map((enrollment) => ({
      id: enrollment._id.toString(),
      courseId: enrollment.courseId.toString(),
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress ?? 0,
      completedTopicIds: enrollment.completedTopicIds ?? [],
      student: enrollment.studentId,
      studentId: enrollment.studentId.toString(),
    }));
  }

  async enrollStudent(courseId: string, studentId: string) {
    const course = await this.getCourseDocument(courseId);
    const student = await this.getStudentDocument(studentId);

    const enrollment = await this.enrollmentModel
      .findOneAndUpdate(
        {
          courseId: new Types.ObjectId(courseId),
          studentId: new Types.ObjectId(studentId),
        },
        {
          $setOnInsert: {
            status: 'Active',
            enrolledAt: new Date(),
            completedTopicIds: [],
            progress: 0,
          },
          $set: { status: 'Active' },
        },
        { upsert: true, new: true },
      )
      .exec();

    const enrolledCourseIds = new Set(student.enrolledCourseIds ?? []);
    enrolledCourseIds.add(courseId);
    student.enrolledCourseIds = Array.from(enrolledCourseIds);

    const enrolledCourses = new Set(student.enrolledCourses ?? []);
    enrolledCourses.add(course.name);
    student.enrolledCourses = Array.from(enrolledCourses);

    await student.save();

    return {
      id: enrollment._id.toString(),
      courseId,
      studentId,
      status: enrollment.status,
      progress: enrollment.progress ?? 0,
      enrolledAt: enrollment.enrolledAt,
    };
  }

  async removeEnrollment(courseId: string, enrollmentId: string) {
    await this.getCourseDocument(courseId);

    if (!Types.ObjectId.isValid(enrollmentId)) {
      throw new NotFoundException('Enrollment not found.');
    }

    const enrollment = await this.enrollmentModel
      .findOneAndDelete({
        _id: new Types.ObjectId(enrollmentId),
        courseId: new Types.ObjectId(courseId),
      })
      .exec();

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    const courseIdString = enrollment.courseId.toString();
    const student = await this.studentModel
      .findById(enrollment.studentId)
      .exec();
    if (student) {
      student.enrolledCourseIds = (student.enrolledCourseIds ?? []).filter(
        (id) => id !== courseIdString,
      );
      await student.save();
    }

    return {
      id: enrollment._id.toString(),
      courseId: courseIdString,
      studentId: enrollment.studentId.toString(),
      deletedAt: new Date(),
    };
  }

  async toggleTopicCompletion(
    courseId: string,
    studentId: string,
    topicId: string,
    completed = true,
  ) {
    const course = await this.getCourseDocument(courseId);
    await this.getStudentDocument(studentId);

    const totalTopics = this.countTopics(course);
    if (totalTopics === 0) {
      throw new BadRequestException(
        'No topics are configured for this course yet.',
      );
    }

    const enrollment = await this.enrollmentModel
      .findOne({
        courseId: new Types.ObjectId(courseId),
        studentId: new Types.ObjectId(studentId),
      })
      .exec();

    if (!enrollment) {
      throw new NotFoundException('Student is not enrolled in this course.');
    }

    const completedTopics = new Set(enrollment.completedTopicIds ?? []);
    if (completed) {
      completedTopics.add(topicId);
    } else {
      completedTopics.delete(topicId);
    }

    enrollment.completedTopicIds = Array.from(completedTopics);
    enrollment.progress = Math.min(
      100,
      Math.round((enrollment.completedTopicIds.length / totalTopics) * 100),
    );
    await enrollment.save();

    return {
      courseId,
      studentId,
      topicId,
      completed,
      progress: enrollment.progress,
      completedTopicIds: enrollment.completedTopicIds,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Course not found.');
    }

    const course = await this.courseModel.findByIdAndDelete(id).exec();
    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    await this.enrollmentModel.deleteMany({ courseId: course._id }).exec();

    return { id: course._id.toString(), deletedAt: new Date() };
  }

  private enhanceWithProgress(
    course: CourseDocument,
    progress = 0,
    completedTopicIds: string[] = [],
  ) {
    const response = this.toResponse(course);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (response as any).progress = progress;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (response as any).completedTopicIds = completedTopicIds;
    return response;
  }

  private toResponse(course: CourseDocument) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const teacher = (course as any).populated('teacherId')
      ? course.teacherId
      : null;
    const teacherId = course.teacherId ? course.teacherId.toString() : '';
    return {
      id: course._id.toString(),
      name: course.name,
      code: course.code,
      teacher,
      teacherId,
      grade: course.grade,
      description: course.description,
      overviewTitle: course.overview?.title ?? course.name,
      learningOutcomes:
        course.overview?.learningOutcomes ?? course.learningOutcomes ?? [],
      objectives: course.overview?.objectives ?? course.objectives ?? [],
      thumbnailUrl: course.overview?.thumbnailUrl ?? course.thumbnailUrl ?? '',
      thumbnailPublicId:
        course.overview?.thumbnailPublicId ?? course.thumbnailPublicId ?? '',
      schedule: course.schedule,
      weeklySchedule: course.weeklySchedule ?? [],
      room: course.room,
      credits: course.credits,
      chapters: course.chapters,
      materials: course.materials,
      pastPapers: course.pastPapers,
      status: course.status,
      completedTopicIds: [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      updatedAt: (course as any).updatedAt,
      recentMaterials: course.overview?.recentMaterials ?? [],
    };
  }

  private sanitizeStringArray(values?: string[]) {
    return (values ?? []).map((value) => value.trim()).filter(Boolean);
  }

  private normalizeWeeklySchedule(input?: unknown): WeeklyScheduleItem[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return (input as any[])
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const row = item as Record<string, unknown>;
        const day = String(row.day ?? '').trim();
        const startTime = String(row.startTime ?? '').trim();
        const endTime = String(row.endTime ?? '').trim();

        if (!day || !startTime || !endTime) {
          return null;
        }

        return {
          id: String(row.id ?? this.generateId()),
          day,
          startTime,
          endTime,
          topic: String(row.topic ?? '').trim() || undefined,
          location: String(row.location ?? '').trim() || undefined,
        };
      })
      .filter((row) => !!row) as WeeklyScheduleItem[];
  }

  private countTopics(course: CourseDocument) {
    return (course.chapters ?? []).reduce(
      (count, chapter) => count + (chapter.topics?.length ?? 0),
      0,
    );
  }

  private countMaterialReferences(course: CourseDocument, materialId: string) {
    let count = (course.materials ?? []).filter(
      (material) => material.id === materialId,
    ).length;

    for (const chapter of course.chapters ?? []) {
      count += (chapter.materials ?? []).filter(
        (material) => material.id === materialId,
      ).length;
      for (const topic of chapter.topics ?? []) {
        count += (topic.materials ?? []).filter(
          (material) => material.id === materialId,
        ).length;
      }
    }

    return count;
  }

  private async getCourseDocument(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Course not found.');
    }

    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    return course;
  }

  private async getStudentDocument(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Student not found.');
    }

    const student = await this.studentModel.findById(id).exec();
    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    return student;
  }

  private generateId() {
    return new Types.ObjectId().toString();
  }
}
