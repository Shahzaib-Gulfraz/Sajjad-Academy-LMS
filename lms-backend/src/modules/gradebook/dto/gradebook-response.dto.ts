import { ApiProperty } from '@nestjs/swagger';

class GradeMarkDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  marks!: number;
}

export class GradebookEntryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  teacherId!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  classGrade!: string;

  @ApiProperty()
  term!: string;

  @ApiProperty()
  assessment!: string;

  @ApiProperty()
  totalMarks!: number;

  @ApiProperty({ type: [GradeMarkDto] })
  marks!: GradeMarkDto[];
}

class StudentGradebookItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  classGrade!: string;

  @ApiProperty()
  term!: string;

  @ApiProperty()
  assessment!: string;

  @ApiProperty()
  totalMarks!: number;

  @ApiProperty({ nullable: true })
  marks!: number | null;
}

export class GradebookEntryResponseDto {
  @ApiProperty({ type: GradebookEntryItemDto })
  data!: GradebookEntryItemDto;
}

export class GradebookEntriesListResponseDto {
  @ApiProperty({ type: [GradebookEntryItemDto] })
  data!: GradebookEntryItemDto[];
}

export class StudentGradebookResponseDto {
  @ApiProperty({ type: [StudentGradebookItemDto] })
  data!: StudentGradebookItemDto[];
}

class GradebookDeleteResultDto {
  @ApiProperty()
  deleted!: boolean;

  @ApiProperty()
  id!: string;
}

export class GradebookDeleteResponseDto {
  @ApiProperty({ type: GradebookDeleteResultDto })
  data!: GradebookDeleteResultDto;
}
