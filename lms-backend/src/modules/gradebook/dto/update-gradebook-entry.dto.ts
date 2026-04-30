import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class GradeMarkDto {
  @IsString()
  studentId!: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  marks!: number;
}

export class UpdateGradebookEntryDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  classGrade?: string;

  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  totalMarks?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GradeMarkDto)
  marks?: GradeMarkDto[];
}
