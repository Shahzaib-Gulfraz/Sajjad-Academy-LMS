import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateIdentityDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  systemId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;
}
