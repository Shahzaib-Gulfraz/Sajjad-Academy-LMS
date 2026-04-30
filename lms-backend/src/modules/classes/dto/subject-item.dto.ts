import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubjectItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;
}
