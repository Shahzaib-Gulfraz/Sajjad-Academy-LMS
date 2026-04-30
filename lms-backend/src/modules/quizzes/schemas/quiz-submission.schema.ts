import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class QuizAnswer {
  @Prop({ required: true, trim: true })
  questionId!: string;

  @Prop({ required: true, trim: true })
  selectedOptionId!: string;
}

const QuizAnswerSchema = SchemaFactory.createForClass(QuizAnswer);

@Schema({ timestamps: true, collection: 'quiz_submissions' })
export class QuizSubmission {
  @Prop({ required: true, trim: true })
  quizId!: string;

  @Prop({ required: true, trim: true })
  studentId!: string;

  @Prop({ required: true, trim: true })
  submittedAt!: string;

  @Prop({ type: [QuizAnswerSchema], default: [] })
  answers!: QuizAnswer[];

  @Prop({ required: true, default: 0 })
  score!: number;

  @Prop({ required: true, default: 0 })
  total!: number;

  @Prop({ required: true, default: false })
  checked!: boolean;

  @Prop({ trim: true })
  teacherFeedback?: string;
}

export type QuizSubmissionDocument = HydratedDocument<QuizSubmission>;
export const QuizSubmissionSchema =
  SchemaFactory.createForClass(QuizSubmission);

QuizSubmissionSchema.index({ quizId: 1, studentId: 1 }, { unique: true });
QuizSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
