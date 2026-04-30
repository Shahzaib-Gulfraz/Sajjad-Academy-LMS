import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsString()
  teacherId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  grade!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  overviewTitle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningOutcomes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  thumbnailPublicId?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(100)
  schedule!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;

  @IsOptional()
  @IsNumber()
  credits?: number;

  @IsOptional()
  @IsArray()
  chapters?: object[];

  @IsOptional()
  @IsArray()
  materials?: object[];

  @IsOptional()
  @IsArray()
  weeklySchedule?: object[];

  @IsOptional()
  @IsArray()
  pastPapers?: object[];
}
