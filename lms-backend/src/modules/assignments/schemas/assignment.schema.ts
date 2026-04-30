import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'assignments' })
export class Assignment {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  subject!: string;

  @Prop({ required: true, trim: true })
  classGrade!: string;

  @Prop({ required: true, trim: true })
  dueDate!: string;

  @Prop({ required: true, trim: true })
  teacherId!: string;

  @Prop({ required: true, trim: true })
  teacherName!: string;

  @Prop({ required: true, min: 1 })
  totalMarks!: number;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  instructions?: string;

  @Prop({ type: [String], default: [] })
  assignedStudentIds!: string[];
}

export type AssignmentDocument = HydratedDocument<Assignment>;
export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

AssignmentSchema.index({ classGrade: 1, dueDate: 1 });
AssignmentSchema.index({ teacherId: 1, createdAt: -1 });
