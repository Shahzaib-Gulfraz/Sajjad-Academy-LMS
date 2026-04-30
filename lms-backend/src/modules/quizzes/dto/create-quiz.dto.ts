import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuizOptionDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(500)
  text!: string;
}

class QuizQuestionDto {
  @IsString()
  id!: string;

  @IsString()
  @MaxLength(1000)
  text!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options!: QuizOptionDto[];

  @IsString()
  correctOptionId!: string;
}

export class CreateQuizDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  classGrade!: string;

  @IsString()
  chapterName!: string;

  @IsString()
  topicName!: string;

  @IsString()
  dueDate!: string;

  @IsString()
  subject!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}
