import { ApiProperty } from '@nestjs/swagger';

export class TeacherItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeNo!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  gender!: string;

  @ApiProperty()
  qualification!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  dob!: string;

  @ApiProperty()
  emergencyContact!: string;

  @ApiProperty()
  emergencyPhone!: string;

  @ApiProperty({ type: [String] })
  classes!: string[];

  @ApiProperty({ type: Object })
  classSubjects!: Record<string, string[]>;

  @ApiProperty()
  status!: string;
}

export class TeachersListResponseDto {
  @ApiProperty({ type: [TeacherItemDto] })
  data!: TeacherItemDto[];
}

export class TeacherSingleResponseDto {
  @ApiProperty({ type: TeacherItemDto })
  data!: TeacherItemDto;
}

class TeacherDeleteDto {
  @ApiProperty()
  id!: string;
}

class TeacherResetPasswordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  defaultPassword!: string;
}

export class TeacherDeleteResponseDto {
  @ApiProperty({ type: TeacherDeleteDto })
  data!: TeacherDeleteDto;
}

export class TeacherResetPasswordResponseDto {
  @ApiProperty({ type: TeacherResetPasswordDto })
  data!: TeacherResetPasswordDto;
}
