import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class SubmissionFile {
  @Prop({ required: true, trim: true })
  publicId!: string;

  @Prop({ required: true, trim: true })
  secureUrl!: string;

  @Prop({ required: true, trim: true })
  resourceType!: string;

  @Prop({ trim: true })
  format?: string;
}

const SubmissionFileSchema = SchemaFactory.createForClass(SubmissionFile);

@Schema({ timestamps: true, collection: 'assignment_submissions' })
export class AssignmentSubmission {
  @Prop({ required: true, trim: true })
  assignmentId!: string;

  @Prop({ required: true, trim: true })
  studentId!: string;

  @Prop({ required: true, trim: true })
  submittedAt!: string;

  @Prop({ required: true, trim: true, default: 'Submitted' })
  status!: string;

  @Prop({ type: [SubmissionFileSchema], default: [] })
  files!: SubmissionFile[];

  @Prop({ min: 0 })
  marks?: number;

  @Prop({ trim: true })
  feedback?: string;
}

export type AssignmentSubmissionDocument =
  HydratedDocument<AssignmentSubmission>;
export const AssignmentSubmissionSchema =
  SchemaFactory.createForClass(AssignmentSubmission);

AssignmentSubmissionSchema.index(
  { assignmentId: 1, studentId: 1 },
  { unique: true },
);
AssignmentSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
