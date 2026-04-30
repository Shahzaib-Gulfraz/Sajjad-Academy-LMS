import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class QuizOption {
  @Prop({ required: true, trim: true })
  id!: string;

  @Prop({ required: true, trim: true })
  text!: string;
}

const QuizOptionSchema = SchemaFactory.createForClass(QuizOption);

@Schema({ _id: false })
export class QuizQuestion {
  @Prop({ required: true, trim: true })
  id!: string;

  @Prop({ required: true, trim: true })
  text!: string;

  @Prop({ type: [QuizOptionSchema], default: [] })
  options!: QuizOption[];

  @Prop({ required: true, trim: true })
  correctOptionId!: string;
}

const QuizQuestionSchema = SchemaFactory.createForClass(QuizQuestion);

@Schema({ timestamps: true, collection: 'quizzes' })
export class Quiz {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, trim: true })
  classGrade!: string;

  @Prop({ required: true, trim: true })
  chapterName!: string;

  @Prop({ required: true, trim: true })
  topicName!: string;

  @Prop({ required: true, trim: true })
  dueDate!: string;

  @Prop({ required: true, trim: true })
  teacherId!: string;

  @Prop({ required: true, trim: true })
  teacherName!: string;

  @Prop({ required: true, trim: true })
  subject!: string;

  @Prop({ type: [QuizQuestionSchema], default: [] })
  questions!: QuizQuestion[];
}

export type QuizDocument = HydratedDocument<Quiz>;
export const QuizSchema = SchemaFactory.createForClass(Quiz);

QuizSchema.index({ classGrade: 1, dueDate: -1 });
QuizSchema.index({ teacherId: 1, createdAt: -1 });
