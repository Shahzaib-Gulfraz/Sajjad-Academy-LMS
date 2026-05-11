import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CourseTopicDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  topicName!: string;
}

export class CourseChapterDto {
  @IsNumber()
  chapterNumber!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  chapterName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseTopicDto)
  topics?: CourseTopicDto[];
}

export class CreateCourseDto {
  @IsMongoId()
  classId!: string;

  @IsString()
  @MinLength(1)
  subjectId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseChapterDto)
  chapters?: CourseChapterDto[];
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseChapterDto)
  chapters?: CourseChapterDto[];
}

export class AddChapterDto {
  @IsNumber()
  chapterNumber!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  chapterName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateChapterDto {
  @IsOptional()
  @IsNumber()
  chapterNumber?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  chapterName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AddTopicDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  topicName!: string;
}
