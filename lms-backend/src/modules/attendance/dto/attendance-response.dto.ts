import { ApiProperty } from '@nestjs/swagger';

class AttendanceEntryDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty({ enum: ['Present', 'Absent', 'Late', 'Leave'] })
  status!: 'Present' | 'Absent' | 'Late' | 'Leave';
}

export class AttendanceSessionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  className!: string;

  @ApiProperty()
  teacherId!: string;

  @ApiProperty()
  teacherName!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  time!: string;

  @ApiProperty()
  classType!: string;

  @ApiProperty({ required: false })
  roomOrMode?: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  entries!: AttendanceEntryDto[];
}

class StudentAttendanceItemDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  className!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  time!: string;

  @ApiProperty({
    enum: ['Present', 'Absent', 'Late', 'Leave'],
    required: false,
  })
  status?: 'Present' | 'Absent' | 'Late' | 'Leave';

  @ApiProperty()
  teacherName!: string;
}

export class AttendanceSessionResponseDto {
  @ApiProperty({ type: AttendanceSessionItemDto })
  data!: AttendanceSessionItemDto;
}

export class AttendanceSessionsListResponseDto {
  @ApiProperty({ type: [AttendanceSessionItemDto] })
  data!: AttendanceSessionItemDto[];
}

export class StudentAttendanceListResponseDto {
  @ApiProperty({ type: [StudentAttendanceItemDto] })
  data!: StudentAttendanceItemDto[];
}
