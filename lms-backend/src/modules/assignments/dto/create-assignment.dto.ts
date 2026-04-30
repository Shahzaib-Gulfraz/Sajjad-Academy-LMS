import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsString()
  @MaxLength(100)
  subject!: string;

  @IsString()
  @MaxLength(30)
  classGrade!: string;

  @IsString()
  dueDate!: string;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedStudentIds?: string[];
}
