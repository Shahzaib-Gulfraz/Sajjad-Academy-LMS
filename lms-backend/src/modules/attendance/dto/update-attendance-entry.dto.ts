import { IsEnum, IsString } from 'class-validator';

export class UpdateAttendanceEntryDto {
  @IsString()
  studentId!: string;

  @IsEnum(['Present', 'Absent', 'Late', 'Leave'])
  status!: 'Present' | 'Absent' | 'Late' | 'Leave';
}
