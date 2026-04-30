import { ApiProperty } from '@nestjs/swagger';

class TimetableSlotItemDto {
  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  endTime!: string;

  @ApiProperty()
  className!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  teacherId!: string;

  @ApiProperty()
  teacherName!: string;
}

class DeleteTimetableSlotDto {
  @ApiProperty()
  id!: string;
}

export class TimetableSlotResponseDto {
  @ApiProperty({ type: TimetableSlotItemDto })
  data!: TimetableSlotItemDto;
}

export class TimetableSlotListResponseDto {
  @ApiProperty({ type: [TimetableSlotItemDto] })
  data!: TimetableSlotItemDto[];
}

export class DeleteTimetableSlotResponseDto {
  @ApiProperty({ type: DeleteTimetableSlotDto })
  data!: DeleteTimetableSlotDto;
}
