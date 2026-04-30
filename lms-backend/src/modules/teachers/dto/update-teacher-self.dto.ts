import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTeacherSelfDto {
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  dob?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  emergencyPhone?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;
}
