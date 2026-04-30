import {
  IsString,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string;

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

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  schedule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;

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

  @IsOptional()
  @IsString()
  status?: string;
}
