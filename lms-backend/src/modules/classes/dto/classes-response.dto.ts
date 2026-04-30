import { ApiProperty } from '@nestjs/swagger';
import { SubjectItemDto } from './subject-item.dto';

export class ClassItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  academicYear!: string;

  @ApiProperty({ type: [SubjectItemDto] })
  subjects!: SubjectItemDto[];
}

export class ClassesListResponseDto {
  @ApiProperty({ type: [ClassItemDto] })
  data!: ClassItemDto[];
}

export class ClassSingleResponseDto {
  @ApiProperty({ type: ClassItemDto })
  data!: ClassItemDto;
}

class ClassRemovePayloadDto {
  @ApiProperty()
  success!: boolean;
}

export class ClassRemoveResponseDto {
  @ApiProperty({ type: ClassRemovePayloadDto })
  data!: ClassRemovePayloadDto;
}
