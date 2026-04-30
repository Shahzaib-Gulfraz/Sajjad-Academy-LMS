import { ApiProperty } from '@nestjs/swagger';

class QuizOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;
}

class QuizQuestionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  prompt!: string;

  @ApiProperty({ type: [QuizOptionDto] })
  options!: QuizOptionDto[];

  @ApiProperty()
  correctOptionId!: string;
}

export class QuizItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  classGrade!: string;

  @ApiProperty({ required: false })
  chapterName?: string;

  @ApiProperty({ required: false })
  topicName?: string;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty()
  teacherId!: string;

  @ApiProperty()
  teacherName!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty({ type: [QuizQuestionDto] })
  questions!: QuizQuestionDto[];
}

class QuizAnswerDto {
  @ApiProperty()
  questionId!: string;

  @ApiProperty()
  selectedOptionId!: string;
}

export class QuizSubmissionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  quizId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  submittedAt!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  checked!: boolean;

  @ApiProperty({ required: false })
  teacherFeedback?: string;

  @ApiProperty({ type: [QuizAnswerDto] })
  answers!: QuizAnswerDto[];
}

export class QuizSingleResponseDto {
  @ApiProperty({ type: QuizItemDto })
  data!: QuizItemDto;
}

export class QuizzesListResponseDto {
  @ApiProperty({ type: [QuizItemDto] })
  data!: QuizItemDto[];
}

export class QuizSubmissionResponseDto {
  @ApiProperty({ type: QuizSubmissionItemDto })
  data!: QuizSubmissionItemDto;
}

export class QuizSubmissionsListResponseDto {
  @ApiProperty({ type: [QuizSubmissionItemDto] })
  data!: QuizSubmissionItemDto[];
}
