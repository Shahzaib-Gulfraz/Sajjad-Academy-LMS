import { ApiProperty } from '@nestjs/swagger';

export class StudentItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  admissionNo!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  grade!: string;

  @ApiProperty()
  guardian!: string;

  @ApiProperty()
  guardianPhone!: string;

  @ApiProperty()
  gender!: string;

  @ApiProperty()
  dob!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ type: [String] })
  subjects!: string[];

  @ApiProperty({ type: [String] })
  enrolledCourses!: string[];

  @ApiProperty({ type: [String] })
  enrolledCourseIds!: string[];

  @ApiProperty()
  status!: string;
}

export class StudentsListResponseDto {
  @ApiProperty({ type: [StudentItemDto] })
  data!: StudentItemDto[];
}

export class StudentSingleResponseDto {
  @ApiProperty({ type: StudentItemDto })
  data!: StudentItemDto;
}

class StudentDeleteDto {
  @ApiProperty()
  id!: string;
}

class StudentResetPasswordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  defaultPassword!: string;
}

export class StudentDeleteResponseDto {
  @ApiProperty({ type: StudentDeleteDto })
  data!: StudentDeleteDto;
}

export class StudentResetPasswordResponseDto {
  @ApiProperty({ type: StudentResetPasswordDto })
  data!: StudentResetPasswordDto;
}
