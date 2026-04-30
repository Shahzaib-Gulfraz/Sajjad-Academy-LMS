import { ApiProperty } from '@nestjs/swagger';

export class AssignmentItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  classGrade!: string;

  @ApiProperty()
  dueDate!: string;

  @ApiProperty()
  teacherId!: string;

  @ApiProperty()
  teacherName!: string;

  @ApiProperty()
  totalMarks!: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  instructions?: string;

  @ApiProperty({ type: [String] })
  assignedStudentIds!: string[];
}

class AssignmentFileDto {
  @ApiProperty()
  publicId!: string;

  @ApiProperty()
  secureUrl!: string;

  @ApiProperty({ required: false })
  format?: string;

  @ApiProperty({ required: false })
  bytes?: number;
}

class AssignmentSubmissionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  assignmentId!: string;

  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  submittedAt!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: [AssignmentFileDto] })
  files!: AssignmentFileDto[];

  @ApiProperty({ required: false })
  marks?: number;

  @ApiProperty({ required: false })
  feedback?: string;
}

export class AssignmentSingleResponseDto {
  @ApiProperty({ type: AssignmentItemDto })
  data!: AssignmentItemDto;
}

export class AssignmentsListResponseDto {
  @ApiProperty({ type: [AssignmentItemDto] })
  data!: AssignmentItemDto[];
}

export class AssignmentSubmissionResponseDto {
  @ApiProperty({ type: AssignmentSubmissionItemDto })
  data!: AssignmentSubmissionItemDto;
}

export class AssignmentSubmissionsListResponseDto {
  @ApiProperty({ type: [AssignmentSubmissionItemDto] })
  data!: AssignmentSubmissionItemDto[];
}
