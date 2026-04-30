import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ReviewQuizSubmissionDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  score!: number;

  @IsBoolean()
  checked!: boolean;

  @IsOptional()
  @IsString()
  teacherFeedback?: string;
}
