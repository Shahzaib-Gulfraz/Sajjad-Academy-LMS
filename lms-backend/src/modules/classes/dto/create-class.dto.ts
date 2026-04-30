import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { SubjectItemDto } from './subject-item.dto';

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(4)
  academicYear!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectItemDto)
  subjects?: SubjectItemDto[];
}
