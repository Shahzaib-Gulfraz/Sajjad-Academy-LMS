import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class GradeMark {
  @Prop({ required: true, trim: true })
  studentId!: string;

  @Prop({ required: true, min: 0 })
  marks!: number;
}

const GradeMarkSchema = SchemaFactory.createForClass(GradeMark);

@Schema({ timestamps: true, collection: 'gradebook_entries' })
export class GradebookEntry {
  @Prop({ required: true, trim: true })
  teacherId!: string;

  @Prop({ required: true, trim: true })
  subject!: string;

  @Prop({ required: true, trim: true })
  classGrade!: string;

  @Prop({ required: true, trim: true })
  term!: string;

  @Prop({ required: true, trim: true })
  assessment!: string;

  @Prop({ required: true, min: 1 })
  totalMarks!: number;

  @Prop({ type: [GradeMarkSchema], default: [] })
  marks!: GradeMark[];

  // Populated by Mongoose timestamps.
  createdAt?: Date;
  updatedAt?: Date;
}

export type GradebookEntryDocument = HydratedDocument<GradebookEntry>;
export const GradebookEntrySchema =
  SchemaFactory.createForClass(GradebookEntry);

GradebookEntrySchema.index({ classGrade: 1, term: 1 });
GradebookEntrySchema.index({ teacherId: 1, createdAt: -1 });
GradebookEntrySchema.index({ 'marks.studentId': 1 });
