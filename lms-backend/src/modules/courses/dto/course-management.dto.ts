import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChapterDto {
  @IsInt()
  @Min(1)
  chapterNumber!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  chapterName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateChapterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  chapterNumber?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  chapterName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateTopicDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  topicName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  topicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateMaterialDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsEnum(['pdf', 'doc', 'ppt', 'video', 'link', 'image', 'note', 'other'])
  type!: 'pdf' | 'doc' | 'ppt' | 'video' | 'link' | 'image' | 'note' | 'other';

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
  publicId?: string;

  @IsOptional()
  @IsString()
  chapterId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;
}

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['pdf', 'doc', 'ppt', 'video', 'link', 'image', 'note', 'other'])
  type?: 'pdf' | 'doc' | 'ppt' | 'video' | 'link' | 'image' | 'note' | 'other';

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
  publicId?: string;
}

export class CreateEnrollmentDto {
  @IsString()
  studentId!: string;
}

export class ToggleTopicCompletionDto {
  @IsString()
  topicId!: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class UpsertOverviewDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1500)
  description?: string;

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
  weeklySchedule?: Array<{
    id?: string;
    day: string;
    startTime: string;
    endTime: string;
    topic?: string;
    location?: string;
  }>;

  @IsOptional()
  @IsArray()
  recentMaterials?: Array<any>;
}
