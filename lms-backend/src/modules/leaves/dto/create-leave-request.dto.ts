import { IsString, MaxLength } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  @MaxLength(80)
  type!: string;

  @IsString()
  fromDate!: string;

  @IsString()
  toDate!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}
