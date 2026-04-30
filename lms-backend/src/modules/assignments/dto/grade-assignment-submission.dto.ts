import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GradeAssignmentSubmissionDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  marks!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
