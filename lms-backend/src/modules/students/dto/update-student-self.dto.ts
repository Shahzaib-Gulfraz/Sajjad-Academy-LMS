import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsEmail,
} from 'class-validator';

export class UpdateStudentSelfDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  dob?: string;

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
  avatarUrl?: string;
}
