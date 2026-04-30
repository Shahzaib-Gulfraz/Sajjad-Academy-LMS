import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SubmissionFileDto {
  @IsString()
  publicId!: string;

  @IsString()
  secureUrl!: string;

  @IsString()
  resourceType!: string;

  @IsOptional()
  @IsString()
  format?: string;
}

export class CreateAssignmentSubmissionDto {
  @IsString()
  studentId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmissionFileDto)
  files!: SubmissionFileDto[];
}
