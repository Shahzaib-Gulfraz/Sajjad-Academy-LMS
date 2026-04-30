import {
  ArrayMinSize,
  IsArray,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuizAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  selectedOptionId!: string;
}

export class CreateQuizSubmissionDto {
  @IsString()
  studentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
