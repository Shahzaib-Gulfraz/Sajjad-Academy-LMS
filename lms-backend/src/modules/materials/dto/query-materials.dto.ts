import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';

export class QueryMaterialsDto {
  @IsOptional()
  @IsMongoId()
  courseId?: string;

  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsEnum(['overview', 'material'])
  scope?: 'overview' | 'material';
}
