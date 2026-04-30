import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  className?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  subject?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}
