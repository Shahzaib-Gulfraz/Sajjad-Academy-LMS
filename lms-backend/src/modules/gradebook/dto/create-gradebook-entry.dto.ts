import {
  ArrayMinSize,
  IsArray,
  IsInt,
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

export class CreateGradebookEntryDto {
  @IsString()
  subject!: string;

  @IsString()
  classGrade!: string;

  @IsString()
  term!: string;

  @IsString()
  assessment!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  totalMarks!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GradeMarkDto)
  marks!: GradeMarkDto[];
}
