import { IsString, MaxLength, MinLength } from 'class-validator';

export class PasswordResetRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  identifier!: string;
}
