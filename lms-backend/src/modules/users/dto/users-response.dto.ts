import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/auth/roles.enum';

class UserProfileDto {
  @ApiProperty()
  id!: string;
  @ApiProperty({ required: false, nullable: true })
  systemId?: string;

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

export class UserProfileResponseDto {
  @ApiProperty({ type: UserProfileDto })
  data!: UserProfileDto;
}
