import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto';
export type MaterialScope = 'overview' | 'material';

@Schema({ _id: false })
export class WeeklyScheduleItem {
  @Prop({ required: true, trim: true })
  day!: string;

  @Prop({ required: true, trim: true })
  startTime!: string;

  @Prop({ required: true, trim: true })
  endTime!: string;

  @Prop({ trim: true })
  topic?: string;

  @Prop({ trim: true })
  location?: string;
}

const WeeklyScheduleItemSchema = SchemaFactory.createForClass(WeeklyScheduleItem);

@Schema({ _id: false })
export class RecentMaterial {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  type!: string;

  @Prop({ trim: true, default: '' })
  url?: string;

  @Prop({ trim: true, default: '' })
  publicId?: string;

  @Prop({ trim: true, default: '' })
  content?: string;

  @Prop({ trim: true, default: '' })
  resourceType?: CloudinaryResourceType;

  @Prop({ trim: true, default: '' })
  originalFileName?: string;

  @Prop({ trim: true, default: '' })
  mimeType?: string;

  @Prop({ type: Number, default: 0 })
  sizeBytes?: number;
}

const RecentMaterialSchema = SchemaFactory.createForClass(RecentMaterial);

// Recommended Book Schema (Teacher multiple books add kar sakta hai)
@Schema({ _id: false })
export class RecommendedBook {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  author!: string;

  @Prop({ trim: true })
  fileUrl?: string;
}

const RecommendedBookSchema = SchemaFactory.createForClass(RecommendedBook);

@Schema({ _id: false })
export class TopicSchemaClass {
  @Prop({ trim: true })
  id?: string;

  @Prop({ required: true, trim: true })
  topicName!: string;
}
const TopicSchema = SchemaFactory.createForClass(TopicSchemaClass);

@Schema({ _id: false })
export class ChapterSchemaClass {
  @Prop({ trim: true })
  id?: string;

  @Prop({ type: Number })
  chapterNumber?: number;

  @Prop({ required: true, trim: true })
  chapterName!: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({ type: [TopicSchema], default: [] })
  topics?: TopicSchemaClass[];
}
const ChapterSchema = SchemaFactory.createForClass(ChapterSchemaClass);

@Schema({ timestamps: true, collection: 'materials' })
export class Material {
  // Deprecated: courseId is optional now. Primary linkage is via `classId`.
  @Prop({ type: Types.ObjectId })
  courseId?: Types.ObjectId;

  // 1. Class ID (Ref: SchoolClass doc)
  @Prop({ type: Types.ObjectId, ref: 'SchoolClass', required: true, index: true })
  classId!: Types.ObjectId;

  // 2. Subject ID (class subject UUID/string from SchoolClass.subjects)
  @Prop({ type: String, index: true })
  subjectId?: string;

  @Prop({ type: String, enum: ['overview', 'material'], default: 'material', index: true })
  scope!: MaterialScope;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  type!: string;

  @Prop({ trim: true, default: '' })
  url?: string;

  @Prop({ trim: true, default: '' })
  publicId?: string;

  @Prop({ trim: true, default: '' })
  content?: string;

  @Prop({ trim: true, default: '' })
  resourceType?: CloudinaryResourceType;

  @Prop({ trim: true, default: '' })
  originalFileName?: string;

  @Prop({ trim: true, default: '' })
  mimeType?: string;

  @Prop({ type: Number, default: 0 })
  sizeBytes?: number;

  // 3. Teacher ID (Ref: Teacher doc)
  @Prop({ type: Types.ObjectId, ref: 'Teacher', required: true, index: true })
  teacherId!: Types.ObjectId;

  // Optional link to user account id (if teacher.userId exists)
  @Prop({ type: Types.ObjectId, index: true })
  teacherUserId?: Types.ObjectId;

  // Students who are enrolled in the class when this material is created
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [], index: true })
  studentUserIds!: Types.ObjectId[];

  // 4. Description
  @Prop({ required: true, trim: true })
  description!: string;

  // 5. Learning Outcome (Single string)
  @Prop({ type: String, default: '' })
  learningOutcome?: string;

  @Prop({ type: [String], default: [] })
  learningOutcomes?: string[];

  @Prop({ type: [String], default: [] })
  objectives?: string[];

  // 6. Thumbnail URL
  @Prop({ trim: true, default: '' })
  thumbnailUrl!: string;

  @Prop({ trim: true, default: '' })
  thumbnailPublicId?: string;

  @Prop({ type: [WeeklyScheduleItemSchema], default: [] })
  weeklySchedule?: WeeklyScheduleItem[];

  @Prop({ type: [RecentMaterialSchema], default: [] })
  recentMaterials?: RecentMaterial[];

  @Prop({ trim: true, default: '' })
  chapterId?: string;

  @Prop({ trim: true, default: '' })
  topicId?: string;

  @Prop({ type: [ChapterSchema], default: [] })
  chapters?: ChapterSchemaClass[];

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;

  @Prop({ type: Date, default: () => new Date() })
  updatedAt!: Date;

  // 7. Recommended Books (Array of objects)
  @Prop({ type: [RecommendedBookSchema], default: [] })
  recommendedBooks!: RecommendedBook[];
}

export type MaterialDocument = HydratedDocument<Material>;
export const MaterialSchema = SchemaFactory.createForClass(Material);

// Searching fast karne ke liye Compound Index
MaterialSchema.index({ classId: 1, subjectId: 1, teacherId: 1 });