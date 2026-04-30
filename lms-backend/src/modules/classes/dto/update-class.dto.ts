import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

import { SubjectItemDto } from './subject-item.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  academicYear?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectItemDto)
  subjects?: SubjectItemDto[];
}
