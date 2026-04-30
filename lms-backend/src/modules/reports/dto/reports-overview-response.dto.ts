import { ApiProperty } from '@nestjs/swagger';

class ReportsSummaryDto {
  @ApiProperty()
  totalStudents!: number;

  @ApiProperty()
  totalTeachers!: number;

  @ApiProperty()
  totalCollected!: number;

  @ApiProperty()
  totalPending!: number;

  @ApiProperty()
  totalInvoiced!: number;

  @ApiProperty()
  collectionRate!: number;

  @ApiProperty()
  avgAttendance!: number;
}

class MonthlyCollectionPointDto {
  @ApiProperty({ example: '2026-03' })
  month!: string;

  @ApiProperty()
  amount!: number;
}

class PendingDueByClassDto {
  @ApiProperty()
  className!: string;

  @ApiProperty()
  students!: number;

  @ApiProperty()
  pending!: number;
}

class TeacherWorkloadDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  loadUnits!: number;
}

class AttendanceTrendDto {
  @ApiProperty()
  className!: string;

  @ApiProperty()
  percentage!: number;

  @ApiProperty()
  present!: number;

  @ApiProperty()
  total!: number;
}

class GradeDistributionItemDto {
  @ApiProperty()
  grade!: string;

  @ApiProperty()
  count!: number;
}

class ReportsMetaDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;
}

class ReportsOverviewDataDto {
  @ApiProperty({ type: ReportsSummaryDto })
  summary!: ReportsSummaryDto;

  @ApiProperty({ type: [MonthlyCollectionPointDto] })
  monthlyCollection!: MonthlyCollectionPointDto[];

  @ApiProperty({ type: [PendingDueByClassDto] })
  pendingDuesByClass!: PendingDueByClassDto[];

  @ApiProperty({ type: [TeacherWorkloadDto] })
  teacherWorkload!: TeacherWorkloadDto[];

  @ApiProperty({ type: [AttendanceTrendDto] })
  attendanceTrends!: AttendanceTrendDto[];

  @ApiProperty({ type: [GradeDistributionItemDto] })
  gradeDistribution!: GradeDistributionItemDto[];

  @ApiProperty({ type: ReportsMetaDto })
  meta!: ReportsMetaDto;
}

export class ReportsOverviewResponseDto {
  @ApiProperty({ type: ReportsOverviewDataDto })
  data!: ReportsOverviewDataDto;
}
