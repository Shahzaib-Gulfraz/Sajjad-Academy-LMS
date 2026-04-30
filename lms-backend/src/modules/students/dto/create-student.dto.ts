import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  admissionNo!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  grade!: string; // Expects SchoolClass ObjectId

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  guardian!: string;

  @IsString()
  @Matches(/^[+0-9\-()\s]{7,20}$/)
  guardianPhone!: string;

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
}
