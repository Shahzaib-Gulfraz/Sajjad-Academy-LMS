import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateTimetableSlotDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsString()
  @MaxLength(80)
  className!: string; // Class ObjectId

  @IsString()
  @MaxLength(80)
  subject!: string; // Subject UUID

  @IsString()
  teacherId!: string; // Teacher ObjectId
}
