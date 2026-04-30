import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  grade?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  guardian?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+0-9\-()\s]{7,20}$/)
  guardianPhone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enrolledCourses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enrolledCourseIds?: string[];

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  status?: string;
}
