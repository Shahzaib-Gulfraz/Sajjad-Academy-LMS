import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class CourseTopic {
  @Prop({ required: true, trim: true })
  id!: string; // UUID or string identifier

  @Prop({ required: true, trim: true })
  topicName!: string;

  @Prop({ type: [String], default: [] })
  materialIds?: string[]; // References to Material._id
}

const CourseTopicSchema = SchemaFactory.createForClass(CourseTopic);

@Schema({ _id: false })
export class CourseChapter {
  @Prop({ required: true, trim: true })
  id!: string; // UUID or string identifier

  @Prop({ required: true })
  chapterNumber!: number;

  @Prop({ required: true, trim: true })
  chapterName!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [CourseTopicSchema], default: [] })
  topics!: CourseTopic[];

  @Prop({ type: [String], default: [] })
  materialIds?: string[]; // References to Material._id for chapter-level materials
}

const CourseChapterSchema = SchemaFactory.createForClass(CourseChapter);

@Schema({ timestamps: true, collection: 'courses' })
export class Course {
  // Class ID (Ref: SchoolClass doc)
  @Prop({ type: Types.ObjectId, ref: 'SchoolClass', required: true, index: true })
  classId!: Types.ObjectId;

  // Subject ID (class subject UUID/string from SchoolClass.subjects)
  @Prop({ type: String, required: true, index: true })
  subjectId!: string;

  // Teacher ID (Ref: Teacher doc)
  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true, index: true })
  teacherId!: Types.ObjectId;

  // Course name (usually subject name)
  @Prop({ required: true, trim: true })
  name!: string;

  // Course description
  @Prop({ trim: true, default: '' })
  description?: string;

  // Chapters with topics
  @Prop({ type: [CourseChapterSchema], default: [] })
  chapters!: CourseChapter[];

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;

  @Prop({ type: Date, default: () => new Date() })
  updatedAt!: Date;
}

export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);

// Compound index for fast lookup
CourseSchema.index({ classId: 1, subjectId: 1, teacherId: 1 }, { unique: true });
