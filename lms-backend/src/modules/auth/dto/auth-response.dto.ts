import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/auth/roles.enum';

class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true })
  lastLoginAt?: Date;
}

class AuthPayloadDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty()
  expiresIn!: number;
}

export class AuthSuccessResponseDto {
  @ApiProperty({ type: AuthPayloadDto })
  data!: AuthPayloadDto;
}

class LogoutPayloadDto {
  @ApiProperty()
  success!: boolean;
}

export class LogoutResponseDto {
  @ApiProperty({ type: LogoutPayloadDto })
  data!: LogoutPayloadDto;
}
