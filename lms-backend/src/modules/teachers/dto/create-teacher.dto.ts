import {
  IsObject,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  employeeNo!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  qualification?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classes?: string[]; // Expecting Class ObjectIds

  @IsOptional()
  @IsObject()
  classSubjects?: Record<string, string[]>; // Expecting ClassId -> SubjectUUIDs[]
}
