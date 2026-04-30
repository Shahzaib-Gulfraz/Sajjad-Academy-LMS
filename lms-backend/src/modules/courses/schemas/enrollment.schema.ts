import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'course_enrollments' })
export class CourseEnrollment {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  studentId!: Types.ObjectId;

  @Prop({ type: String, default: 'Active' })
  status!: string;

  @Prop({ type: Date, default: () => new Date() })
  enrolledAt!: Date;

  @Prop({ type: [String], default: [] })
  completedTopicIds!: string[];

  @Prop({ type: Number, default: 0 })
  progress!: number;
}

export type CourseEnrollmentDocument = HydratedDocument<CourseEnrollment>;
export const CourseEnrollmentSchema =
  SchemaFactory.createForClass(CourseEnrollment);

CourseEnrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });
CourseEnrollmentSchema.index({ studentId: 1, status: 1 });
