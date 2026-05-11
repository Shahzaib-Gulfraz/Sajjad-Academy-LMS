import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendedBookDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  author!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  fileUrl?: string;
}

export class PatchRecommendedBooksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendedBookDto)
  recommendedBooks!: RecommendedBookDto[];

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;
}

export class WeeklyScheduleItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  day!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  startTime!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export class CreateMaterialRecordDto {
  @IsMongoId()
  courseId!: string;

  @IsMongoId()
  classId!: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsIn(['overview', 'material'])
  scope?: 'overview' | 'material';

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  learningOutcome!: string;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleItemDto)
  weeklySchedule?: WeeklyScheduleItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendedBookDto)
  recommendedBooks?: RecommendedBookDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterDto)
  chapters?: ChapterDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentMaterialDto)
  recentMaterials?: RecentMaterialDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  publicId?: string;

  @IsOptional()
  @IsIn(['image', 'video', 'raw', 'auto'])
  resourceType?: 'image' | 'video' | 'raw' | 'auto';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  chapterId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;
}

export class TopicDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  topicName!: string;
}

export class ChapterDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsInt()
  chapterNumber?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  chapterName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicDto)
  topics?: TopicDto[];
}

export class RecentMaterialDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @IsIn(['audio', 'video', 'pdf', 'doc', 'ppt', 'image', 'link', 'note', 'other'])
  type!: 'audio' | 'video' | 'pdf' | 'doc' | 'ppt' | 'image' | 'link' | 'note' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  publicId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsIn(['image', 'video', 'raw', 'auto'])
  resourceType?: 'image' | 'video' | 'raw' | 'auto';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;
}

export class UpsertCourseOverviewDto {
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  // Backward-compatible: allow either a single learningOutcome string
  // or an array of learningOutcomes.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningOutcomes?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  learningOutcome?: string;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleItemDto)
  weeklySchedule?: WeeklyScheduleItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentMaterialDto)
  recentMaterials?: RecentMaterialDto[];

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecommendedBookDto)
  recommendedBooks?: RecommendedBookDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterDto)
  chapters?: ChapterDto[];
}

// DTO for PATCH (partial update) - allow omitting fields
import { PartialType } from '@nestjs/mapped-types';

export class UpdateCourseOverviewDto extends PartialType(UpsertCourseOverviewDto) {}

// DTO for updating an existing material record (partial)
export class UpdateMaterialDto extends PartialType(CreateMaterialRecordDto) {}
