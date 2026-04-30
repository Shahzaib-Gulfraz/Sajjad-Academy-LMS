import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttendanceEntryDto {
  @IsString()
  studentId!: string;

  @IsEnum(['Present', 'Absent', 'Late', 'Leave'])
  status!: 'Present' | 'Absent' | 'Late' | 'Leave';
}

export class CreateAttendanceSessionDto {
  @IsString()
  @MaxLength(30)
  className!: string;

  @IsString()
  teacherName!: string;

  @IsString()
  date!: string;

  @IsString()
  time!: string;

  @IsOptional()
  @IsString()
  classType?: string;

  @IsOptional()
  @IsString()
  roomOrMode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}
